import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";
import { PreloadedExampleScorecard } from "@/components/miura/preloaded-example-scorecard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleMiuraEvaluationId } from "@/lib/miura/domain";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Scorecard",
};

const scorecardViews = [
  {
    title: "Vista ejecutiva",
    description:
      "Reservada para semáforos, severidad DS, pilar dominante y lectura de negocio.",
  },
  {
    title: "Vista técnica",
    description:
      "Reservada para fórmulas, pesos, normalización, cobertura y trazabilidad.",
  },
  {
    title: "Escenarios",
    description:
      "Reservados para fricción, capacidad perdida y coste proyectado opcional.",
  },
];

export default async function ScorecardPage({ params }: EvaluationRouteProps) {
  const { id } = await params;
  const showsPreloadedExample = id === sampleMiuraEvaluationId;

  return (
    <>
      <PageIntro
        eyebrow="Resultados"
        title="Scorecard MIURA"
        description="La ruta de resultados queda disponible para que las tareas de cálculo y recomendaciones conecten la severidad, cobertura y supuestos sin cambiar la estructura de navegación."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Evaluación: {id}</Badge>
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/evaluacion/${id}/informe`}>
              Ver informe demo
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        {showsPreloadedExample ? (
          <PreloadedExampleScorecard />
        ) : (
          <>
            <InfoTileGrid items={scorecardViews} />
            <MvpNotice title="Sin cálculo todavía">
              Esta tarea no implementa la scorecard final, escenarios ni
              monetización. La vista completa de resultados se añadirá en
              TASK-013/TASK-014.
            </MvpNotice>
          </>
        )}
      </section>
    </>
  );
}
