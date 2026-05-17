import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { PageIntro } from "@/components/miura/page-structure";
import { ScorecardResults } from "@/components/miura/scorecard-results";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Scorecard",
};

export default async function ScorecardPage({ params }: EvaluationRouteProps) {
  const { id } = await params;

  return (
    <>
      <PageIntro
        eyebrow="Resultados"
        title="Scorecard MIURA"
        description="Lee la severidad MIURA en lenguaje ejecutivo y revisa la trazabilidad técnica de índices, cobertura, supuestos y recomendaciones."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="h-auto min-h-5 max-w-full min-w-0 justify-start whitespace-normal text-left leading-5 wrap-anywhere"
          >
            Evaluación: {id}
          </Badge>
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/evaluacion/${id}/informe`}>
              Ver informe
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <ScorecardResults evaluationId={id} />
      </section>
    </>
  );
}
