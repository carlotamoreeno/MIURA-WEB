import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  GaugeIcon,
  GitPullRequestArrowIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { MvpNotice, PageIntro } from "@/components/miura/page-structure";
import {
  MIURA_DISCLAIMERS,
  RECOMMENDATION_DISCLAIMERS,
  SCRUM_KANBAN_WORK_POINTS,
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
  title: "MIURA en Scrum/Kanban",
};

const scrumWorkPoints = [
  {
    event: "Product Backlog refinement",
    label: "Refinement",
    description:
      "Convertir señales MIURA en Product Backlog Items pequeños, ordenables y con evidencia suficiente.",
    note: "En Scrum Guide 2020 el refinamiento es una actividad continua sobre el Product Backlog, no un evento formal obligatorio.",
  },
  {
    event: "Sprint Planning",
    label: "Planning",
    description:
      "Reservar capacidad para deuda cuando afecte al Sprint Goal, al riesgo de entrega o a la sostenibilidad del incremento.",
    note: "La deuda seleccionada debe ser trabajo visible del Sprint Backlog, no capacidad escondida.",
  },
  {
    event: "Sprint Review",
    label: "Review",
    description:
      "Explicar a stakeholders qué fricción se redujo, qué evidencia cambió y qué decisión de negocio queda mejor informada.",
    note: "MIURA aporta transparencia; no convierte la review en una auditoría técnica cerrada.",
  },
  {
    event: "Sprint Retrospective",
    label: "Retrospective",
    description:
      "Usar CDI, DDI, PDI, flujo y fricción como material de inspección sobre calidad, efectividad e interacciones.",
    note: "El resultado debe ser una mejora concreta y asumible, no una lista genérica de deuda.",
  },
  {
    event: "Release planning",
    label: "Roadmap",
    description:
      "Usar DS, cobertura y capacidad perdida como conversación de roadmap y riesgo fuera de los eventos formales de Scrum.",
    note: "La planificación de release no es un evento Scrum formal; MIURA la usa como punto de decisión de negocio.",
  },
] as const;

const kanbanWorkPoints = [
  {
    event: "Kanban replenishment",
    label: "Replenishment",
    description:
      "Seleccionar opciones de deuda que entran al sistema según riesgo, capacidad disponible y criterios explícitos de preparación.",
    note: "MIURA ayuda a decidir qué deuda merece entrar al flujo sin sustituir las políticas locales del sistema Kanban.",
  },
  {
    event: "Kanban service review",
    label: "Service review",
    description:
      "Revisar lead time, cycle time, WIP, bloqueos, retrabajo y demanda de fallo para detectar fricción atribuible a deuda.",
    note: "La revisión debe conectar métricas de flujo con acciones de mejora y capacidad protegida.",
  },
] as const;

const flowSignals = [
  "WIP y bloqueos que muestran trabajo empezado pero no terminado.",
  "Lead time y cycle time que empeoran por retrabajo, esperas o dependencias técnicas.",
  "Demanda de fallo, urgencias o interrupciones que consumen capacidad planificada.",
  "Políticas explícitas para entrada de deuda, límites de urgencias y capacidad reservada.",
];

const requiredWorkPoints = SCRUM_KANBAN_WORK_POINTS.join(" · ");

export default function ScrumKanbanPage() {
  return (
    <>
      <PageIntro
        eyebrow="Agile y deuda técnica"
        title="MIURA en Scrum/Kanban"
        description="MIURA se integra en conversaciones ágiles ya existentes para hacer visible la deuda técnica como evidencia, riesgo, capacidad y priorización. No reemplaza Scrum ni Kanban: aporta una lectura complementaria."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg" className="sm:w-fit">
            <Link href="/evaluacion/nueva">
              Crear evaluación
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="sm:w-fit">
            <Link href="/metodologia">
              <ListChecksIcon />
              Ver metodología
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
        <MvpNotice title="Guardrail de integración">
          <span className="block">{RECOMMENDATION_DISCLAIMERS[2]}</span>
          <span className="mt-2 block">
            MIURA no sustituye eventos Scrum, artefactos Scrum, roles,
            accountabilities, Definition of Done, políticas de flujo ni
            cadencias Kanban.
          </span>
        </MvpNotice>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              Scrum
            </Badge>
            <div className="space-y-2">
              <h2 className="text-2xl leading-tight font-semibold">
                Usar MIURA donde Scrum ya inspecciona y adapta.
              </h2>
              <p className="text-muted-foreground leading-7">
                Scrum se apoya en transparencia, inspección y adaptación. MIURA
                aporta evidencia de deuda para que el Product Backlog, el Sprint
                Backlog, el Increment y las conversaciones con stakeholders no
                oculten coste de cambio o fricción.
              </p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="text-primary mt-1 size-5 shrink-0"
                />
                <div className="space-y-1">
                  <CardTitle>Regla práctica</CardTitle>
                  <CardDescription className="leading-6">
                    Si la deuda compite por capacidad, debe ser visible,
                    ordenable y negociable. Si falta evidencia, la primera
                    acción MIURA es mejorar cobertura antes de monetizar.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              Puntos Scrum
            </Badge>
            <h2 className="text-2xl leading-tight font-semibold">
              Del backlog a la mejora continua.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scrumWorkPoints.map((workPoint) => (
              <Card key={workPoint.event}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{workPoint.label}</Badge>
                    <CardTitle>{workPoint.event}</CardTitle>
                  </div>
                  <CardDescription className="leading-6">
                    {workPoint.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground border-l-2 pl-3 text-sm leading-6">
                    {workPoint.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="max-w-3xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              Kanban
            </Badge>
            <h2 className="text-2xl leading-tight font-semibold">
              Conectar deuda técnica con flujo, políticas y servicio.
            </h2>
            <p className="text-muted-foreground leading-7">
              En Kanban, MIURA ayuda a ver si la deuda deteriora efectividad,
              eficiencia, predictibilidad o capacidad. La decisión sigue
              perteneciendo al sistema Kanban y sus políticas explícitas.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {kanbanWorkPoints.map((workPoint) => (
              <Card key={workPoint.event}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{workPoint.label}</Badge>
                    <CardTitle>{workPoint.event}</CardTitle>
                  </div>
                  <CardDescription className="leading-6">
                    {workPoint.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground border-l-2 pl-3 text-sm leading-6">
                    {workPoint.note}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <GaugeIcon
                  aria-hidden="true"
                  className="text-primary mt-1 size-5 shrink-0"
                />
                <div className="space-y-1">
                  <CardTitle>
                    Señales de flujo que MIURA puede ordenar
                  </CardTitle>
                  <CardDescription className="leading-6">
                    Estas señales no sustituyen métricas Kanban; ayudan a
                    interpretar si la deuda está degradando el servicio.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {flowSignals.map((signal) => (
                  <li key={signal} className="flex items-start gap-3">
                    <ClipboardCheckIcon
                      aria-hidden="true"
                      className="text-primary mt-1 size-4 shrink-0"
                    />
                    <p className="text-sm leading-6">{signal}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card size="sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <UsersRoundIcon
                    aria-hidden="true"
                    className="text-primary mt-1 size-4 shrink-0"
                  />
                  <div className="space-y-1">
                    <CardTitle>Lenguaje para stakeholders</CardTitle>
                    <CardDescription className="leading-6">
                      Explicar deuda como riesgo, capacidad y decisión ayuda a
                      evitar que el backlog técnico sea invisible.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <RefreshCcwIcon
                    aria-hidden="true"
                    className="text-primary mt-1 size-4 shrink-0"
                  />
                  <div className="space-y-1">
                    <CardTitle>Cadencia de revisión</CardTitle>
                    <CardDescription className="leading-6">
                      Repetir MIURA en puntos de inspección permite comprobar si
                      baja la fricción o si solo se mueve de un pilar a otro.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <GitPullRequestArrowIcon
                    aria-hidden="true"
                    className="text-primary mt-1 size-4 shrink-0"
                  />
                  <div className="space-y-1">
                    <CardTitle>Mapa de puntos cubiertos</CardTitle>
                    <CardDescription className="leading-6 wrap-anywhere">
                      {requiredWorkPoints}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-5">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-2">
              <h2 className="text-xl leading-tight font-semibold">
                De la explicación a la acción.
              </h2>
              <p className="text-muted-foreground leading-7">
                La integración empieza con una evaluación local, continúa con
                evidencia y termina en una conversación de backlog, flujo o
                roadmap. {MIURA_DISCLAIMERS.preliminary}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <Button asChild className="sm:w-fit">
                <Link href="/evaluacion/nueva">
                  Crear evaluación
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" className="sm:w-fit">
                <Link href="/glosario">Consultar glosario</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
