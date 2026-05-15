import type { Metadata } from "next";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "MIURA en Scrum/Kanban",
};

const agileItems = [
  {
    title: "Product Backlog refinement",
    description:
      "MIURA puede aportar señales para descomponer y ordenar trabajo de deuda técnica con más transparencia.",
  },
  {
    title: "Sprint Planning, Review y Retrospective",
    description:
      "La integración prevista conecta riesgo, evidencia y mejora continua sin sustituir Scrum.",
  },
  {
    title: "Flujo Kanban",
    description:
      "Las recomendaciones futuras podrán mapearse a replenishment, service review y gestión de capacidad.",
  },
];

export default function ScrumKanbanPage() {
  return (
    <>
      <PageIntro
        eyebrow="Agile y deuda técnica"
        title="MIURA en Scrum/Kanban"
        description="La ruta reserva el espacio para explicar cómo MIURA complementa Scrum y Kanban al hacer visible la deuda técnica como riesgo, capacidad y mejora priorizable."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={agileItems} />
        <MvpNotice title="Scrum no se reemplaza">
          La app debe hablar de integración con eventos, artefactos y puntos de
          inspección/adaptación; no de sustituir Scrum por MIURA.
        </MvpNotice>
      </section>
    </>
  );
}
