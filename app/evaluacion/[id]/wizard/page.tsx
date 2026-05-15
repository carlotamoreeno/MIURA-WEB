import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Wizard de evaluación",
};

const pillarSteps = [
  {
    title: "Código/arquitectura",
    description:
      "Paso reservado para las métricas C1-C4 y sus ayudas contextuales.",
  },
  {
    title: "Documentación/conocimiento",
    description:
      "Paso reservado para las métricas D1-D4, fuentes y evidencia opcional.",
  },
  {
    title: "Personas/proceso",
    description:
      "Paso reservado para las métricas P1-P4 y señales de coordinación.",
  },
];

export default async function WizardPage({ params }: EvaluationRouteProps) {
  const { id } = await params;

  return (
    <>
      <PageIntro
        eyebrow="Wizard"
        title="Wizard de evaluación"
        description="La arquitectura de navegación ya separa el recorrido por pilares. La captura de métricas, modo simple/avanzado y validación se implementarán cuando existan schemas y catálogo MIURA."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Evaluación: {id}</Badge>
          <Button asChild variant="outline" className="w-fit">
            <Link href={`/evaluacion/${id}/scorecard`}>
              Ir a scorecard demo
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={pillarSteps} />
        <MvpNotice title="Progreso orientativo">
          El indicador global muestra el paso del recorrido, no cobertura real.
          La cobertura por pilar pertenece a las tareas de motor MIURA y wizard
          funcional.
        </MvpNotice>
      </section>
    </>
  );
}
