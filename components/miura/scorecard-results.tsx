"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  DatabaseIcon,
  InfoIcon,
  ListChecksIcon,
} from "lucide-react";

import {
  SeverityIndicator,
  type SeverityLevel,
} from "@/components/miura/severity-indicator";
import {
  buildMiuraRecommendationSet,
  buildPreloadedMiuraExampleSnapshot,
  calculateMiuraEvaluation,
  getMetricsByPillar,
  MIURA_DISCLAIMERS,
  MIURA_DS_WEIGHTS,
  MIURA_FRICTION_SCENARIOS,
  MIURA_PILLARS,
  MINIMUM_ECONOMIC_COVERAGE,
  normalizeSimpleMetricValue,
  sampleMiuraEvaluationId,
} from "@/lib/miura/domain";
import {
  PILLARS,
  type CalculationResult,
  type Evaluation,
  type MetricId,
  type MetricValue,
  type Pillar,
  type Project,
  type RecommendationLevel,
  type RecommendationSet,
  type Scenario,
  type SimpleLevel,
  type Workspace,
} from "@/lib/miura/schemas";
import { getTemporaryEvaluationSession } from "@/lib/miura/session/evaluation-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ScorecardResultsProps = {
  evaluationId: string;
};

type ScorecardData = {
  source: "session" | "example";
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
};

type ScorecardState =
  | {
      status: "ready";
      data: ScorecardData;
    }
  | {
      status: "missing";
    }
  | {
      status: "error";
      message: string;
    };

type MetricTraceStatus = "observed" | "unavailable" | "missing";

type MetricTraceRow = {
  metricId: MetricId;
  pillar: Pillar;
  metricName: string;
  status: MetricTraceStatus;
  reading: string;
  normalizedValue?: number;
  evidence: string;
};

const recommendationLabels = {
  monitor: "monitorizar",
  mitigate: "mitigar selectivamente",
  intervene: "intervenir",
  improve_evidence: "mejorar evidencia",
} as const satisfies Record<RecommendationLevel, string>;

const simpleLevelLabels = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
} as const satisfies Record<SimpleLevel, string>;

const scenarioLabels = {
  conservative: "Conservador",
  central: "Central",
  tensioned: "Tensionado",
} as const satisfies Record<Scenario, string>;

const metricTraceStatusLabels = {
  observed: "Observada",
  unavailable: "No disponible",
  missing: "Sin dato",
} as const satisfies Record<MetricTraceStatus, string>;

const recommendationVisualConfig = {
  monitor: {
    severityLevel: "low",
    label: "Severidad baja",
    description:
      "Mantener seguimiento, proteger evidencia y evitar que las señales crezcan sin control.",
  },
  mitigate: {
    severityLevel: "medium",
    label: "Severidad media",
    description:
      "Mitigar de forma selectiva las señales dominantes y convertirlas en trabajo priorizable.",
  },
  intervene: {
    severityLevel: "high",
    label: "Severidad alta",
    description:
      "Intervenir con foco ejecutivo, capacidad explícita y seguimiento de reducción de fricción.",
  },
  improve_evidence: {
    severityLevel: "medium",
    label: "Diagnóstico parcial",
    description:
      "Mejorar evidencia antes de defender monetización o decisiones fuertes.",
  },
} as const satisfies Record<
  RecommendationLevel,
  {
    severityLevel: SeverityLevel;
    label: string;
    description: string;
  }
>;

function formatScore(value: number) {
  return value.toFixed(2);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHours(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(value);
}

function pillarDefinition(pillar: Pillar) {
  const definition = MIURA_PILLARS.find((item) => item.id === pillar);

  if (definition === undefined) {
    throw new Error(`Pilar MIURA no soportado: ${pillar}`);
  }

  return definition;
}

function pillarLabel(pillar: Pillar) {
  return pillarDefinition(pillar).label;
}

function pillarIndexLabel(pillar: Pillar) {
  return pillarDefinition(pillar).indexId;
}

function metricValueReading(metricValue: MetricValue) {
  const simpleReading =
    metricValue.simpleLevel === undefined
      ? undefined
      : simpleLevelLabels[metricValue.simpleLevel];

  if (
    metricValue.advancedValue !== undefined &&
    metricValue.unit !== undefined
  ) {
    return simpleReading === undefined
      ? `${metricValue.advancedValue} ${metricValue.unit}`
      : `${simpleReading} · ${metricValue.advancedValue} ${metricValue.unit}`;
  }

  return simpleReading ?? "Valor observado";
}

function metricEvidence(metricValue: MetricValue) {
  const evidenceParts = [
    metricValue.source,
    metricValue.timeWindow,
    metricValue.evidenceNote,
  ].filter((item): item is string => item !== undefined);

  return evidenceParts.length === 0
    ? "Sin fuente declarada"
    : evidenceParts.join(" · ");
}

function normalizedMetricValue(metricValue: MetricValue) {
  if (!metricValue.available) return undefined;
  if (metricValue.normalizedValue !== undefined) {
    return metricValue.normalizedValue;
  }
  if (metricValue.simpleLevel !== undefined) {
    return normalizeSimpleMetricValue(
      metricValue.metricId,
      metricValue.simpleLevel,
    );
  }

  return undefined;
}

function buildMetricTraceRows(
  metricValues: readonly MetricValue[],
): MetricTraceRow[] {
  const valuesById = new Map(
    metricValues.map((metricValue) => [metricValue.metricId, metricValue]),
  );

  return PILLARS.flatMap((pillar) =>
    getMetricsByPillar(pillar).map((metric) => {
      const metricValue = valuesById.get(metric.id);

      if (metricValue === undefined) {
        return {
          metricId: metric.id,
          pillar,
          metricName: metric.name,
          status: "missing",
          reading: "Sin valor guardado",
          evidence: "Pendiente de completar",
        } satisfies MetricTraceRow;
      }

      if (!metricValue.available) {
        return {
          metricId: metric.id,
          pillar,
          metricName: metric.name,
          status: "unavailable",
          reading: "Excluida de cobertura",
          evidence: "La métrica se marcó como no disponible",
        } satisfies MetricTraceRow;
      }

      return {
        metricId: metric.id,
        pillar,
        metricName: metric.name,
        status: "observed",
        reading: metricValueReading(metricValue),
        normalizedValue: normalizedMetricValue(metricValue),
        evidence: metricEvidence(metricValue),
      } satisfies MetricTraceRow;
    }),
  );
}

function resolveScorecardData(evaluationId: string): ScorecardState {
  try {
    const temporarySession = getTemporaryEvaluationSession(evaluationId);

    if (temporarySession !== undefined) {
      const calculationResult = calculateMiuraEvaluation({
        project: temporarySession.project,
        evaluation: temporarySession.evaluation,
      });
      const recommendationSet = buildMiuraRecommendationSet(calculationResult);

      return {
        status: "ready",
        data: {
          source: "session",
          workspace: temporarySession.workspace,
          project: temporarySession.project,
          evaluation: temporarySession.evaluation,
          calculationResult,
          recommendationSet,
        },
      };
    }

    if (evaluationId === sampleMiuraEvaluationId) {
      const example = buildPreloadedMiuraExampleSnapshot();
      const calculationResult = calculateMiuraEvaluation({
        project: example.project,
        evaluation: example.evaluation,
      });
      const recommendationSet = buildMiuraRecommendationSet(calculationResult);

      return {
        status: "ready",
        data: {
          source: "example",
          workspace: example.workspace,
          project: example.project,
          evaluation: example.evaluation,
          calculationResult,
          recommendationSet,
        },
      };
    }

    return {
      status: "missing",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido calcular la scorecard MIURA.",
    };
  }
}

function ResultTile({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-6">{description}</p>
      </CardContent>
    </Card>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-muted/35 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function CoverageCard({
  pillar,
  calculationResult,
  testId,
}: {
  pillar: Pillar;
  calculationResult: CalculationResult;
  testId?: string;
}) {
  const coverage = calculationResult.coverage[pillar];
  const sufficient = coverage >= MINIMUM_ECONOMIC_COVERAGE;

  return (
    <div
      data-testid={testId}
      className="border-border bg-background rounded-lg border p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{pillarLabel(pillar)}</p>
          <p className="text-muted-foreground text-xs">
            {pillarIndexLabel(pillar)} · Cobertura {formatScore(coverage)}
          </p>
        </div>
        <Badge variant={sufficient ? "secondary" : "destructive"}>
          {sufficient ? "Suficiente" : "Parcial"}
        </Badge>
      </div>
      <Progress
        className="mt-3"
        value={coverage * 100}
        aria-label={`Cobertura de ${pillarLabel(pillar)}`}
      />
      <p className="text-muted-foreground mt-2 text-xs">
        {formatPercent(coverage)} de métricas observables disponibles.
      </p>
    </div>
  );
}

function CoverageSummary({
  calculationResult,
  testIdPrefix,
}: {
  calculationResult: CalculationResult;
  testIdPrefix?: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {PILLARS.map((pillar) => (
        <CoverageCard
          key={pillar}
          pillar={pillar}
          calculationResult={calculationResult}
          testId={
            testIdPrefix === undefined
              ? undefined
              : `${testIdPrefix}-coverage-${pillar}`
          }
        />
      ))}
    </div>
  );
}

function PartialCoverageAlert({
  calculationResult,
}: {
  calculationResult: CalculationResult;
}) {
  if (calculationResult.coverageStatus !== "partial") {
    return null;
  }

  const insufficientPillars = calculationResult.insufficientCoveragePillars
    .map(pillarLabel)
    .join(", ");

  return (
    <Alert className="border-info-border bg-info-bg text-info-foreground">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>Diagnóstico parcial</AlertTitle>
      <AlertDescription className="leading-6">
        La recomendación principal pasa a mejorar evidencia. Pilares por debajo
        de cobertura 0.50: {insufficientPillars}. La scorecard mantiene índices
        y capacidad perdida, pero no presenta PWC, principal ni break-even como
        salida fuerte.
      </AlertDescription>
    </Alert>
  );
}

function ExecutiveView({ data }: { data: ScorecardData }) {
  const { calculationResult, recommendationSet, project, evaluation } = data;
  const visualConfig = recommendationVisualConfig[recommendationSet.level];
  const centralScenario = calculationResult.scenarios.find(
    (scenario) => scenario.scenario === "central",
  );

  return (
    <div className="space-y-5">
      <PartialCoverageAlert calculationResult={calculationResult} />

      <div className="grid gap-4 md:grid-cols-4">
        <ResultTile
          label="CDI"
          value={formatScore(calculationResult.CDI)}
          description="Código/arquitectura."
        />
        <ResultTile
          label="DDI"
          value={formatScore(calculationResult.DDI)}
          description="Documentación/conocimiento."
        />
        <ResultTile
          label="PDI"
          value={formatScore(calculationResult.PDI)}
          description="Personas/proceso."
        />
        <ResultTile
          label="DS"
          value={formatScore(calculationResult.DS)}
          description="Severidad global MIURA."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Lectura ejecutiva</CardTitle>
                  <CardDescription>
                    {project.name} · {evaluation.name}
                  </CardDescription>
                </div>
                <Badge variant="secondary">
                  Nivel recomendado:{" "}
                  {recommendationLabels[recommendationSet.level]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <SeverityIndicator
                level={visualConfig.severityLevel}
                label={visualConfig.label}
                description={visualConfig.description}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <InlineFact
                  label="Pilar dominante"
                  value={pillarLabel(recommendationSet.dominantPillar)}
                />
                <InlineFact
                  label="Cobertura"
                  value={
                    calculationResult.coverageStatus === "sufficient"
                      ? "Suficiente"
                      : "Parcial"
                  }
                />
                <InlineFact
                  label="Umbral mínimo"
                  value={`${formatScore(MINIMUM_ECONOMIC_COVERAGE)} por pilar`}
                />
              </div>

              <div className="border-border bg-muted/35 rounded-lg border p-4">
                <p className="font-medium">Resumen de recomendación</p>
                <p className="text-muted-foreground mt-2 leading-6">
                  {recommendationSet.summary}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones prioritarias</CardTitle>
              <CardDescription>
                Primeras conversaciones para convertir el diagnóstico en trabajo
                gestionable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {recommendationSet.actions.map((action, index) => (
                  <li key={action} className="flex gap-3">
                    <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground leading-6">
                      {action}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3Icon
                  aria-hidden="true"
                  className="text-primary size-4"
                />
                <CardTitle>Capacidad perdida</CardTitle>
              </div>
              <CardDescription>
                Resumen compacto del escenario central. El panel completo queda
                para TASK-014.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {centralScenario === undefined ? (
                <p className="text-muted-foreground leading-6">
                  No hay escenario central disponible para esta evaluación.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Horas al mes
                    </p>
                    <p className="text-3xl font-semibold">
                      {formatHours(centralScenario.lostHoursMonthly)} h
                    </p>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">λ central</span>
                      <span className="font-medium">
                        {formatScore(centralScenario.lambda)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">CF central</span>
                      <span className="font-medium">
                        {centralScenario.CF.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">
                        Horizonte total
                      </span>
                      <span className="font-medium">
                        {formatHours(centralScenario.lostHoursTotal)} h
                      </span>
                    </div>
                  </div>
                </>
              )}
              <Alert className="border-info-border bg-info-bg text-info-foreground">
                <InfoIcon aria-hidden="true" />
                <AlertTitle>Horas antes que euros</AlertTitle>
                <AlertDescription>
                  Esta vista no muestra PWC, principal ni break-even. Esas
                  salidas económicas se desarrollan en TASK-014.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobertura por pilar</CardTitle>
              <CardDescription>
                La cobertura baja aumenta incertidumbre y bloquea monetización
                fuerte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoverageSummary
                calculationResult={calculationResult}
                testIdPrefix="scorecard-executive"
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TechnicalScoreGrid({
  calculationResult,
}: {
  calculationResult: CalculationResult;
}) {
  const items = [
    {
      label: "CDI",
      value: calculationResult.CDI,
      description: "Código/arquitectura",
    },
    {
      label: "DDI",
      value: calculationResult.DDI,
      description: "Documentación/conocimiento",
    },
    {
      label: "PDI",
      value: calculationResult.PDI,
      description: "Personas/proceso",
    },
    {
      label: "DS",
      value: calculationResult.DS,
      description: "0.40*CDI + 0.25*DDI + 0.35*PDI",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <ResultTile
          key={item.label}
          label={item.label}
          value={formatScore(item.value)}
          description={item.description}
        />
      ))}
    </div>
  );
}

function TechnicalFormulaPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListChecksIcon
              aria-hidden="true"
              className="text-primary size-4"
            />
            <CardTitle>Pesos y cobertura</CardTitle>
          </div>
          <CardDescription>
            La scorecard usa los pesos aceptados y renormaliza métricas
            observadas dentro de cada pilar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">CDI</span>
            <span className="font-medium">
              {formatScore(MIURA_DS_WEIGHTS.CDI)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">DDI</span>
            <span className="font-medium">
              {formatScore(MIURA_DS_WEIGHTS.DDI)}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">PDI</span>
            <span className="font-medium">
              {formatScore(MIURA_DS_WEIGHTS.PDI)}
            </span>
          </div>
          <div className="border-border bg-muted/35 rounded-lg border p-3 leading-6">
            Pesos internos iguales entre métricas observadas; cobertura separada
            sobre 4 métricas por pilar.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardListIcon
              aria-hidden="true"
              className="text-primary size-4"
            />
            <CardTitle>λ de escenarios</CardTitle>
          </div>
          <CardDescription>
            La vista técnica expone los valores usados; el panel económico
            completo pertenece a TASK-014.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {MIURA_FRICTION_SCENARIOS.map((scenario) => (
            <div key={scenario.scenario} className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {scenarioLabels[scenario.scenario]}
              </span>
              <span className="font-medium">
                λ={formatScore(scenario.lambda)}
              </span>
            </div>
          ))}
          <div className="border-border bg-muted/35 rounded-lg border p-3 leading-6">
            CF = λ*DS. La capacidad perdida se puede diagnosticar aunque no se
            muestren euros.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTraceTable({ evaluation }: { evaluation: Evaluation }) {
  const rows = buildMetricTraceRows(evaluation.metricValues);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trazabilidad de métricas</CardTitle>
        <CardDescription>
          Las 12 métricas base se muestran aunque falte evidencia o se hayan
          marcado como no disponibles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilar</TableHead>
              <TableHead>Métrica</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Lectura</TableHead>
              <TableHead>Normalizado</TableHead>
              <TableHead>Evidencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.metricId}>
                <TableCell className="whitespace-normal">
                  {pillarIndexLabel(row.pillar)}
                </TableCell>
                <TableCell className="min-w-52 whitespace-normal">
                  <span className="font-medium">{row.metricId}</span> ·{" "}
                  {row.metricName}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === "observed"
                        ? "secondary"
                        : row.status === "unavailable"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {metricTraceStatusLabels[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-44 whitespace-normal">
                  {row.reading}
                </TableCell>
                <TableCell>
                  {row.normalizedValue === undefined
                    ? "-"
                    : formatScore(row.normalizedValue)}
                </TableCell>
                <TableCell className="min-w-64 whitespace-normal text-muted-foreground">
                  {row.evidence}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AssumptionsAndWarnings({
  calculationResult,
  recommendationSet,
}: {
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
}) {
  const warnings = calculationResult.warnings;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Supuestos visibles</CardTitle>
          <CardDescription>
            Se muestran para evitar falsa precisión metodológica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {calculationResult.assumptions.map((assumption) => (
              <li key={assumption} className="flex gap-2 leading-6">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="text-primary mt-1 size-4 shrink-0"
                />
                <span className="text-muted-foreground">{assumption}</span>
              </li>
            ))}
            {recommendationSet.disclaimers.map((disclaimer) => (
              <li key={disclaimer} className="flex gap-2 leading-6">
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="text-primary mt-1 size-4 shrink-0"
                />
                <span className="text-muted-foreground">{disclaimer}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avisos de cálculo</CardTitle>
          <CardDescription>
            Señales excluidas, datos insuficientes o salidas bloqueadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="text-muted-foreground leading-6">
              No hay avisos adicionales para esta evaluación.
            </p>
          ) : (
            <ul className="space-y-2">
              {warnings.map((warning) => (
                <li key={warning} className="flex gap-2 leading-6">
                  <AlertCircleIcon
                    aria-hidden="true"
                    className="text-severity-medium mt-1 size-4 shrink-0"
                  />
                  <span className="text-muted-foreground">{warning}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TechnicalView({ data }: { data: ScorecardData }) {
  return (
    <div className="space-y-5">
      <TechnicalScoreGrid calculationResult={data.calculationResult} />
      <CoverageSummary
        calculationResult={data.calculationResult}
        testIdPrefix="scorecard-technical"
      />
      <TechnicalFormulaPanel />
      <MetricTraceTable evaluation={data.evaluation} />
      <AssumptionsAndWarnings
        calculationResult={data.calculationResult}
        recommendationSet={data.recommendationSet}
      />
    </div>
  );
}

function MethodologyDisclaimers() {
  return (
    <Alert className="border-info-border bg-info-bg text-info-foreground">
      <InfoIcon aria-hidden="true" />
      <AlertTitle>Disclaimers de interpretación</AlertTitle>
      <AlertDescription className="space-y-2 leading-6">
        <span className="block">{MIURA_DISCLAIMERS.preliminary}</span>
        <span className="block">{MIURA_DISCLAIMERS.economic}</span>
        <span className="block">{MIURA_DISCLAIMERS.coverage}</span>
      </AlertDescription>
    </Alert>
  );
}

function MissingScorecard({ evaluationId }: { evaluationId: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DatabaseIcon aria-hidden="true" className="text-primary size-4" />
          <CardTitle>Borrador temporal no disponible</CardTitle>
        </div>
        <CardDescription className="leading-6">
          No hay una evaluación temporal para {evaluationId}. Esta versión aún
          no persiste datos tras recargar o abrir otra pestaña.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground max-w-2xl leading-6">
          Crea una evaluación nueva o carga el ejemplo reproducible hasta que
          TASK-015 añada persistencia local durable.
        </p>
        <Button asChild className="w-fit">
          <Link href="/evaluacion/nueva">
            Crear evaluación
            <ArrowRightIcon />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ScorecardHeader({ data }: { data: ScorecardData }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-normal">
          {data.project.name}
        </h2>
        <p className="text-muted-foreground leading-6">
          {data.workspace.name} · {data.project.methodology} ·{" "}
          {data.evaluation.horizonMonths} meses
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {data.source === "example"
            ? "Fixture reproducible"
            : "Borrador local"}
        </Badge>
        <Badge variant="secondary">
          Pilar dominante: {pillarLabel(data.recommendationSet.dominantPillar)}
        </Badge>
      </div>
    </div>
  );
}

function ScorecardResults({ evaluationId }: ScorecardResultsProps) {
  const scorecardState = useMemo(
    () => resolveScorecardData(evaluationId),
    [evaluationId],
  );

  if (scorecardState.status === "missing") {
    return (
      <div className="space-y-5">
        <MissingScorecard evaluationId={evaluationId} />
        <MethodologyDisclaimers />
      </div>
    );
  }

  if (scorecardState.status === "error") {
    return (
      <div className="space-y-5">
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>No se ha podido calcular la scorecard</AlertTitle>
          <AlertDescription>{scorecardState.message}</AlertDescription>
        </Alert>
        <MethodologyDisclaimers />
      </div>
    );
  }

  const data = scorecardState.data;

  return (
    <div className="space-y-6">
      <ScorecardHeader data={data} />
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="executive">Ejecutiva</TabsTrigger>
          <TabsTrigger value="technical">Técnica</TabsTrigger>
        </TabsList>
        <TabsContent value="executive">
          <ExecutiveView data={data} />
        </TabsContent>
        <TabsContent value="technical">
          <TechnicalView data={data} />
        </TabsContent>
      </Tabs>
      <MethodologyDisclaimers />
    </div>
  );
}

export { ScorecardResults };
