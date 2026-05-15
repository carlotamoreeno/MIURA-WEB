import type { Metadata } from "next";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Ajustes locales",
};

const localSettingsItems = [
  {
    title: "Exportar JSON",
    description:
      "La exportación local compensará la ausencia de backend de usuarios en el MVP.",
  },
  {
    title: "Importar evaluación",
    description:
      "La importación deberá validarse con Zod antes de aceptar datos en el navegador.",
  },
  {
    title: "Borrar datos locales",
    description:
      "El usuario podrá eliminar evaluaciones y preferencias guardadas localmente.",
  },
];

export default function LocalSettingsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Privacidad y control"
        title="Ajustes locales"
        description="Esta ruta reserva la gestión de datos locales para exportar, importar y borrar evaluaciones sin introducir cuentas ni persistencia en servidor."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={localSettingsItems} />
        <MvpNotice title="Datos del usuario en navegador">
          Supabase se usará para el corpus RAG, no para guardar evaluaciones de
          usuario en MVP 0.1.
        </MvpNotice>
      </section>
    </>
  );
}
