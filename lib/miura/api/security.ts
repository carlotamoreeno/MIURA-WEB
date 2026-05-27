const MIURA_API_SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

type MiuraApiSecurityOptions = {
  env?: Record<string, string | undefined>;
  allowedMethods?: readonly string[];
  allowedHeaders?: readonly string[];
};

type MiuraApiOriginCheck =
  | {
      allowed: true;
      headers: Record<string, string>;
      origin: string | null;
    }
  | {
      allowed: false;
      response: Response;
    };

const DEFAULT_ALLOWED_METHODS = ["POST", "OPTIONS"] as const;
const DEFAULT_ALLOWED_HEADERS = ["Content-Type"] as const;
const CORS_MAX_AGE_SECONDS = 600;

function checkMiuraApiRequestOrigin(
  request: Request,
  {
    env = process.env,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    allowedHeaders = DEFAULT_ALLOWED_HEADERS,
  }: MiuraApiSecurityOptions = {},
): MiuraApiOriginCheck {
  const originHeader = request.headers.get("origin");
  const normalizedOrigin =
    originHeader === null ? null : normalizeOrigin(originHeader);
  const headers = buildMiuraApiCorsHeaders({
    request,
    origin: normalizedOrigin,
    env,
    allowedMethods,
    allowedHeaders,
  });

  if (originHeader !== null && normalizedOrigin === null) {
    return {
      allowed: false,
      response: forbiddenOriginResponse(headers),
    };
  }

  if (
    normalizedOrigin !== null &&
    !isAllowedOrigin({
      request,
      origin: normalizedOrigin,
      env,
    })
  ) {
    return {
      allowed: false,
      response: forbiddenOriginResponse(headers),
    };
  }

  return {
    allowed: true,
    headers,
    origin: normalizedOrigin,
  };
}

function createMiuraApiOptionsResponse(
  request: Request,
  options: MiuraApiSecurityOptions = {},
) {
  const originCheck = checkMiuraApiRequestOrigin(request, options);

  if (!originCheck.allowed) {
    return originCheck.response;
  }

  return new Response(null, {
    status: 204,
    headers: originCheck.headers,
  });
}

function buildMiuraApiCorsHeaders({
  request,
  origin,
  env,
  allowedMethods,
  allowedHeaders,
}: {
  request: Request;
  origin: string | null;
  env: Record<string, string | undefined>;
  allowedMethods: readonly string[];
  allowedHeaders: readonly string[];
}): Record<string, string> {
  const headers: Record<string, string> = {
    ...MIURA_API_SECURITY_HEADERS,
  };

  if (request.headers.has("origin")) {
    headers.Vary = "Origin";
  }

  if (
    origin !== null &&
    isAllowedOrigin({
      request,
      origin,
      env,
    })
  ) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = allowedMethods.join(", ");
    headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ");
    headers["Access-Control-Max-Age"] = String(CORS_MAX_AGE_SECONDS);
  }

  return headers;
}

function isAllowedOrigin({
  request,
  origin,
  env,
}: {
  request: Request;
  origin: string;
  env: Record<string, string | undefined>;
}) {
  return (
    origin === resolveRequestOrigin(request) ||
    readMiuraAllowedOrigins(env).includes(origin)
  );
}

function readMiuraAllowedOrigins(env: Record<string, string | undefined>) {
  const rawValue = env.MIURA_ALLOWED_ORIGINS;

  if (rawValue === undefined || rawValue.trim() === "") {
    return [];
  }

  return uniqueStrings(
    rawValue
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        const normalizedOrigin = normalizeConfiguredOrigin(origin);

        if (normalizedOrigin === null) {
          throw new Error(
            "MIURA_ALLOWED_ORIGINS must contain only http(s) origins.",
          );
        }

        return normalizedOrigin;
      }),
  );
}

function normalizeConfiguredOrigin(rawOrigin: string) {
  try {
    const url = new URL(rawOrigin);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function normalizeOrigin(rawOrigin: string) {
  try {
    const url = new URL(rawOrigin.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function resolveRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = firstHeaderValue(
    request.headers.get("x-forwarded-host"),
  );
  const forwardedProto = firstHeaderValue(
    request.headers.get("x-forwarded-proto"),
  );
  const host = forwardedHost ?? firstHeaderValue(request.headers.get("host"));
  const proto =
    forwardedProto && ["http", "https"].includes(forwardedProto)
      ? forwardedProto
      : url.protocol.replace(":", "");

  if (host !== null) {
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      return url.origin;
    }
  }

  return url.origin;
}

function firstHeaderValue(value: string | null) {
  const firstValue = value?.split(",")[0]?.trim();

  return firstValue === undefined || firstValue === "" ? null : firstValue;
}

function forbiddenOriginResponse(headers: Record<string, string>) {
  return Response.json(
    {
      error: {
        message: "La solicitud API no está permitida desde este origen.",
      },
    },
    {
      status: 403,
      headers,
    },
  );
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

export {
  MIURA_API_SECURITY_HEADERS,
  checkMiuraApiRequestOrigin,
  createMiuraApiOptionsResponse,
  readMiuraAllowedOrigins,
};
