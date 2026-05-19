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

import {
  DEFAULT_CALCULATION_ASSUMPTIONS,
  MINIMUM_ECONOMIC_COVERAGE,
} from "./calculate";
import { MIURA_DISCLAIMERS, MIURA_FORMULA_HELP } from "./help";
import {
  MIURA_PILLARS,
  getMetricsByPillar,
  normalizeSimpleMetricValue,
} from "./metrics";

type ReportMetricStatus = "observed" | "unavailable" | "missing";

type MiuraReportMetricRow = {
  metricId: MetricId;
  pillar: Pillar;
  pillarLabel: string;
  metricName: string;
  status: ReportMetricStatus;
  statusLabel: string;
  reading: string;
  normalizedValue?: number;
  evidence: string;
};

type MiuraReportCoverageRow = {
  pillar: Pillar;
  pillarLabel: string;
  indexId: "CDI" | "DDI" | "PDI";
  coverage: number;
  statusLabel: string;
};

type MiuraReportScenarioRow = {
  scenario: Scenario;
  scenarioLabel: string;
  lambda: number;
  CF: number;
  lostHoursMonthly: number;
  lostHoursTotal: number;
  projectedWasteCost?: number;
  currency: string;
};

type MiuraReportData = {
  appVersion: string;
  generatedAt: string;
  title: string;
  diagnosisLabel: string;
  exportWarning: string;
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
  metricRows: MiuraReportMetricRow[];
  coverageRows: MiuraReportCoverageRow[];
  scenarioRows: MiuraReportScenarioRow[];
  formulaItems: typeof MIURA_FORMULA_HELP;
  disclaimers: typeof MIURA_DISCLAIMERS;
};

type BuildMiuraReportDataInput = {
  appVersion: string;
  generatedAt: string;
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
};

const REPORT_EXPORT_PRIVACY_WARNING =
  "Este informe puede contener nombres, métricas, notas y supuestos del proyecto introducidos por el usuario. Revísalo antes de compartirlo fuera de tu organización.";

const simpleLevelLabels = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
} as const satisfies Record<SimpleLevel, string>;

const metricStatusLabels = {
  observed: "Observada",
  unavailable: "No disponible",
  missing: "Sin dato",
} as const satisfies Record<ReportMetricStatus, string>;

const recommendationLabels = {
  monitor: "monitorizar",
  mitigate: "mitigar selectivamente",
  intervene: "intervenir",
  improve_evidence: "mejorar evidencia",
} as const satisfies Record<RecommendationLevel, string>;

const scenarioLabels = {
  conservative: "Conservador",
  central: "Central",
  tensioned: "Tensionado",
} as const satisfies Record<Scenario, string>;

function formatScore(value: number) {
  return value.toFixed(2);
}

function formatCoefficient(value: number) {
  return value.toFixed(4);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHours(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reportFileDate(value: string) {
  return value.slice(0, 10);
}

function pillarDefinition(pillar: Pillar) {
  const definition = MIURA_PILLARS.find((item) => item.id === pillar);

  if (definition === undefined) {
    throw new Error(`Pilar MIURA no soportado: ${pillar}`);
  }

  return definition;
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

function buildMetricRows(
  metricValues: readonly MetricValue[],
): MiuraReportMetricRow[] {
  const valuesById = new Map(
    metricValues.map((metricValue) => [metricValue.metricId, metricValue]),
  );

  return PILLARS.flatMap((pillar) => {
    const pillarDefinitionValue = pillarDefinition(pillar);

    return getMetricsByPillar(pillar).map((metric) => {
      const metricValue = valuesById.get(metric.id);

      if (metricValue === undefined) {
        return {
          metricId: metric.id,
          pillar,
          pillarLabel: pillarDefinitionValue.label,
          metricName: metric.name,
          status: "missing",
          statusLabel: metricStatusLabels.missing,
          reading: "Sin valor guardado",
          evidence: "Pendiente de completar",
        } satisfies MiuraReportMetricRow;
      }

      if (!metricValue.available) {
        return {
          metricId: metric.id,
          pillar,
          pillarLabel: pillarDefinitionValue.label,
          metricName: metric.name,
          status: "unavailable",
          statusLabel: metricStatusLabels.unavailable,
          reading: "Excluida de cobertura",
          evidence: "La métrica se marcó como no disponible",
        } satisfies MiuraReportMetricRow;
      }

      return {
        metricId: metric.id,
        pillar,
        pillarLabel: pillarDefinitionValue.label,
        metricName: metric.name,
        status: "observed",
        statusLabel: metricStatusLabels.observed,
        reading: metricValueReading(metricValue),
        normalizedValue: normalizedMetricValue(metricValue),
        evidence: metricEvidence(metricValue),
      } satisfies MiuraReportMetricRow;
    });
  });
}

function buildCoverageRows(
  calculationResult: CalculationResult,
): MiuraReportCoverageRow[] {
  return PILLARS.map((pillar) => {
    const definition = pillarDefinition(pillar);
    const coverage = calculationResult.coverage[pillar];

    return {
      pillar,
      pillarLabel: definition.label,
      indexId: definition.indexId,
      coverage,
      statusLabel:
        coverage >= MINIMUM_ECONOMIC_COVERAGE ? "Suficiente" : "Parcial",
    };
  });
}

function buildScenarioRows(
  calculationResult: CalculationResult,
): MiuraReportScenarioRow[] {
  return calculationResult.scenarios.map((scenario) => ({
    scenario: scenario.scenario,
    scenarioLabel: scenarioLabels[scenario.scenario],
    lambda: scenario.lambda,
    CF: scenario.CF,
    lostHoursMonthly: scenario.lostHoursMonthly,
    lostHoursTotal: scenario.lostHoursTotal,
    ...(calculationResult.economicOutputAllowed && scenario.PWC !== undefined
      ? { projectedWasteCost: scenario.PWC }
      : {}),
    currency: scenario.currency,
  }));
}

function buildMiuraReportData({
  appVersion,
  generatedAt,
  workspace,
  project,
  evaluation,
  calculationResult,
  recommendationSet,
}: BuildMiuraReportDataInput): MiuraReportData {
  return {
    appVersion,
    generatedAt,
    title: `Informe MIURA - ${project.name}`,
    diagnosisLabel:
      calculationResult.coverageStatus === "partial"
        ? "Diagnóstico parcial"
        : "Diagnóstico con cobertura suficiente",
    exportWarning: REPORT_EXPORT_PRIVACY_WARNING,
    workspace,
    project,
    evaluation,
    calculationResult,
    recommendationSet,
    metricRows: buildMetricRows(evaluation.metricValues),
    coverageRows: buildCoverageRows(calculationResult),
    scenarioRows: buildScenarioRows(calculationResult),
    formulaItems: MIURA_FORMULA_HELP,
    disclaimers: MIURA_DISCLAIMERS,
  };
}

function markdownCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function markdownRow(cells: readonly string[]) {
  return `| ${cells.map(markdownCell).join(" | ")} |`;
}

function markdownList(items: readonly string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function renderMiuraReportMarkdown(report: MiuraReportData) {
  const resultRows = [
    ["CDI", formatScore(report.calculationResult.CDI)],
    ["DDI", formatScore(report.calculationResult.DDI)],
    ["PDI", formatScore(report.calculationResult.PDI)],
    ["DS", formatScore(report.calculationResult.DS)],
  ];
  const principal = report.calculationResult.principal;
  const breakEven = report.calculationResult.breakEven;
  const warnings =
    report.calculationResult.warnings.length === 0
      ? ["No hay avisos adicionales para esta evaluación."]
      : report.calculationResult.warnings;
  const assumptions =
    report.calculationResult.assumptions.length === 0
      ? [...DEFAULT_CALCULATION_ASSUMPTIONS]
      : report.calculationResult.assumptions;

  return [
    `# ${report.title}`,
    "",
    `Generado: ${formatDateTime(report.generatedAt)}`,
    `Versión app: ${report.appVersion}`,
    `Evaluación: ${report.evaluation.name} (${report.evaluation.id})`,
    `Organización: ${report.workspace.name}`,
    `Proyecto: ${report.project.name}`,
    `Metodología predominante: ${report.project.methodology}`,
    `Horizonte: ${report.evaluation.horizonMonths} meses`,
    `Estado: ${report.diagnosisLabel}`,
    "",
    "## Aviso de exportación",
    "",
    report.exportWarning,
    "",
    markdownList([
      report.disclaimers.preliminary,
      report.disclaimers.economic,
      report.disclaimers.coverage,
      report.disclaimers.localDemo,
    ]),
    "",
    "## Resumen ejecutivo",
    "",
    `Recomendación principal: ${recommendationLabels[report.recommendationSet.level]}.`,
    `Pilar dominante: ${pillarDefinition(report.recommendationSet.dominantPillar).label}.`,
    "",
    report.recommendationSet.summary,
    "",
    "## Resultados MIURA",
    "",
    markdownRow(["Índice", "Valor"]),
    markdownRow(["---", "---"]),
    ...resultRows.map((row) => markdownRow(row)),
    "",
    "## Cobertura por pilar",
    "",
    markdownRow(["Pilar", "Índice", "Cobertura", "Estado"]),
    markdownRow(["---", "---", "---", "---"]),
    ...report.coverageRows.map((row) =>
      markdownRow([
        row.pillarLabel,
        row.indexId,
        `${formatScore(row.coverage)} (${formatPercent(row.coverage)})`,
        row.statusLabel,
      ]),
    ),
    "",
    "## Escenarios de fricción, capacidad y coste",
    "",
    "La capacidad perdida se presenta antes que euros. Las salidas monetarias solo aparecen cuando la cobertura y los datos permiten defenderlas.",
    "",
    markdownRow([
      "Escenario",
      "λ",
      "CF",
      "Capacidad perdida mensual",
      "Capacidad perdida total",
      "PWC",
    ]),
    markdownRow(["---", "---", "---", "---", "---", "---"]),
    ...report.scenarioRows.map((row) =>
      markdownRow([
        row.scenarioLabel,
        formatScore(row.lambda),
        formatCoefficient(row.CF),
        `${formatHours(row.lostHoursMonthly)} h/mes`,
        `${formatHours(row.lostHoursTotal)} h`,
        row.projectedWasteCost === undefined
          ? "No disponible"
          : formatCurrency(row.projectedWasteCost, row.currency),
      ]),
    ),
    "",
    ...(principal === undefined && breakEven === undefined
      ? []
      : [
          "### Principal y break-even heurístico",
          "",
          ...(principal === undefined
            ? []
            : [
                `Principal de remediación: ${formatCurrency(principal, report.project.currency)}.`,
              ]),
          ...(breakEven === undefined
            ? []
            : [
                `Break-even heurístico: ${formatHours(breakEven.months)} meses.`,
              ]),
          ...(breakEven === undefined
            ? []
            : markdownList(breakEven.assumptions).split("\n")),
          "",
        ]),
    "## Métricas y evidencia",
    "",
    markdownRow([
      "Pilar",
      "Métrica",
      "Estado",
      "Lectura",
      "Normalizado",
      "Evidencia",
    ]),
    markdownRow(["---", "---", "---", "---", "---", "---"]),
    ...report.metricRows.map((row) =>
      markdownRow([
        row.pillarLabel,
        `${row.metricId} - ${row.metricName}`,
        row.statusLabel,
        row.reading,
        row.normalizedValue === undefined
          ? "-"
          : formatScore(row.normalizedValue),
        row.evidence,
      ]),
    ),
    "",
    "## Recomendaciones",
    "",
    markdownList(report.recommendationSet.actions),
    "",
    "### Mapeo Scrum/Kanban",
    "",
    markdownRow(["Evento o punto de trabajo", "Acción"]),
    markdownRow(["---", "---"]),
    ...report.recommendationSet.scrumMapping.map((item) =>
      markdownRow([item.event, item.action]),
    ),
    "",
    "## Fórmulas y supuestos",
    "",
    ...report.formulaItems.flatMap((item) => [
      `### ${item.title}`,
      "",
      item.summary,
      "",
      `Fórmula: ${item.formula}`,
      "",
      item.businessExplanation,
      "",
    ]),
    "### Supuestos de cálculo",
    "",
    markdownList(assumptions),
    "",
    "### Avisos de cálculo",
    "",
    markdownList(warnings),
    "",
  ].join("\n");
}

export {
  REPORT_EXPORT_PRIVACY_WARNING,
  buildMiuraReportData,
  formatCoefficient,
  formatCurrency,
  formatDateTime,
  formatHours,
  formatPercent,
  formatScore,
  recommendationLabels,
  renderMiuraReportMarkdown,
  reportFileDate,
  scenarioLabels,
  type MiuraReportCoverageRow,
  type MiuraReportData,
  type MiuraReportMetricRow,
  type MiuraReportScenarioRow,
  type ReportMetricStatus,
};
