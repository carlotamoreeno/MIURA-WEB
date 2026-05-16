import type { Metadata } from "next";

import { PageIntro } from "@/components/miura/page-structure";
import { EvaluationSessionSummary } from "@/components/miura/evaluation-session-summary";
import { MetricWizard } from "@/components/miura/metric-wizard";
import { Badge } from "@/components/ui/badge";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Wizard de evaluación",
};

export default async function WizardPage({ params }: EvaluationRouteProps) {
  const { id } = await params;

  return (
    <>
      <PageIntro
        eyebrow="Wizard"
        title="Wizard de evaluación"
        description="Completa las métricas MIURA por pilares. Puedes usar una lectura simple bajo/medio/alto, añadir evidencia avanzada o marcar una métrica como no disponible para reflejar la cobertura real."
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="h-auto min-h-5 max-w-full min-w-0 justify-start whitespace-normal text-left leading-5 wrap-anywhere"
          >
            Evaluación: {id}
          </Badge>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <EvaluationSessionSummary evaluationId={id} />
        <MetricWizard evaluationId={id} />
      </section>
    </>
  );
}
