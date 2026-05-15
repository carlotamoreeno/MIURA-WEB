import {
  ArrowRightIcon,
  CheckCircle2Icon,
  MessageSquareTextIcon,
} from "lucide-react";

import { DesignSystemShowcase } from "@/components/miura/design-system-showcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    name: "Código y arquitectura",
    description:
      "Señales sobre mantenibilidad, complejidad y fricción técnica acumulada.",
  },
  {
    name: "Documentación y conocimiento",
    description:
      "Evidencia sobre trazabilidad, transferencia de conocimiento y dependencia de contexto informal.",
  },
  {
    name: "Personas y proceso",
    description:
      "Indicadores de coordinación, capacidad perdida y prácticas de mejora continua.",
  },
];

export default function Home() {
  return (
    <main className="bg-background text-foreground">
      <section className="border-border bg-card/75 border-b">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-md text-sm font-semibold"
              >
                M
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-foreground uppercase">
                  MIURA
                </p>
                <p className="text-muted-foreground text-sm">
                  Framework preliminar de deuda técnica
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              Demo sin login
            </Badge>
          </header>

          <div className="grid flex-1 gap-12 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
            <div className="space-y-7">
              <Badge variant="secondary" className="w-fit">
                MVP 0.1 · sistema visual base
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-normal text-balance sm:text-5xl">
                  Deuda técnica explicada en lenguaje de negocio.
                </h1>
                <p className="text-muted-foreground max-w-2xl text-lg leading-8">
                  MIURA convierte señales técnicas, documentales y de proceso en
                  una evaluación guiada para conversar sobre riesgo, capacidad y
                  coste de no actuar con prudencia metodológica.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="sm:w-fit">
                  Crear evaluación MIURA
                  <ArrowRightIcon />
                </Button>
                <Button variant="outline" className="sm:w-fit">
                  <MessageSquareTextIcon />
                  Preguntar a MIURA
                </Button>
              </div>
            </div>

            <div className="border-border bg-background grid gap-4 rounded-lg border p-5 shadow-sm">
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">
                  Estado del producto
                </p>
                <p className="text-2xl font-semibold">
                  Base visual enterprise lista para QA
                </p>
                <p className="text-muted-foreground text-sm leading-6">
                  Tokens, componentes shadcn/ui y semáforos accesibles preparan
                  el terreno para navegación, wizard y scorecard en tareas
                  posteriores.
                </p>
              </div>
              <div className="grid gap-2 text-sm">
                {[
                  "Consulting Teal",
                  "Responsive desde 390px",
                  "Estados con icono",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2Icon
                      aria-hidden="true"
                      className="text-primary size-4"
                    />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.name}
                className="border-border bg-background rounded-lg border p-5"
              >
                <h2 className="text-base font-semibold">{pillar.name}</h2>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <DesignSystemShowcase />
    </main>
  );
}
