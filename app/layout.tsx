import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import packageJson from "@/package.json";
import { MiuraAnalyticsProvider } from "@/lib/miura/analytics/client";
import { readMiuraAnalyticsEnabled } from "@/lib/miura/analytics/server";
import { MiuraAppShell } from "@/components/miura/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MIURA Web App",
    template: "%s | MIURA",
  },
  description:
    "Demo guiada de MIURA para explicar y evaluar deuda técnica sin login.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <MiuraAnalyticsProvider
          appVersion={packageJson.version}
          enabled={readMiuraAnalyticsEnabled()}
        >
          <MiuraAppShell>{children}</MiuraAppShell>
        </MiuraAnalyticsProvider>
      </body>
    </html>
  );
}
