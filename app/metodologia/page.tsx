import type { Metadata } from "next";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Metodología MIURA",
};

const methodologyItems = [
  {
    title: "Tres pilares",
    description:
      "Código/arquitectura, documentación/conocimiento y personas/proceso ordenan la evaluación sociotécnica.",
  },
  {
    title: "Rúbrica simple",
    description:
      "El MVP trabaja con niveles bajo, medio y alto para hacer la entrada comprensible a negocio.",
  },
  {
    title: "Escenarios prudentes",
    description:
      "La monetización futura se presentará como escenario proyectado y supeditado a cobertura suficiente.",
  },
];

export default function MethodologyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Marco MIURA"
        title="Metodología MIURA"
        description="Esta página agrupa la explicación del framework para usuarios de negocio, gestión y perfiles técnicos. El contenido final se completará cuando el catálogo, glosario y corpus estén disponibles."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={methodologyItems} />
        <MvpNotice title="Framework preliminar">
          MIURA debe mantenerse descrito como un framework preliminar y no
          validado industrialmente. Esta cautela aplica a landing, scorecard,
          informe y chatbot.
        </MvpNotice>
      </section>
    </>
  );
}
