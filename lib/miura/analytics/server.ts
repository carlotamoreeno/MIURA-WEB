import type { ZodError } from "zod";

import {
  MIURA_API_SECURITY_HEADERS,
  checkMiuraApiRequestOrigin,
  createMiuraApiOptionsResponse,
} from "@/lib/miura/api/security";
import { parseMiuraAnalyticsEvent, type MiuraAnalyticsEvent } from "./events";

const ANALYTICS_RESPONSE_HEADERS = MIURA_API_SECURITY_HEADERS;

const ANALYTICS_SECURITY_CONFIG_ERROR_RESPONSE =
  "La analítica interna no está configurada correctamente.";

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
  let originCheck: ReturnType<typeof checkMiuraApiRequestOrigin>;

  try {
    originCheck = checkMiuraApiRequestOrigin(request, {
      env: dependencies.env,
    });
  } catch (error) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "config",
      error,
    });

    return jsonError(503, ANALYTICS_SECURITY_CONFIG_ERROR_RESPONSE);
  }

  if (!originCheck.allowed) {
    return originCheck.response;
  }

  const responseHeaders = originCheck.headers;

  if (!readMiuraAnalyticsEnabled({ env: dependencies.env })) {
    return noContentResponse(responseHeaders);
  }

  const rawBody = await readRequestJson(request);

  if (!rawBody.success) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "request",
      error: new Error("invalid_json"),
    });

    return jsonError(
      400,
      "El evento analítico debe ser JSON válido.",
      responseHeaders,
    );
  }

  const parsedEvent = parseMiuraAnalyticsEvent(rawBody.data);

  if (!parsedEvent.success) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "validation",
      error: parsedEvent.error,
    });

    return jsonError(
      400,
      formatAnalyticsValidationError(parsedEvent.error),
      responseHeaders,
    );
  }

  logMiuraAnalyticsEvent(logger, parsedEvent.data);

  return noContentResponse(responseHeaders);
}

function handleMiuraAnalyticsOptionsRequest(
  request: Request,
  dependencies: MiuraAnalyticsDependencies = {},
) {
  const logger = dependencies.logger ?? console;

  try {
    return createMiuraApiOptionsResponse(request, {
      env: dependencies.env,
    });
  } catch (error) {
    logMiuraServerError(logger, {
      surface: "analytics",
      category: "config",
      error,
    });

    return jsonError(503, ANALYTICS_SECURITY_CONFIG_ERROR_RESPONSE);
  }
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

function noContentResponse(
  headers: Record<string, string> = ANALYTICS_RESPONSE_HEADERS,
) {
  return new Response(null, {
    status: 204,
    headers,
  });
}

function jsonError(
  status: number,
  message: string,
  headers: Record<string, string> = ANALYTICS_RESPONSE_HEADERS,
) {
  return Response.json(
    {
      error: {
        message,
      },
    },
    {
      status,
      headers,
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
  handleMiuraAnalyticsOptionsRequest,
  handleMiuraAnalyticsRequest,
  logMiuraAnalyticsEvent,
  logMiuraServerError,
  readMiuraAnalyticsEnabled,
  type MiuraAnalyticsDependencies,
  type MiuraAnalyticsLogger,
};
