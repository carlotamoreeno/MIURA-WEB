import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CalculatorIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  Layers3Icon,
  MessageSquareTextIcon,
  ShieldAlertIcon,
} from "lucide-react";

import { MvpNotice, PageIntro } from "@/components/miura/page-structure";
import {
  MIURA_DISCLAIMERS,
  MIURA_FORMULA_HELP,
  MIURA_METRIC_DEFINITIONS,
  MIURA_PILLARS,
} from "@/lib/miura/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Metodología MIURA",
};

const miuraFlow = [
  {
    code: "M",
    title: "Measurement",
    description:
      "Recoge señales observables de deuda técnica con fuente, ventana temporal y lectura bajo/medio/alto.",
  },
  {
    code: "I",
    title: "Integration",
    description:
      "Normaliza las señales y las integra en CDI, DDI, PDI y DS sin mezclar evidencia con opinión.",
  },
  {
    code: "U",
    title: "Uncertainty",
    description:
      "Mantiene visible la cobertura, los supuestos y el rango de escenarios antes de hablar de coste.",
  },
  {
    code: "R",
    title: "Recommendation",
    description:
      "Convierte severidad, pilar dominante y cobertura en próximos pasos accionables para negocio y delivery.",
  },
  {
    code: "A",
    title: "Agile Alignment",
    description:
      "Lleva la conversación a Scrum y Kanban como complemento, no como proceso paralelo.",
  },
];

const usageSteps = [
  "Crear una evaluación local sin login y declarar proyecto, capacidad y horizonte.",
  "Completar las métricas de los tres pilares con rúbrica simple o evidencia avanzada.",
  "Leer primero severidad, cobertura y capacidad perdida; los euros solo aparecen si hay datos válidos.",
  "Usar la recomendación para priorizar evidencia, mitigación o intervención dentro del flujo de trabajo.",
];

const highlightedFormulaIds = [
  "pillar-indexes",
  "debt-severity",
  "coverage-gate",
  "friction-scenarios",
  "economic-outputs",
] as const;

const formulaHighlights = highlightedFormulaIds.map((id) => {
  const formula = MIURA_FORMULA_HELP.find((item) => item.id === id);

  if (formula === undefined) {
    throw new Error(`Ayuda de fórmula MIURA no encontrada: ${id}`);
  }

  return formula;
});

function metricsForPillar(pillarId: (typeof MIURA_PILLARS)[number]["id"]) {
  return MIURA_METRIC_DEFINITIONS.filter(
    (metric) => metric.pillar === pillarId,
  );
}

export default function MethodologyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Marco MIURA"
        title="Metodología MIURA"
        description="MIURA convierte señales técnicas, documentales y de proceso en una conversación trazable sobre severidad, cobertura, capacidad y próximos pasos. La lectura está pensada para negocio, delivery y perfiles técnicos trabajando con la misma evidencia."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="sm:w-fit">
            <Link href="/evaluacion/nueva">
              Crear evaluación
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="sm:w-fit">
            <Link href="/glosario">
              <BookOpenTextIcon />
              Ver glosario
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="sm:w-fit">
            <Link href="/chat">
              <MessageSquareTextIcon />
              Preguntar a MIURA
            </Link>
          </Button>
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <MvpNotice title="Lectura metodológica obligatoria">
          <span className="block">{MIURA_DISCLAIMERS.preliminary}</span>
          <span className="mt-2 block">{MIURA_DISCLAIMERS.economic}</span>
        </MvpNotice>

        <div className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              Flujo MIURA
            </Badge>
            <h2 className="text-2xl leading-tight font-semibold">
              Cinco pasos para pasar de señales a decisión.
            </h2>
            <p className="text-muted-foreground leading-7">
              El acrónimo MIURA ordena la evaluación para que cada salida pueda
              explicarse desde las métricas, la cobertura y los supuestos
              usados.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {miuraFlow.map((step) => (
              <Card key={step.code} size="sm">
                <CardHeader>
                  <Badge variant="outline" className="w-fit">
                    {step.code}
                  </Badge>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-6">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              Pilares y métricas MVP
            </Badge>
            <h2 className="text-2xl leading-tight font-semibold">
              Tres pilares, doce métricas y cobertura separada.
            </h2>
            <p className="text-muted-foreground leading-7">
              El MVP conserva cuatro métricas por pilar. Las métricas observadas
              se ponderan por igual dentro de su pilar y las no disponibles
              reducen cobertura.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {MIURA_PILLARS.map((pillar) => (
              <Card key={pillar.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{pillar.indexId}</Badge>
                    <CardTitle>{pillar.label}</CardTitle>
                  </div>
                  <CardDescription className="leading-6">
                    {pillar.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {metricsForPillar(pillar.id).map((metric) => (
                      <li key={metric.id} className="flex gap-3">
                        <Badge variant="secondary" className="mt-0.5">
                          {metric.id}
                        </Badge>
                        <div className="space-y-1">
                          <p className="font-medium">{metric.name}</p>
                          <p className="text-muted-foreground text-sm leading-6">
                            {metric.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-4">
            <div className="max-w-2xl space-y-2">
              <Badge variant="secondary" className="w-fit">
                Cómo usarlo
              </Badge>
              <h2 className="text-2xl leading-tight font-semibold">
                Una guía para conversar, no una caja negra.
              </h2>
              <p className="text-muted-foreground leading-7">
                MIURA ayuda a preparar una decisión defendible: qué señales se
                observan, qué confianza hay y qué acción conviene tomar.
              </p>
            </div>
            <div className="grid gap-3">
              {usageSteps.map((step) => (
                <div key={step} className="flex items-start gap-3">
                  <CheckCircle2Icon
                    aria-hidden="true"
                    className="text-primary mt-1 size-4 shrink-0"
                  />
                  <p className="text-sm leading-6">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {formulaHighlights.map((help) => (
              <Card key={help.id} size="sm">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    {help.id === "economic-outputs" ? (
                      <ShieldAlertIcon
                        aria-hidden="true"
                        className="text-primary mt-1 size-4 shrink-0"
                      />
                    ) : help.id === "friction-scenarios" ? (
                      <CalculatorIcon
                        aria-hidden="true"
                        className="text-primary mt-1 size-4 shrink-0"
                      />
                    ) : (
                      <Layers3Icon
                        aria-hidden="true"
                        className="text-primary mt-1 size-4 shrink-0"
                      />
                    )}
                    <div className="space-y-1">
                      <CardTitle>{help.title}</CardTitle>
                      <CardDescription className="leading-6">
                        {help.summary}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="border-border bg-muted/35 rounded-lg border p-3 font-mono text-xs leading-5 wrap-anywhere">
                    {help.formula}
                  </p>
                  <p className="text-muted-foreground text-sm leading-6">
                    {help.businessExplanation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-5">
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ClipboardListIcon
                  aria-hidden="true"
                  className="text-primary size-5"
                />
                <h2 className="text-xl leading-tight font-semibold">
                  Salida esperada de una evaluación.
                </h2>
              </div>
              <p className="text-muted-foreground leading-7">
                La scorecard combina índices, cobertura, pilar dominante,
                escenarios y recomendaciones. El objetivo es decidir el
                siguiente paso con evidencia suficiente, no producir una cifra
                cerrada.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <Button asChild className="sm:w-fit">
                <Link href="/evaluacion/nueva">
                  Empezar evaluación
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" className="sm:w-fit">
                <Link href="/scrum-kanban">Ver integración Scrum/Kanban</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
