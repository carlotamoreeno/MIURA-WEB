import type { Metadata } from "next";
import { FileTextIcon } from "lucide-react";

import packageJson from "@/package.json";
import { PageIntro } from "@/components/miura/page-structure";
import { ReportResults } from "@/components/miura/report-results";
import { Badge } from "@/components/ui/badge";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Informe",
};

export default async function ReportPage({ params }: EvaluationRouteProps) {
  const { id } = await params;

  return (
    <>
      <PageIntro
        eyebrow="Salida compartible"
        title="Informe exportable"
        description="Genera una salida imprimible y descargable en Markdown con resumen ejecutivo, métricas, escenarios, recomendaciones, supuestos y disclaimers MIURA."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="h-auto min-h-5 max-w-full min-w-0 justify-start whitespace-normal text-left leading-5 wrap-anywhere"
          >
            Evaluación: {id}
          </Badge>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <FileTextIcon aria-hidden="true" className="size-4" />
            Markdown + vista imprimible
          </div>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <ReportResults appVersion={packageJson.version} evaluationId={id} />
      </section>
    </>
  );
}
