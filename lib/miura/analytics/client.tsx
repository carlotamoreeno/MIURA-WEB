"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import {
  MIURA_ANALYTICS_SESSION_ID_PREFIX,
  parseMiuraAnalyticsEvent,
  type MiuraAnalyticsEventName,
  type MiuraAnalyticsEventProperties,
} from "./events";

type TrackMiuraAnalyticsEvent = <TName extends MiuraAnalyticsEventName>(
  eventName: TName,
  properties: MiuraAnalyticsEventProperties<TName>,
) => void;

type MiuraAnalyticsContextValue = {
  enabled: boolean;
  trackMiuraAnalyticsEvent: TrackMiuraAnalyticsEvent;
};

type MiuraAnalyticsProviderProps = {
  appVersion: string;
  enabled: boolean;
  children: ReactNode;
};

const MIURA_ANALYTICS_SESSION_STORAGE_KEY = "miura.analytics.sessionId.v1";

const noopTrackMiuraAnalyticsEvent: TrackMiuraAnalyticsEvent = () => undefined;

const MiuraAnalyticsContext = createContext<MiuraAnalyticsContextValue>({
  enabled: false,
  trackMiuraAnalyticsEvent: noopTrackMiuraAnalyticsEvent,
});

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

function MiuraAnalyticsProvider({
  appVersion,
  enabled,
  children,
}: MiuraAnalyticsProviderProps) {
  const sessionIdRef = useRef<string | undefined>(undefined);

  const trackMiuraAnalyticsEvent = useCallback<TrackMiuraAnalyticsEvent>(
    (eventName, properties) => {
      if (!enabled || typeof window === "undefined") {
        return;
      }

      sessionIdRef.current ??= getOrCreateAnonymousSessionId();

      const event = {
        eventName,
        sessionId: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        properties,
      };
      const parsedEvent = parseMiuraAnalyticsEvent(event);

      if (!parsedEvent.success) {
        return;
      }

      void fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedEvent.data),
        keepalive: true,
      }).catch(() => undefined);
    },
    [enabled],
  );

  useEffect(() => {
    trackMiuraAnalyticsEvent("app_opened", {
      appVersion,
    });
  }, [appVersion, trackMiuraAnalyticsEvent]);

  const contextValue = useMemo(
    () => ({
      enabled,
      trackMiuraAnalyticsEvent,
    }),
    [enabled, trackMiuraAnalyticsEvent],
  );

  return (
    <MiuraAnalyticsContext.Provider value={contextValue}>
      {children}
    </MiuraAnalyticsContext.Provider>
  );
}

function useMiuraAnalytics() {
  return useContext(MiuraAnalyticsContext);
}

export {
  MiuraAnalyticsProvider,
  useMiuraAnalytics,
  type TrackMiuraAnalyticsEvent,
};
