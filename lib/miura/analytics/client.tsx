"use client";

import {
  type MiuraAnalyticsEventName,
  type MiuraAnalyticsEventProperties,
} from "./events";

type TrackMiuraAnalyticsEvent = <TName extends MiuraAnalyticsEventName>(
  eventName: TName,
  properties: MiuraAnalyticsEventProperties<TName>,
) => void;

type MiuraAnalyticsBootstrapProps = {
  appVersion: string;
  enabled: boolean;
};

declare global {
  interface Window {
    __MIURA_ANALYTICS_CONFIG__?: MiuraAnalyticsBootstrapProps;
  }
}

const MIURA_ANALYTICS_SESSION_STORAGE_KEY = "miura.analytics.sessionId.v1";
const MIURA_ANALYTICS_SESSION_ID_PREFIX = "miura-session-";

const miuraAnalyticsRuntime = {
  appVersion: "0.1.0",
  enabled: false,
  sessionId: undefined as string | undefined,
};

function createAnonymousSessionId() {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;

  return `${MIURA_ANALYTICS_SESSION_ID_PREFIX}${randomPart}`;
}

function getOrCreateAnonymousSessionId() {
  try {
    const storedSessionId = window.sessionStorage.getItem(
      MIURA_ANALYTICS_SESSION_STORAGE_KEY,
    );

    if (storedSessionId !== null) {
      return storedSessionId;
    }

    const nextSessionId = createAnonymousSessionId();

    window.sessionStorage.setItem(
      MIURA_ANALYTICS_SESSION_STORAGE_KEY,
      nextSessionId,
    );

    return nextSessionId;
  } catch {
    return createAnonymousSessionId();
  }
}

function configureMiuraAnalytics({
  appVersion,
  enabled,
}: MiuraAnalyticsBootstrapProps) {
  miuraAnalyticsRuntime.appVersion = appVersion;
  miuraAnalyticsRuntime.enabled = enabled;
}

function syncMiuraAnalyticsRuntimeFromWindow() {
  if (typeof window === "undefined") {
    return miuraAnalyticsRuntime;
  }

  const config = window.__MIURA_ANALYTICS_CONFIG__;

  if (config !== undefined) {
    configureMiuraAnalytics(config);
  }

  return miuraAnalyticsRuntime;
}

const trackMiuraAnalyticsEvent: TrackMiuraAnalyticsEvent = (
  eventName,
  properties,
) => {
  const runtime = syncMiuraAnalyticsRuntimeFromWindow();

  if (!runtime.enabled || typeof window === "undefined") {
    return;
  }

  runtime.sessionId ??= getOrCreateAnonymousSessionId();

  const event = {
    eventName,
    sessionId: runtime.sessionId,
    timestamp: new Date().toISOString(),
    properties,
  };

  void (async () => {
    const { parseMiuraAnalyticsEvent } = await import("./events");
    const parsedEvent = parseMiuraAnalyticsEvent(event);

    if (!parsedEvent.success) {
      return;
    }

    await fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsedEvent.data),
      keepalive: true,
    });
  })().catch(() => undefined);
};

function useMiuraAnalytics() {
  const runtime = syncMiuraAnalyticsRuntimeFromWindow();

  return {
    enabled: runtime.enabled,
    trackMiuraAnalyticsEvent,
  };
}

export { useMiuraAnalytics, type TrackMiuraAnalyticsEvent };
