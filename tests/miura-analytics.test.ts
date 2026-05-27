// @vitest-environment node
import { describe, expect, test } from "vitest";

import {
  bucketLatency,
  bucketQuestionLength,
  getDebtSeverityBand,
  parseMiuraAnalyticsEvent,
} from "@/lib/miura/analytics/events";
import {
  handleMiuraAnalyticsOptionsRequest,
  handleMiuraAnalyticsRequest,
  logMiuraServerError,
} from "@/lib/miura/analytics/server";

const baseEvent = {
  sessionId: "miura-session-12345678",
  timestamp: "2026-05-27T09:00:00.000Z",
} as const;

function createRequest(body: unknown, init: RequestInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  new Headers(init.headers).forEach((value, key) => {
    headers.set(key, value);
  });

  return new Request("http://localhost/api/analytics", {
    ...init,
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createEvent(event: Record<string, unknown>) {
  return {
    ...baseEvent,
    ...event,
  };
}

describe("MIURA analytics event contract", () => {
  test("accepts strict PRD event properties with anonymous session metadata", () => {
    const parsed = parseMiuraAnalyticsEvent(
      createEvent({
        eventName: "app_opened",
        properties: {
          appVersion: "0.1.0",
        },
      }),
    );

    expect(parsed.success).toBe(true);
  });

  test("rejects raw chat text and unknown event properties", () => {
    const parsed = parseMiuraAnalyticsEvent(
      createEvent({
        eventName: "chat_question_sent",
        properties: {
          usesEvaluationContext: false,
          questionLengthBucket: "1-80",
          question: "¿Qué es PDI en MIURA?",
        },
      }),
    );

    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error)).not.toContain("¿Qué es PDI");
  });

  test("buckets chat length, latency and DS without storing raw values", () => {
    expect(bucketQuestionLength(80)).toBe("1-80");
    expect(bucketQuestionLength(241)).toBe("241-1000");
    expect(bucketLatency(6001)).toBe("6-15s");
    expect(getDebtSeverityBand(0.32)).toBe("monitor");
    expect(getDebtSeverityBand(0.65)).toBe("mitigate");
    expect(getDebtSeverityBand(0.66)).toBe("intervene");
  });
});

describe("MIURA analytics endpoint", () => {
  test("rejects disallowed origins before parsing or logging analytics payloads", async () => {
    const errorLogs: unknown[] = [];
    const response = await handleMiuraAnalyticsRequest(
      createRequest("{", {
        headers: {
          Origin: "https://attacker.example",
        },
      }),
      {
        env: {
          ENABLE_ANALYTICS: "true",
        },
        logger: {
          info: () => undefined,
          error: (...args: unknown[]) => {
            errorLogs.push(args);
          },
        },
      },
    );
    const body = (await response.json()) as { error: { message: string } };

    expect(response.status).toBe(403);
    expect(body.error.message).toMatch(/origen/i);
    expect(errorLogs).toHaveLength(0);
  });

  test("returns exact-origin analytics preflight headers", () => {
    const response = handleMiuraAnalyticsOptionsRequest(
      new Request("http://localhost/api/analytics", {
        method: "OPTIONS",
        headers: {
          Origin: "https://demo.miura.example",
          "Access-Control-Request-Method": "POST",
        },
      }),
      {
        env: {
          MIURA_ALLOWED_ORIGINS: "https://demo.miura.example",
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://demo.miura.example",
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  test("returns no-op 204 without parsing or logging when analytics is disabled", async () => {
    const infoLogs: unknown[] = [];
    const errorLogs: unknown[] = [];

    const response = await handleMiuraAnalyticsRequest(createRequest("{"), {
      env: {
        ENABLE_ANALYTICS: "false",
      },
      logger: {
        info: (...args: unknown[]) => {
          infoLogs.push(args);
        },
        error: (...args: unknown[]) => {
          errorLogs.push(args);
        },
      },
    });

    expect(response.status).toBe(204);
    expect(infoLogs).toHaveLength(0);
    expect(errorLogs).toHaveLength(0);
  });

  test("logs only the validated sanitized event when analytics is enabled", async () => {
    const infoLogs: unknown[] = [];
    const errorLogs: unknown[] = [];
    const response = await handleMiuraAnalyticsRequest(
      createRequest(
        createEvent({
          eventName: "chat_question_sent",
          properties: {
            usesEvaluationContext: true,
            questionLengthBucket: "81-240",
          },
        }),
      ),
      {
        env: {
          ENABLE_ANALYTICS: "true",
        },
        logger: {
          info: (...args: unknown[]) => {
            infoLogs.push(args);
          },
          error: (...args: unknown[]) => {
            errorLogs.push(args);
          },
        },
      },
    );

    expect(response.status).toBe(204);
    expect(errorLogs).toHaveLength(0);
    expect(infoLogs).toHaveLength(1);
    expect(JSON.stringify(infoLogs)).toContain("chat_question_sent");
    expect(JSON.stringify(infoLogs)).toContain("81-240");
    expect(JSON.stringify(infoLogs)).not.toContain("¿Qué es PDI");
  });

  test("rejects invalid enabled events without echoing property values", async () => {
    const errorLogs: unknown[] = [];
    const response = await handleMiuraAnalyticsRequest(
      createRequest({
        ...baseEvent,
        eventName: "chat_question_sent",
        properties: {
          usesEvaluationContext: false,
          questionLengthBucket: "1-80",
          question: "Texto sensible de usuario",
        },
      }),
      {
        env: {
          ENABLE_ANALYTICS: "true",
        },
        logger: {
          info: () => undefined,
          error: (...args: unknown[]) => {
            errorLogs.push(args);
          },
        },
      },
    );
    const body = (await response.json()) as { error: { message: string } };

    expect(response.status).toBe(400);
    expect(body.error.message).toMatch(/evento analítico no es válido/i);
    expect(JSON.stringify(errorLogs)).not.toContain(
      "Texto sensible de usuario",
    );
    expect(JSON.stringify(body)).not.toContain("Texto sensible de usuario");
  });
});

describe("MIURA sanitized server logging", () => {
  test("does not log raw provider messages or user questions", () => {
    const errorLogs: unknown[] = [];

    logMiuraServerError(
      {
        error: (...args: unknown[]) => {
          errorLogs.push(args);
        },
      },
      {
        surface: "chat",
        category: "provider",
        error: new Error(
          "raw provider key leak while answering ¿Qué es PDI en MIURA?",
        ),
      },
    );

    const serializedLogs = JSON.stringify(errorLogs);

    expect(serializedLogs).toContain("provider");
    expect(serializedLogs).toContain("Error");
    expect(serializedLogs).not.toContain("raw provider key leak");
    expect(serializedLogs).not.toContain("¿Qué es PDI");
  });
});
