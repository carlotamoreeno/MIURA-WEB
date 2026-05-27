import type { Metadata } from "next";
import Script from "next/script";

import packageJson from "@/package.json";
import { readMiuraAnalyticsEnabled } from "@/lib/miura/analytics/server";
import { MiuraAppShell } from "@/components/miura/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MIURA Web App",
    template: "%s | MIURA",
  },
  description:
    "Demo guiada de MIURA para explicar y evaluar deuda técnica sin login.",
};

function createMiuraAnalyticsBootstrapScript({
  appVersion,
  enabled,
}: {
  appVersion: string;
  enabled: boolean;
}) {
  const configJson = JSON.stringify({ appVersion, enabled });

  return String.raw`
(() => {
  const config = ${configJson};
  window.__MIURA_ANALYTICS_CONFIG__ = config;

  if (!config.enabled) return;

  const storageKey = "miura.analytics.sessionId.v1";
  const sessionPrefix = "miura-session-";

  function createSessionId() {
    const randomPart = window.crypto?.randomUUID?.() ||
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);

    return sessionPrefix + randomPart;
  }

  function getSessionId() {
    try {
      const storedSessionId = window.sessionStorage.getItem(storageKey);

      if (storedSessionId !== null) return storedSessionId;

      const nextSessionId = createSessionId();
      window.sessionStorage.setItem(storageKey, nextSessionId);
      return nextSessionId;
    } catch {
      return createSessionId();
    }
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventName: "app_opened",
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      properties: {
        appVersion: config.appVersion,
      },
    }),
    keepalive: true,
  }).catch(() => undefined);
})();
`;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsEnabled = readMiuraAnalyticsEnabled();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <Script
          id="miura-analytics-bootstrap"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: createMiuraAnalyticsBootstrapScript({
              appVersion: packageJson.version,
              enabled: analyticsEnabled,
            }),
          }}
        />
        <MiuraAppShell>{children}</MiuraAppShell>
      </body>
    </html>
  );
}
