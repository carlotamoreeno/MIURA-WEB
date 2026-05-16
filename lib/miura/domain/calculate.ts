import {
  PILLARS,
  type CalculationResult,
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
const CENTRAL_SCENARIO: Scenario = "central";
const REMEDIATION_EFFORT_METRIC_ID: MetricId = "C1";

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
  const scenarios = calculateFrictionScenarios({
    DS,
    monthlyCapacityHours: project.monthlyCapacityHours,
    horizonMonths: evaluation.horizonMonths,
    hourlyCost: project.hourlyCost,
    currency: project.currency,
  });
  const principal = calculatePrincipal({
    metricValues: evaluation.metricValues,
    hourlyCost: project.hourlyCost,
  });
  const breakEven = calculateBreakEven({
    principal,
    scenarios,
    hourlyCost: project.hourlyCost,
  });

  if (!isPositiveNumber(project.hourlyCost)) {
    warnings.push(
      "No se calcula PWC, principal ni break-even porque falta un coste hora positivo.",
    );
  } else if (principal === undefined) {
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
    pillarResults,
    scenarios,
    ...(principal === undefined ? {} : { principal }),
    ...(breakEven === undefined ? {} : { breakEven }),
    warnings,
  };
}

export {
  MIURA_DS_WEIGHTS,
  MIURA_FRICTION_SCENARIOS,
  calculateBreakEven,
  calculateDebtSeverity,
  calculateFrictionScenarios,
  calculateMiuraEvaluation,
  calculatePrincipal,
  type BreakEvenResult,
  type CalculateBreakEvenInput,
  type CalculateDebtSeverityInput,
  type CalculateFrictionScenariosInput,
  type CalculateMiuraEvaluationInput,
  type CalculatePrincipalInput,
};
