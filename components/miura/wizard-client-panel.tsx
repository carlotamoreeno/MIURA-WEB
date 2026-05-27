"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const mobileWizardHydrationDelayMs = 2800;

const EvaluationSessionSummary = dynamic(
  () =>
    import("@/components/miura/evaluation-session-summary").then(
      (mod) => mod.EvaluationSessionSummary,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-5 text-sm">
        Preparando resumen local...
      </div>
    ),
  },
);

const MetricWizard = dynamic(
  () =>
    import("@/components/miura/metric-wizard").then((mod) => mod.MetricWizard),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-5 text-sm">
        Cargando wizard MIURA...
      </div>
    ),
  },
);

function WizardClientPanel({ evaluationId }: { evaluationId: string }) {
  const [showInteractivePanel, setShowInteractivePanel] = useState(false);

  useEffect(() => {
    const shouldDelay = window.matchMedia("(max-width: 767px)").matches;
    const timeoutId = window.setTimeout(
      () => setShowInteractivePanel(true),
      shouldDelay ? mobileWizardHydrationDelayMs : 0,
    );

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
      {showInteractivePanel ? (
        <>
          <EvaluationSessionSummary evaluationId={evaluationId} />
          <MetricWizard evaluationId={evaluationId} />
        </>
      ) : (
        <>
          <div className="border-border bg-card text-muted-foreground rounded-lg border p-5 text-sm">
            Preparando resumen local...
          </div>
          <div className="border-border bg-card text-muted-foreground rounded-lg border p-5 text-sm">
            Cargando wizard MIURA...
          </div>
        </>
      )}
    </section>
  );
}

export { WizardClientPanel };
