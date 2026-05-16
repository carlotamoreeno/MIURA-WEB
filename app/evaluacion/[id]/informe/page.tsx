import type { Metadata } from "next";
import { FileTextIcon } from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";
import { MIURA_DISCLAIMERS, MIURA_FORMULA_HELP } from "@/lib/miura/domain";
import { Badge } from "@/components/ui/badge";

type EvaluationRouteProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Informe",
};

const reportSections = [
  {
    title: "Resumen ejecutivo",
    description:
      "Sección prevista para severidad, mensaje de negocio y próximos pasos.",
  },
  {
    title: "Supuestos y métricas",
    description:
      "Sección prevista para pilares, cobertura, fórmulas y evidencia usada.",
  },
  {
    title: "Recomendaciones",
    description:
      "Sección prevista para acciones, mapeo Scrum/Kanban y disclaimers.",
  },
];

const reportFormulaItems = MIURA_FORMULA_HELP.map((help) => ({
  title: help.title,
  description: help.businessExplanation,
}));

export default async function ReportPage({ params }: EvaluationRouteProps) {
  const { id } = await params;

  return (
    <>
      <PageIntro
        eyebrow="Salida compartible"
        title="Informe exportable"
        description="La ruta de informe prepara el espacio para la vista imprimible o Markdown del diagnóstico MIURA, sin activar todavía exportación ni descarga."
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
            Informe pendiente de datos reales
          </div>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={reportSections} />
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            Ayuda incluida en el informe
          </h2>
          <InfoTileGrid items={reportFormulaItems} />
        </div>
        <MvpNotice title="Aviso de exportación futura">
          <span className="block">
            Cuando la exportación esté disponible, el informe deberá advertir
            que puede contener datos del proyecto introducidos por el usuario.
          </span>
          <span className="mt-2 block">{MIURA_DISCLAIMERS.preliminary}</span>
          <span className="mt-2 block">{MIURA_DISCLAIMERS.economic}</span>
        </MvpNotice>
      </section>
    </>
  );
}
