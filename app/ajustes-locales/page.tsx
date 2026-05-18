import type { Metadata } from "next";

import { MvpNotice, PageIntro } from "@/components/miura/page-structure";
import { LocalSettingsManager } from "@/components/miura/local-settings-manager";

export const metadata: Metadata = {
  title: "Ajustes locales",
};

export default function LocalSettingsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Privacidad y control"
        title="Ajustes locales"
        description="Gestiona evaluaciones guardadas en este navegador: exporta un JSON, importa datos validados o borra la copia local sin crear una cuenta."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <LocalSettingsManager />
        <MvpNotice title="Datos del usuario en navegador">
          Supabase se usará para el corpus RAG, no para guardar evaluaciones de
          usuario en MVP 0.1. Los JSON exportados solo contienen datos de
          evaluación local y resultados MIURA.
        </MvpNotice>
      </section>
    </>
  );
}
