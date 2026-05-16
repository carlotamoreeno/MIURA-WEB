import {
  METRIC_IDS,
  PILLARS,
  metricValueSchema,
  type Evaluation,
  type MetricId,
  type MetricValue,
  type Pillar,
  type SimpleLevel,
} from "@/lib/miura/schemas";

import {
  getMetricDefinition,
  getMetricsByPillar,
  normalizeSimpleMetricValue,
} from "./metrics";

type MetricWizardEntryMode = "simple" | "advanced";

type MetricWizardInput = {
  metricId: MetricId;
  available: boolean;
  entryMode: MetricWizardEntryMode;
  simpleLevel?: SimpleLevel;
  advancedValue: string;
  unit: string;
  source: string;
  timeWindow: string;
  evidenceNote: string;
};

type MetricWizardField =
  | "simpleLevel"
  | "advancedValue"
  | "unit"
  | "source"
  | "timeWindow"
  | "evidenceNote";

type MetricWizardFieldErrors = Partial<Record<MetricWizardField, string>>;
type MetricWizardMetricErrors = Partial<
  Record<MetricId, MetricWizardFieldErrors>
>;

type MetricWizardValidationFailure = {
  success: false;
  message: string;
  metricErrors: MetricWizardMetricErrors;
};

type MetricWizardMetricValuesSuccess = {
  success: true;
  data: {
    metricValues: MetricValue[];
  };
};

type MetricWizardMetricValuesResult =
  | MetricWizardMetricValuesSuccess
  | MetricWizardValidationFailure;

type MetricWizardEvaluationSuccess = {
  success: true;
  data: {
    evaluation: Evaluation;
    metricValues: MetricValue[];
  };
};

type MetricWizardEvaluationResult =
  | MetricWizardEvaluationSuccess
  | MetricWizardValidationFailure;

type MetricWizardPillarProgress = {
  pillar: Pillar;
  answered: number;
  available: number;
  unavailable: number;
  incomplete: number;
  coverage: number;
  completion: number;
};

type MetricWizardProgressSummary = {
  totalAnswered: number;
  totalAvailable: number;
  totalUnavailable: number;
  totalIncomplete: number;
  completion: number;
  byPillar: MetricWizardPillarProgress[];
};

type BuildMetricValuesInput = {
  evaluationId: string;
  inputs: readonly MetricWizardInput[];
  requiredMetricIds?: readonly MetricId[];
};

type BuildEvaluationInput = {
  evaluation: Evaluation;
  inputs: readonly MetricWizardInput[];
  requiredMetricIds?: readonly MetricId[];
  now?: string;
};

const METRICS_PER_PILLAR = 4;
const TOTAL_METRICS = METRIC_IDS.length;

function roundTo(value: number, fractionDigits: number) {
  return Number(value.toFixed(fractionDigits));
}

function metricValueId(evaluationId: string, metricId: MetricId) {
  return `metric-value-${evaluationId}-${metricId.toLowerCase()}`;
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

function parseAdvancedNumber(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      success: false as const,
      message: "El valor avanzado es obligatorio en modo avanzado.",
    };
  }

  const parsed = Number(trimmed.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return {
      success: false as const,
      message: "El valor avanzado debe ser un número no negativo.",
    };
  }

  return {
    success: true as const,
    value: parsed,
  };
}

function createEmptyMetricWizardInput(metricId: MetricId): MetricWizardInput {
  return {
    metricId,
    available: true,
    entryMode: "simple",
    advancedValue: "",
    unit: "",
    source: "",
    timeWindow: "",
    evidenceNote: "",
  };
}

function metricValueToWizardInput(metricValue: MetricValue): MetricWizardInput {
  return {
    metricId: metricValue.metricId,
    available: metricValue.available,
    entryMode:
      metricValue.advancedValue !== undefined || metricValue.unit !== undefined
        ? "advanced"
        : "simple",
    simpleLevel: metricValue.simpleLevel,
    advancedValue: metricValue.advancedValue?.toString() ?? "",
    unit: metricValue.unit ?? "",
    source: metricValue.source ?? "",
    timeWindow: metricValue.timeWindow ?? "",
    evidenceNote: metricValue.evidenceNote ?? "",
  };
}

function buildMetricWizardInputs(evaluation: Evaluation): MetricWizardInput[] {
  const metricValuesById = new Map(
    evaluation.metricValues.map((metricValue) => [
      metricValue.metricId,
      metricValue,
    ]),
  );

  return METRIC_IDS.map((metricId) => {
    const existingMetricValue = metricValuesById.get(metricId);

    return existingMetricValue === undefined
      ? createEmptyMetricWizardInput(metricId)
      : metricValueToWizardInput(existingMetricValue);
  });
}

function hasAdvancedDraft(input: MetricWizardInput) {
  return (
    input.advancedValue.trim().length > 0 ||
    input.unit.trim().length > 0 ||
    input.source.trim().length > 0 ||
    input.timeWindow.trim().length > 0 ||
    input.evidenceNote.trim().length > 0
  );
}

function isMetricAnswered(input: MetricWizardInput) {
  if (!input.available) return true;
  if (input.simpleLevel === undefined) return false;

  if (input.entryMode === "simple") return true;

  return (
    parseAdvancedNumber(input.advancedValue).success &&
    input.unit.trim().length > 0
  );
}

function isMetricAvailableForCoverage(input: MetricWizardInput) {
  return input.available && isMetricAnswered(input);
}

function zodIssuesToMetricErrors(
  issues: { path: PropertyKey[]; message: string }[],
) {
  const errors: MetricWizardFieldErrors = {};

  issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field !== "string") return;
    if (
      field !== "simpleLevel" &&
      field !== "advancedValue" &&
      field !== "unit" &&
      field !== "source" &&
      field !== "timeWindow" &&
      field !== "evidenceNote"
    ) {
      return;
    }

    errors[field] ??= issue.message;
  });

  return errors;
}

function metricInputToMetricValue({
  evaluationId,
  input,
  required,
}: {
  evaluationId: string;
  input: MetricWizardInput;
  required: boolean;
}) {
  const errors: MetricWizardFieldErrors = {};
  const shouldValidateIncomplete =
    required || input.entryMode === "advanced" || hasAdvancedDraft(input);

  if (!input.available) {
    const parsedMetricValue = metricValueSchema.safeParse({
      id: metricValueId(evaluationId, input.metricId),
      evaluationId,
      metricId: input.metricId,
      available: false,
    });

    if (!parsedMetricValue.success) {
      return {
        success: false as const,
        errors: zodIssuesToMetricErrors(parsedMetricValue.error.issues),
      };
    }

    return {
      success: true as const,
      metricValue: parsedMetricValue.data,
    };
  }

  if (input.simpleLevel === undefined) {
    if (!shouldValidateIncomplete) {
      return {
        success: true as const,
        metricValue: undefined,
      };
    }

    errors.simpleLevel =
      "Selecciona bajo, medio o alto, o marca la métrica como no disponible.";
  }

  const normalizedValue =
    input.simpleLevel === undefined
      ? undefined
      : normalizeSimpleMetricValue(input.metricId, input.simpleLevel);

  const metricValueCandidate: Record<string, unknown> = {
    id: metricValueId(evaluationId, input.metricId),
    evaluationId,
    metricId: input.metricId,
    available: true,
    ...(input.simpleLevel === undefined
      ? {}
      : { simpleLevel: input.simpleLevel, normalizedValue }),
  };

  if (input.entryMode === "advanced") {
    const parsedAdvancedValue = parseAdvancedNumber(input.advancedValue);

    if (!parsedAdvancedValue.success) {
      errors.advancedValue = parsedAdvancedValue.message;
    } else {
      metricValueCandidate.advancedValue = parsedAdvancedValue.value;
    }

    const unit = cleanOptionalText(input.unit);

    if (unit === undefined) {
      errors.unit = "La unidad es obligatoria en modo avanzado.";
    } else {
      metricValueCandidate.unit = unit;
    }

    const source = cleanOptionalText(input.source);
    const timeWindow = cleanOptionalText(input.timeWindow);
    const evidenceNote = cleanOptionalText(input.evidenceNote);

    if (source !== undefined) metricValueCandidate.source = source;
    if (timeWindow !== undefined) metricValueCandidate.timeWindow = timeWindow;
    if (evidenceNote !== undefined) {
      metricValueCandidate.evidenceNote = evidenceNote;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false as const,
      errors,
    };
  }

  const parsedMetricValue = metricValueSchema.safeParse(metricValueCandidate);

  if (!parsedMetricValue.success) {
    return {
      success: false as const,
      errors: zodIssuesToMetricErrors(parsedMetricValue.error.issues),
    };
  }

  return {
    success: true as const,
    metricValue: parsedMetricValue.data,
  };
}

function buildMetricValuesFromWizardInputs({
  evaluationId,
  inputs,
  requiredMetricIds = [],
}: BuildMetricValuesInput): MetricWizardMetricValuesResult {
  const requiredMetrics = new Set(requiredMetricIds);
  const metricValues: MetricValue[] = [];
  const metricErrors: MetricWizardMetricErrors = {};

  METRIC_IDS.forEach((metricId) => {
    const input =
      inputs.find((candidate) => candidate.metricId === metricId) ??
      createEmptyMetricWizardInput(metricId);
    const result = metricInputToMetricValue({
      evaluationId,
      input,
      required: requiredMetrics.has(metricId),
    });

    if (!result.success) {
      metricErrors[metricId] = result.errors;
      return;
    }

    if (result.metricValue !== undefined) {
      metricValues.push(result.metricValue);
    }
  });

  if (Object.keys(metricErrors).length > 0) {
    return {
      success: false,
      message:
        "Revisa las métricas marcadas antes de guardar este paso del wizard.",
      metricErrors,
    };
  }

  return {
    success: true,
    data: {
      metricValues,
    },
  };
}

function buildEvaluationFromMetricWizardInputs({
  evaluation,
  inputs,
  requiredMetricIds = [],
  now = new Date().toISOString(),
}: BuildEvaluationInput): MetricWizardEvaluationResult {
  const result = buildMetricValuesFromWizardInputs({
    evaluationId: evaluation.id,
    inputs,
    requiredMetricIds,
  });

  if (!result.success) return result;

  const metricValues = result.data.metricValues;
  const status =
    metricValues.length === TOTAL_METRICS
      ? "ready_for_scorecard"
      : metricValues.length > 0
        ? "in_progress"
        : "draft";

  return {
    success: true,
    data: {
      metricValues,
      evaluation: {
        id: evaluation.id,
        projectId: evaluation.projectId,
        name: evaluation.name,
        status,
        horizonMonths: evaluation.horizonMonths,
        metricValues,
        createdAt: evaluation.createdAt,
        updatedAt: now,
      },
    },
  };
}

function summarizeMetricWizardInputs(
  inputs: readonly MetricWizardInput[],
): MetricWizardProgressSummary {
  const inputsById = new Map(inputs.map((input) => [input.metricId, input]));
  const byPillar = PILLARS.map((pillar) => {
    const pillarInputs = getMetricsByPillar(pillar).map(
      (metric) =>
        inputsById.get(metric.id) ?? createEmptyMetricWizardInput(metric.id),
    );
    const answered = pillarInputs.filter(isMetricAnswered).length;
    const available = pillarInputs.filter(isMetricAvailableForCoverage).length;
    const unavailable = pillarInputs.filter((input) => !input.available).length;
    const incomplete = METRICS_PER_PILLAR - answered;

    return {
      pillar,
      answered,
      available,
      unavailable,
      incomplete,
      coverage: roundTo(available / METRICS_PER_PILLAR, 2),
      completion: roundTo(answered / METRICS_PER_PILLAR, 2),
    } satisfies MetricWizardPillarProgress;
  });
  const totalAnswered = byPillar.reduce(
    (total, pillar) => total + pillar.answered,
    0,
  );
  const totalAvailable = byPillar.reduce(
    (total, pillar) => total + pillar.available,
    0,
  );
  const totalUnavailable = byPillar.reduce(
    (total, pillar) => total + pillar.unavailable,
    0,
  );

  return {
    totalAnswered,
    totalAvailable,
    totalUnavailable,
    totalIncomplete: TOTAL_METRICS - totalAnswered,
    completion: roundTo(totalAnswered / TOTAL_METRICS, 2),
    byPillar,
  };
}

function metricWizardPillarProgress(
  summary: MetricWizardProgressSummary,
  pillar: Pillar,
) {
  return summary.byPillar.find((progress) => progress.pillar === pillar);
}

function requiredMetricIdsForPillar(pillar: Pillar) {
  return getMetricsByPillar(pillar).map((metric) => metric.id);
}

function metricHelpSummary(metricId: MetricId) {
  const metric = getMetricDefinition(metricId);

  return `${metric.helpText} ${metric.methodologicalCaveat}`;
}

export {
  TOTAL_METRICS,
  buildEvaluationFromMetricWizardInputs,
  buildMetricValuesFromWizardInputs,
  buildMetricWizardInputs,
  createEmptyMetricWizardInput,
  metricHelpSummary,
  metricWizardPillarProgress,
  requiredMetricIdsForPillar,
  summarizeMetricWizardInputs,
  type MetricWizardEntryMode,
  type MetricWizardField,
  type MetricWizardFieldErrors,
  type MetricWizardInput,
  type MetricWizardMetricErrors,
  type MetricWizardProgressSummary,
};
