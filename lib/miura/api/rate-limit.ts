import { createHash } from "node:crypto";

const DEFAULT_CHAT_RATE_LIMIT_ENABLED = true;
const DEFAULT_CHAT_RATE_LIMIT_MAX = 10;
const DEFAULT_CHAT_RATE_LIMIT_WINDOW_MS = 60_000;
const MIN_CHAT_RATE_LIMIT_MAX = 1;
const MAX_CHAT_RATE_LIMIT_MAX = 200;
const MIN_CHAT_RATE_LIMIT_WINDOW_MS = 1_000;
const MAX_CHAT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_STORED_RATE_LIMIT_BUCKETS = 5000;

type MiuraRateLimitBucket = {
  windowStart: number;
  count: number;
};

type MiuraRateLimitStore = Map<string, MiuraRateLimitBucket>;

type MiuraChatRateLimitConfig = {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
};

type MiuraChatRateLimitOptions = {
  env?: Record<string, string | undefined>;
  now?: () => number;
  store?: MiuraRateLimitStore;
};

type MiuraChatRateLimitResult =
  | {
      allowed: true;
      headers: Record<string, string>;
      config: MiuraChatRateLimitConfig;
    }
  | {
      allowed: false;
      headers: Record<string, string>;
      retryAfterSeconds: number;
      config: MiuraChatRateLimitConfig;
    };

const globalRateLimitStore = getGlobalRateLimitStore();

function checkMiuraChatRateLimit(
  request: Request,
  {
    env = process.env,
    now = Date.now,
    store = globalRateLimitStore,
  }: MiuraChatRateLimitOptions = {},
): MiuraChatRateLimitResult {
  const config = readMiuraChatRateLimitConfig({ env });

  if (!config.enabled) {
    return {
      allowed: true,
      headers: {},
      config,
    };
  }

  const timestamp = now();
  const identifier = getMiuraRateLimitIdentifier(request);
  const currentBucket = store.get(identifier);
  const bucket =
    currentBucket === undefined ||
    timestamp >= currentBucket.windowStart + config.windowMs
      ? {
          windowStart: timestamp,
          count: 0,
        }
      : currentBucket;

  bucket.count += 1;
  store.set(identifier, bucket);
  pruneExpiredBuckets(store, timestamp, config.windowMs);

  const resetAt = bucket.windowStart + config.windowMs;
  const remaining = Math.max(0, config.maxRequests - bucket.count);
  const headers = buildRateLimitHeaders({
    limit: config.maxRequests,
    remaining,
    resetAt,
  });

  if (bucket.count > config.maxRequests) {
    return {
      allowed: false,
      headers: {
        ...headers,
        "Retry-After": String(
          Math.max(1, Math.ceil((resetAt - timestamp) / 1000)),
        ),
      },
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - timestamp) / 1000)),
      config,
    };
  }

  return {
    allowed: true,
    headers,
    config,
  };
}

function readMiuraChatRateLimitConfig({
  env = process.env,
}: {
  env?: Record<string, string | undefined>;
} = {}): MiuraChatRateLimitConfig {
  const enabled = readBooleanEnv(
    env.MIURA_CHAT_RATE_LIMIT_ENABLED ?? env.CHAT_RATE_LIMIT_ENABLED,
    DEFAULT_CHAT_RATE_LIMIT_ENABLED,
  );

  return {
    enabled,
    maxRequests: readIntegerEnv(
      env.MIURA_CHAT_RATE_LIMIT_MAX ?? env.CHAT_RATE_LIMIT_MAX,
      DEFAULT_CHAT_RATE_LIMIT_MAX,
      "MIURA_CHAT_RATE_LIMIT_MAX",
      MIN_CHAT_RATE_LIMIT_MAX,
      MAX_CHAT_RATE_LIMIT_MAX,
    ),
    windowMs: readIntegerEnv(
      env.MIURA_CHAT_RATE_LIMIT_WINDOW_MS ?? env.CHAT_RATE_LIMIT_WINDOW_MS,
      DEFAULT_CHAT_RATE_LIMIT_WINDOW_MS,
      "MIURA_CHAT_RATE_LIMIT_WINDOW_MS",
      MIN_CHAT_RATE_LIMIT_WINDOW_MS,
      MAX_CHAT_RATE_LIMIT_WINDOW_MS,
    ),
  };
}

function getMiuraRateLimitIdentifier(request: Request) {
  const ip =
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ??
    firstHeaderValue(request.headers.get("fastly-client-ip")) ??
    firstHeaderValue(request.headers.get("x-client-ip"));
  const url = new URL(request.url);
  const fallback = [
    request.headers.get("origin") ?? "no-origin",
    request.headers.get("user-agent") ?? "unknown-user-agent",
    url.host,
  ].join("|");
  const source = ip === null ? `fallback:${fallback}` : `ip:${ip}`;

  return createHash("sha256").update(source).digest("hex");
}

function buildRateLimitHeaders({
  limit,
  remaining,
  resetAt,
}: {
  limit: number;
  remaining: number;
  resetAt: number;
}) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}

function pruneExpiredBuckets(
  store: MiuraRateLimitStore,
  timestamp: number,
  windowMs: number,
) {
  if (store.size <= MAX_STORED_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [identifier, bucket] of store.entries()) {
    if (timestamp >= bucket.windowStart + windowMs) {
      store.delete(identifier);
    }
  }
}

function readBooleanEnv(rawValue: string | undefined, fallback: boolean) {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(rawValue.trim().toLowerCase());
}

function readIntegerEnv(
  rawValue: string | undefined,
  fallback: number,
  label: string,
  min: number,
  max: number,
) {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < min ||
    parsedValue > max
  ) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }

  return parsedValue;
}

function firstHeaderValue(value: string | null) {
  const firstValue = value?.split(",")[0]?.trim();

  return firstValue === undefined || firstValue === "" ? null : firstValue;
}

function getGlobalRateLimitStore() {
  const globalStore = globalThis as typeof globalThis & {
    __miuraChatRateLimitStore?: MiuraRateLimitStore;
  };

  globalStore.__miuraChatRateLimitStore ??= new Map();

  return globalStore.__miuraChatRateLimitStore;
}

export {
  DEFAULT_CHAT_RATE_LIMIT_MAX,
  DEFAULT_CHAT_RATE_LIMIT_WINDOW_MS,
  checkMiuraChatRateLimit,
  readMiuraChatRateLimitConfig,
  type MiuraChatRateLimitConfig,
  type MiuraChatRateLimitResult,
  type MiuraRateLimitStore,
};
