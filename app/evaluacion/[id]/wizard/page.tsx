import type { Metadata } from "next";

import { PageIntro } from "@/components/miura/page-structure";
import { WizardClientPanel } from "@/components/miura/wizard-client-panel";
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
        description="Completa las 12 métricas por pilares con lectura simple, evidencia avanzada o estado no disponible para reflejar cobertura real."
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

      <WizardClientPanel evaluationId={id} />
    </>
  );
}
