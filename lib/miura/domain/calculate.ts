import {
  PILLARS,
  type CalculationResult,
  type CoverageStatus,
  type Evaluation,
  type MetricId,
  type MetricValue,
  type Pillar,
  type PillarResult,
  type Project,
  type Scenario,
  type ScenarioResult,
  evaluationSchema,
  projectSchema,
} from "@/lib/miura/schemas";

import {
  MIURA_PILLARS,
  getMetricDefinition,
  getMetricsByPillar,
  normalizeSimpleMetricValue,
} from "./metrics";

const MIURA_DS_WEIGHTS = {
  CDI: 0.4,
  DDI: 0.25,
  PDI: 0.35,
} as const;

const MIURA_FRICTION_SCENARIOS = [
  {
    scenario: "conservative",
    lambda: 0.15,
  },
  {
    scenario: "central",
    lambda: 0.25,
  },
  {
    scenario: "tensioned",
    lambda: 0.35,
  },
] as const satisfies readonly { scenario: Scenario; lambda: number }[];

const METRICS_PER_PILLAR = 4;
const MINIMUM_ECONOMIC_COVERAGE = 0.5;
const CENTRAL_SCENARIO: Scenario = "central";
const REMEDIATION_EFFORT_METRIC_ID: MetricId = "C1";
const DEFAULT_CALCULATION_ASSUMPTIONS = [
  "MIURA es un framework metodológico preliminar y no está validado industrialmente.",
  "DS es un índice sintético de severidad relativa; no mide directamente horas, euros ni probabilidad de fallo.",
  "Los escenarios de fricción y PWC son proyecciones paramétricas bajo supuestos declarados, no contabilidad exacta ni predicción calibrada.",
  "La monetización fuerte requiere cobertura mínima Cov_j >= 0.50 en los tres pilares.",
] as const;

type CalculateMiuraEvaluationInput = {
  evaluation: Evaluation;
  project: Project;
};

type CalculateDebtSeverityInput = {
  CDI: number;
  DDI: number;
  PDI: number;
};

type CalculateFrictionScenariosInput = {
  DS: number;
  monthlyCapacityHours: number;
  horizonMonths: number;
  hourlyCost?: number;
  currency: string;
};

type CalculatePrincipalInput = {
  metricValues: readonly MetricValue[];
  hourlyCost?: number;
};

type CalculateBreakEvenInput = {
  principal?: number;
  scenarios: readonly ScenarioResult[];
  hourlyCost?: number;
};

type CoverageSummary = {
  coverageStatus: CoverageStatus;
  insufficientCoveragePillars: Pillar[];
};

type CalculateEconomicOutputAllowedInput = {
  coverageStatus: CoverageStatus;
  hourlyCost?: number;
};

type BreakEvenResult = NonNullable<CalculationResult["breakEven"]>;

type ResolvedMetricValue = {
  metricValue: MetricValue;
  normalizedValue: number;
};

function roundTo(value: number, fractionDigits: number) {
  return Number(value.toFixed(fractionDigits));
}

function isPositiveNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function zodIssuesToMessage(
  surface: string,
  issues: { path: PropertyKey[]; message: string }[],
) {
  const firstIssue = issues[0];

  if (firstIssue === undefined) {
    return `${surface} no es válido.`;
  }

  const path =
    firstIssue.path.length > 0 ? firstIssue.path.map(String).join(".") : "raíz";

  return `${surface} no es válido: ${path}: ${firstIssue.message}`;
}

function assertValidCalculationInput(input: CalculateMiuraEvaluationInput) {
  const projectResult = projectSchema.safeParse(input.project);

  if (!projectResult.success) {
    throw new Error(
      zodIssuesToMessage("El proyecto MIURA", projectResult.error.issues),
    );
  }

  const evaluationResult = evaluationSchema.safeParse(input.evaluation);

  if (!evaluationResult.success) {
    throw new Error(
      zodIssuesToMessage("La evaluación MIURA", evaluationResult.error.issues),
    );
  }

  if (evaluationResult.data.projectId !== projectResult.data.id) {
    throw new Error(
      "La evaluación MIURA referencia un proyecto distinto al usado para calcular.",
    );
  }

  return {
    evaluation: evaluationResult.data,
    project: projectResult.data,
  };
}

function metricWarningsPrefix(metricValue: MetricValue) {
  const metricDefinition = getMetricDefinition(metricValue.metricId);

  return `${metricValue.metricId} (${metricDefinition.name})`;
}

function resolveMetricValue(
  metricValue: MetricValue,
  warnings: string[],
): ResolvedMetricValue | undefined {
  if (!metricValue.available) {
    warnings.push(
      `${metricWarningsPrefix(metricValue)} está marcada como no disponible y no se imputa.`,
    );
    return undefined;
  }

  if (metricValue.normalizedValue !== undefined) {
    return {
      metricValue,
      normalizedValue: metricValue.normalizedValue,
    };
  }

  if (metricValue.simpleLevel !== undefined) {
    return {
      metricValue,
      normalizedValue: normalizeSimpleMetricValue(
        metricValue.metricId,
        metricValue.simpleLevel,
      ),
    };
  }

  warnings.push(
    `${metricWarningsPrefix(metricValue)} no tiene valor normalizado ni nivel simple; se excluye del índice.`,
  );

  return undefined;
}

function metricValuesById(
  metricValues: readonly MetricValue[],
  warnings: string[],
) {
  const valuesById = new Map<MetricId, MetricValue>();

  metricValues.forEach((metricValue) => {
    if (valuesById.has(metricValue.metricId)) {
      warnings.push(
        `${metricWarningsPrefix(metricValue)} aparece más de una vez; se usa el primer valor encontrado.`,
      );
      return;
    }

    valuesById.set(metricValue.metricId, metricValue);
  });

  return valuesById;
}

function calculatePillarResult(
  pillar: Pillar,
  valuesById: ReadonlyMap<MetricId, MetricValue>,
  warnings: string[],
): PillarResult {
  const resolvedValues = getMetricsByPillar(pillar).flatMap(
    (metricDefinition) => {
      const metricValue = valuesById.get(metricDefinition.id);

      if (metricValue === undefined) {
        warnings.push(
          `${metricDefinition.id} (${metricDefinition.name}) no tiene valor observado.`,
        );
        return [];
      }

      const resolvedMetricValue = resolveMetricValue(metricValue, warnings);

      return resolvedMetricValue === undefined ? [] : [resolvedMetricValue];
    },
  );

  const indexValue =
    resolvedValues.length === 0
      ? 0
      : roundTo(
          resolvedValues.reduce(
            (total, value) => total + value.normalizedValue,
            0,
          ) / resolvedValues.length,
          2,
        );

  return {
    pillar,
    indexValue,
    coverage: roundTo(resolvedValues.length / METRICS_PER_PILLAR, 2),
    dominantSignals: resolvedValues
      .filter((value) => value.normalizedValue >= 0.66)
      .map(
        (value) =>
          `${value.metricValue.metricId}: ${getMetricDefinition(value.metricValue.metricId).name}`,
      ),
  };
}

function calculateCoverageSummary(
  pillarResults: readonly PillarResult[],
): CoverageSummary {
  const insufficientCoveragePillars = PILLARS.filter((pillar) => {
    const pillarResult = pillarResults.find(
      (result) => result.pillar === pillar,
    );

    return (pillarResult?.coverage ?? 0) < MINIMUM_ECONOMIC_COVERAGE;
  });

  return {
    coverageStatus:
      insufficientCoveragePillars.length === 0 ? "sufficient" : "partial",
    insufficientCoveragePillars,
  };
}

function calculateEconomicOutputAllowed({
  coverageStatus,
  hourlyCost,
}: CalculateEconomicOutputAllowedInput) {
  return coverageStatus === "sufficient" && isPositiveNumber(hourlyCost);
}

function calculateDebtSeverity({ CDI, DDI, PDI }: CalculateDebtSeverityInput) {
  return roundTo(
    MIURA_DS_WEIGHTS.CDI * CDI +
      MIURA_DS_WEIGHTS.DDI * DDI +
      MIURA_DS_WEIGHTS.PDI * PDI,
    2,
  );
}

function calculateFrictionScenarios({
  DS,
  monthlyCapacityHours,
  horizonMonths,
  hourlyCost,
  currency,
}: CalculateFrictionScenariosInput): ScenarioResult[] {
  return MIURA_FRICTION_SCENARIOS.map(({ scenario, lambda }) => {
    const CF = roundTo(lambda * DS, 4);
    const lostHoursMonthly = roundTo(monthlyCapacityHours * CF, 2);
    const lostHoursTotal = roundTo(lostHoursMonthly * horizonMonths, 2);
    const baseScenario = {
      scenario,
      lambda,
      CF,
      lostHoursMonthly,
      lostHoursTotal,
      currency,
    } satisfies ScenarioResult;

    if (!isPositiveNumber(hourlyCost)) {
      return baseScenario;
    }

    return {
      ...baseScenario,
      PWC: roundTo(lostHoursTotal * hourlyCost, 2),
    } satisfies ScenarioResult;
  });
}

function calculatePrincipal({
  metricValues,
  hourlyCost,
}: CalculatePrincipalInput) {
  if (!isPositiveNumber(hourlyCost)) {
    return undefined;
  }

  const remediationEffort = metricValues.find(
    (metricValue) => metricValue.metricId === REMEDIATION_EFFORT_METRIC_ID,
  )?.advancedValue;

  if (!isPositiveNumber(remediationEffort)) {
    return undefined;
  }

  return roundTo(remediationEffort * hourlyCost, 2);
}

function calculateBreakEven({
  principal,
  scenarios,
  hourlyCost,
}: CalculateBreakEvenInput): BreakEvenResult | undefined {
  if (!isPositiveNumber(principal) || !isPositiveNumber(hourlyCost)) {
    return undefined;
  }

  const centralScenario = scenarios.find(
    (scenario) => scenario.scenario === CENTRAL_SCENARIO,
  );

  if (centralScenario === undefined || centralScenario.lostHoursMonthly <= 0) {
    return undefined;
  }

  const monthlyWasteCost = centralScenario.lostHoursMonthly * hourlyCost;

  if (monthlyWasteCost <= 0) {
    return undefined;
  }

  return {
    months: roundTo(principal / monthlyWasteCost, 1),
    assumptions: [
      "Estimación heurística con escenario central de fricción constante.",
      "Supone que la intervención reduce de forma significativa la fricción priorizada.",
    ],
  };
}

function pillarLabel(pillar: Pillar) {
  return MIURA_PILLARS.find(
    (pillarDefinition) => pillarDefinition.id === pillar,
  )?.label;
}

function coverageWarningText(
  pillarResults: readonly PillarResult[],
  insufficientCoveragePillars: readonly Pillar[],
) {
  const insufficientCoverageSummary = insufficientCoveragePillars
    .map((pillar) => {
      const coverage =
        pillarResults.find((pillarResult) => pillarResult.pillar === pillar)
          ?.coverage ?? 0;

      return `${pillarLabel(pillar) ?? pillar} (${coverage.toFixed(2)})`;
    })
    .join(", ");

  return `Diagnóstico parcial: cobertura insuficiente para monetización en ${insufficientCoverageSummary}. Se mantienen índices y capacidad perdida, pero se bloquean PWC, principal y break-even hasta mejorar evidencia.`;
}

function calculateMiuraEvaluation(
  input: CalculateMiuraEvaluationInput,
): CalculationResult {
  const { evaluation, project } = assertValidCalculationInput(input);
  const warnings: string[] = [];
  const valuesById = metricValuesById(evaluation.metricValues, warnings);
  const pillarResults = PILLARS.map((pillar) =>
    calculatePillarResult(pillar, valuesById, warnings),
  );
  const [codeResult, documentationResult, peopleResult] = pillarResults;
  const CDI = codeResult?.indexValue ?? 0;
  const DDI = documentationResult?.indexValue ?? 0;
  const PDI = peopleResult?.indexValue ?? 0;
  const DS = calculateDebtSeverity({ CDI, DDI, PDI });
  const coverageSummary = calculateCoverageSummary(pillarResults);
  const monetaryHourlyCost = isPositiveNumber(project.hourlyCost)
    ? project.hourlyCost
    : undefined;
  const economicOutputAllowed = calculateEconomicOutputAllowed({
    coverageStatus: coverageSummary.coverageStatus,
    hourlyCost: monetaryHourlyCost,
  });
  const scenarios = calculateFrictionScenarios({
    DS,
    monthlyCapacityHours: project.monthlyCapacityHours,
    horizonMonths: evaluation.horizonMonths,
    hourlyCost: economicOutputAllowed ? monetaryHourlyCost : undefined,
    currency: project.currency,
  });
  const principal = economicOutputAllowed
    ? calculatePrincipal({
        metricValues: evaluation.metricValues,
        hourlyCost: monetaryHourlyCost,
      })
    : undefined;
  const breakEven = economicOutputAllowed
    ? calculateBreakEven({
        principal,
        scenarios,
        hourlyCost: monetaryHourlyCost,
      })
    : undefined;

  if (coverageSummary.coverageStatus === "partial") {
    warnings.push(
      coverageWarningText(
        pillarResults,
        coverageSummary.insufficientCoveragePillars,
      ),
    );
  }

  if (monetaryHourlyCost === undefined) {
    warnings.push(
      "No se calcula PWC, principal ni break-even porque falta un coste hora positivo.",
    );
  } else if (
    coverageSummary.coverageStatus === "sufficient" &&
    principal === undefined
  ) {
    warnings.push(
      "No se calcula principal ni break-even porque C1 no incluye esfuerzo de remediación avanzado positivo.",
    );
  }

  return {
    evaluationId: evaluation.id,
    CDI,
    DDI,
    PDI,
    DS,
    coverage: {
      code_architecture: codeResult?.coverage ?? 0,
      documentation_knowledge: documentationResult?.coverage ?? 0,
      people_process: peopleResult?.coverage ?? 0,
    },
    coverageStatus: coverageSummary.coverageStatus,
    economicOutputAllowed,
    insufficientCoveragePillars: coverageSummary.insufficientCoveragePillars,
    pillarResults,
    scenarios,
    ...(principal === undefined ? {} : { principal }),
    ...(breakEven === undefined ? {} : { breakEven }),
    assumptions: [...DEFAULT_CALCULATION_ASSUMPTIONS],
    warnings,
  };
}

export {
  DEFAULT_CALCULATION_ASSUMPTIONS,
  MIURA_DS_WEIGHTS,
  MIURA_FRICTION_SCENARIOS,
  MINIMUM_ECONOMIC_COVERAGE,
  calculateBreakEven,
  calculateCoverageSummary,
  calculateDebtSeverity,
  calculateEconomicOutputAllowed,
  calculateFrictionScenarios,
  calculateMiuraEvaluation,
  calculatePrincipal,
  type BreakEvenResult,
  type CalculateBreakEvenInput,
  type CalculateDebtSeverityInput,
  type CalculateEconomicOutputAllowedInput,
  type CalculateFrictionScenariosInput,
  type CalculateMiuraEvaluationInput,
  type CalculatePrincipalInput,
  type CoverageSummary,
};
