import type { Metadata } from "next";

import { NewEvaluationForm } from "@/components/miura/new-evaluation-form";
import { PageIntro } from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Crear evaluación",
};

export default function NewEvaluationPage() {
  return (
    <>
      <PageIntro
        eyebrow="Evaluación local"
        title="Crear evaluación MIURA"
        description="Inicia un diagnóstico local sin cuenta ni datos de acceso. MIURA crea una organización demo, un proyecto y una evaluación en borrador para continuar con el wizard."
      />

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <NewEvaluationForm />
      </section>
    </>
  );
}
