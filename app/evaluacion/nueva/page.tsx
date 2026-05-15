import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";
import { demoEvaluationId } from "@/lib/miura/navigation";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Crear evaluación",
};

const setupItems = [
  {
    title: "Organización demo",
    description:
      "La estructura de producto reserva el modelo Workspace → Project → Evaluation definido en el PRD.",
  },
  {
    title: "Proyecto activo",
    description:
      "La UI simplificará la demo a un proyecto activo, sin crear cuentas ni pedir datos personales.",
  },
  {
    title: "Supuestos iniciales",
    description:
      "Metodología, capacidad mensual, horizonte y coste hora opcional se recogerán en la tarea de creación real.",
  },
];

export default function NewEvaluationPage() {
  return (
    <>
      <PageIntro
        eyebrow="Evaluación local"
        title="Crear evaluación MIURA"
        description="Esta superficie prepara la entrada sin login para iniciar una evaluación local de un proyecto. La creación funcional, validación Zod y persistencia de borradores se implementan en tareas posteriores."
      >
        <Button asChild className="w-fit">
          <Link href={`/evaluacion/${demoEvaluationId}/wizard`}>
            Ver recorrido demo
            <ArrowRightIcon />
          </Link>
        </Button>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={setupItems} />
        <MvpNotice title="Sin login en MVP">
          La app no debe solicitar email, contraseña ni registro. Las
          evaluaciones vivirán en el navegador hasta que el usuario decida
          exportarlas.
        </MvpNotice>
      </section>
    </>
  );
}
