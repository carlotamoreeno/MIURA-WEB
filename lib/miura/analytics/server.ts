import type { ZodError } from "zod";

import { parseMiuraAnalyticsEvent, type MiuraAnalyticsEvent } from "./events";

const ANALYTICS_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

type MiuraServerErrorSurface = "analytics" | "chat";
type MiuraServerErrorCategory =
  | "config"
  | "request"
  | "validation"
  | "retrieval"
  | "provider";

type MiuraAnalyticsLogger = Pick<Console, "error" | "info">;

type MiuraAnalyticsDependencies = {
  env?: Record<string, string | undefined>;
  logger?: MiuraAnalyticsLogger;
};

function readMiuraAnalyticsEnabled({
  env = process.env,
}: {
  env?: Record<string, string | undefined>;
} = {}) {
  return readBooleanEnv(env.ENABLE_ANALYTICS, false);
}

async function handleMiuraAnalyticsRequest(
  request: Request,
  dependencies: MiuraAnalyticsDependencies = {},
): Promise<Response> {
  const logger = dependencies.logger ?? console;

  if (!readMiuraAnalyticsEnabled({ env: dependencies.env })) {
    return noContentResponse();
  }

  const rawBody = await readRequestJson(request);

  if (!rawBody.success) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "request",
      error: new Error("invalid_json"),
    });

    return jsonError(400, "El evento analítico debe ser JSON válido.");
  }

  const parsedEvent = parseMiuraAnalyticsEvent(rawBody.data);

  if (!parsedEvent.success) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "validation",
      error: parsedEvent.error,
    });

    return jsonError(400, formatAnalyticsValidationError(parsedEvent.error));
  }

  logMiuraAnalyticsEvent(logger, parsedEvent.data);

  return noContentResponse();
}

function logMiuraAnalyticsEvent(
  logger: Pick<Console, "info">,
  event: MiuraAnalyticsEvent,
) {
  logger.info("[MIURA analytics] event", {
    eventName: event.eventName,
    sessionId: event.sessionId,
    timestamp: event.timestamp,
    properties: event.properties,
  });
}

function logMiuraServerError(
  logger: Pick<Console, "error">,
  {
    surface,
    category,
    error,
  }: {
    surface: MiuraServerErrorSurface;
    category: MiuraServerErrorCategory;
    error: unknown;
  },
) {
  logger.error("[MIURA server] controlled failure", {
    surface,
    category,
    errorType: error instanceof Error ? error.name : typeof error,
  });
}

async function readRequestJson(
  request: Request,
): Promise<
  { success: true; data: unknown } | { success: false; message: string }
> {
  try {
    return {
      success: true,
      data: await request.json(),
    };
  } catch {
    return {
      success: false,
      message: "El cuerpo de la petición debe ser JSON válido.",
    };
  }
}

function formatAnalyticsValidationError(error: ZodError) {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "El evento analítico no es válido.";
  }

  const path =
    firstIssue.path.length > 0 ? firstIssue.path.map(String).join(".") : "raíz";

  return `El evento analítico no es válido: ${path}: ${firstIssue.message}`;
}

function noContentResponse() {
  return new Response(null, {
    status: 204,
    headers: ANALYTICS_RESPONSE_HEADERS,
  });
}

function jsonError(status: number, message: string) {
  return Response.json(
    {
      error: {
        message,
      },
    },
    {
      status,
      headers: ANALYTICS_RESPONSE_HEADERS,
    },
  );
}

function readBooleanEnv(rawValue: string | undefined, fallback: boolean) {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(rawValue.trim().toLowerCase());
}

export {
  handleMiuraAnalyticsRequest,
  logMiuraAnalyticsEvent,
  logMiuraServerError,
  readMiuraAnalyticsEnabled,
  type MiuraAnalyticsDependencies,
  type MiuraAnalyticsLogger,
};
