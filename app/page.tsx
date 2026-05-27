import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";
import { MIURA_DISCLAIMERS } from "@/lib/miura/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: {
    absolute: "Inicio | MIURA",
  },
};

const pillars = [
  {
    title: "Código/arquitectura",
    description:
      "Mide señales de mantenibilidad, complejidad y fricción técnica acumulada.",
  },
  {
    title: "Documentación/conocimiento",
    description:
      "Evalúa trazabilidad, transferencia de conocimiento y dependencia de contexto informal.",
  },
  {
    title: "Personas/proceso",
    description:
      "Conecta coordinación, prácticas de mejora continua y pérdida de capacidad operativa.",
  },
];

const valuePoints = [
  "Traduce deuda técnica a conversación de riesgo y capacidad.",
  "Mantiene la evaluación local en el navegador durante el MVP.",
  "Acompaña métricas, fórmulas y siglas con ayuda contextual y glosario.",
];

export default function Home() {
  return (
    <>
      <PageIntro
        eyebrow="MIURA MVP 0.1"
        title="Deuda técnica explicada en lenguaje de negocio."
        description="MIURA convierte señales técnicas, documentales y de proceso en decisiones de riesgo y capacidad."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="sm:w-fit">
            <Link href="/evaluacion/nueva" prefetch={false}>
              Crear evaluación MIURA
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="sm:w-fit">
            <Link href="/chat" prefetch={false}>
              <MessageSquareTextIcon />
              Preguntar a MIURA
            </Link>
          </Button>
        </div>
      </PageIntro>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-5">
          <Badge variant="secondary" className="w-fit">
            Propuesta de valor
          </Badge>
          <div className="space-y-3">
            <h2 className="text-2xl leading-tight font-semibold">
              Del síntoma técnico a una decisión de negocio trazable.
            </h2>
            <p className="text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
              Guía la evaluación local, calcula severidad y conecta scorecard,
              informe y chat RAG con citas del corpus controlado.
            </p>
          </div>
          <div className="grid gap-3">
            {valuePoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="text-primary mt-1 size-4 shrink-0"
                />
                <p className="text-sm leading-6">{point}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-border bg-card rounded-lg border p-5">
            <BarChart3Icon aria-hidden="true" className="text-primary size-5" />
            <h2 className="mt-4 text-base font-semibold">
              Scorecard ejecutivo y técnico
            </h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Resume severidad, cobertura, escenarios, supuestos y trazabilidad
              técnica para discusión ejecutiva.
            </p>
          </div>
          <div className="border-border bg-card rounded-lg border p-5">
            <ShieldCheckIcon
              aria-hidden="true"
              className="text-primary size-5"
            />
            <h2 className="mt-4 text-base font-semibold">Demo sin login</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              El MVP no solicita email, contraseña ni cuenta; las evaluaciones
              se guardan localmente en el navegador.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-2">
          <h2 className="text-2xl leading-tight font-semibold">
            Tres pilares para evitar una lectura puramente técnica.
          </h2>
          <p className="text-muted-foreground leading-7">
            MIURA separa las señales de deuda para que la conversación incluya
            arquitectura, conocimiento y funcionamiento del equipo.
          </p>
        </div>
        <InfoTileGrid items={pillars} />
        <MvpNotice title="Alcance metodológico de la demo">
          <span className="block">{MIURA_DISCLAIMERS.preliminary}</span>
          <span className="mt-2 block">{MIURA_DISCLAIMERS.economic}</span>
          <Link
            href="/glosario"
            prefetch={false}
            className="text-info-foreground mt-3 inline-flex font-medium underline-offset-4 hover:underline"
          >
            Ver glosario de siglas y fórmulas
          </Link>
        </MvpNotice>
      </section>
    </>
  );
}
