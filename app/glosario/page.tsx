import type { Metadata } from "next";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Glosario",
};

const glossaryItems = [
  {
    title: "CDI, DDI y PDI",
    description:
      "Índices por pilar para código/arquitectura, documentación/conocimiento y personas/proceso.",
  },
  {
    title: "DS y CF",
    description:
      "Debt Severity resume exposición global; Cost of Friction traduce severidad a fricción por escenarios.",
  },
  {
    title: "PWC, principal y break-even",
    description:
      "Salidas económicas futuras condicionadas a datos válidos, cobertura suficiente y disclaimers.",
  },
];

export default function GlossaryPage() {
  return (
    <>
      <PageIntro
        eyebrow="Ayuda contextual"
        title="Glosario MIURA"
        description="El glosario centralizará definiciones breves para que siglas y fórmulas no bloqueen a usuarios no técnicos."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={glossaryItems} />
        <MvpNotice title="Definiciones sujetas al catálogo">
          Las definiciones finales deben revisarse contra el PRD, el TFG y el
          catálogo de métricas antes de usarse como ayuda contextual definitiva.
        </MvpNotice>
      </section>
    </>
  );
}
