import { describe, expect, test } from "vitest";

import {
  buildEvaluationFromMetricWizardInputs,
  buildMetricValuesFromWizardInputs,
  buildMetricWizardInputs,
  createDraftMiuraEvaluation,
  summarizeMetricWizardInputs,
  type MetricWizardInput,
} from "@/lib/miura/domain";
import {
  METRIC_IDS,
  metricValueSchema,
  type Evaluation,
  type MetricId,
  type SimpleLevel,
} from "@/lib/miura/schemas";

const validFormInput = {
  workspaceName: "Organización demo",
  projectName: "Portal operativo",
  projectDescription: "",
  methodology: "Scrum/Kanban",
  monthlyCapacityHours: "840",
  hourlyCost: "",
  horizonMonths: "12",
};

function createDraftEvaluationFixture(): Evaluation {
  const result = createDraftMiuraEvaluation({
    formInput: validFormInput,
    idSeed: "wizard-seed",
    now: "2026-05-16T12:00:00.000Z",
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.data.evaluation;
}

function updateMetricInput(
  inputs: MetricWizardInput[],
  metricId: MetricId,
  patch: Partial<MetricWizardInput>,
) {
  return inputs.map((input) =>
    input.metricId === metricId ? { ...input, ...patch } : input,
  );
}

function answerAllWithLevel(inputs: MetricWizardInput[], level: SimpleLevel) {
  return inputs.map((input) => ({
    ...input,
    simpleLevel: level,
  }));
}

describe("MIURA metric wizard helpers", () => {
  test("initializes the 12 metric inputs from the catalog order", () => {
    const evaluation = createDraftEvaluationFixture();
    const inputs = buildMetricWizardInputs(evaluation);

    expect(inputs).toHaveLength(12);
    expect(inputs.map((input) => input.metricId)).toEqual([...METRIC_IDS]);
    expect(inputs.every((input) => input.available)).toBe(true);
    expect(inputs.every((input) => input.entryMode === "simple")).toBe(true);
  });

  test("serializes simple metric values as schema-valid stored records", () => {
    const evaluation = createDraftEvaluationFixture();
    const inputs = updateMetricInput(
      buildMetricWizardInputs(evaluation),
      "C1",
      {
        simpleLevel: "high",
      },
    );

    const result = buildMetricValuesFromWizardInputs({
      evaluationId: evaluation.id,
      inputs,
      requiredMetricIds: ["C1"],
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.metricValues).toHaveLength(1);
    expect(
      metricValueSchema.safeParse(result.data.metricValues[0]).success,
    ).toBe(true);
    expect(result.data.metricValues[0]).toMatchObject({
      metricId: "C1",
      simpleLevel: "high",
      available: true,
      normalizedValue: 0.8,
    });
  });

  test("requires value plus unit in advanced mode and keeps the MIURA interpretation", () => {
    const evaluation = createDraftEvaluationFixture();
    const missingUnitInputs = updateMetricInput(
      buildMetricWizardInputs(evaluation),
      "C1",
      {
        entryMode: "advanced",
        simpleLevel: "medium",
        advancedValue: "120",
        unit: "",
      },
    );

    const invalidResult = buildMetricValuesFromWizardInputs({
      evaluationId: evaluation.id,
      inputs: missingUnitInputs,
      requiredMetricIds: ["C1"],
    });

    expect(invalidResult.success).toBe(false);

    if (invalidResult.success) {
      throw new Error("Expected missing advanced unit to fail.");
    }

    expect(invalidResult.metricErrors.C1?.unit).toMatch(/unidad/i);

    const validInputs = updateMetricInput(missingUnitInputs, "C1", {
      unit: "horas estimadas",
      source: "Backlog técnico",
      timeWindow: "Trimestre actual",
      evidenceNote: "Estimación revisada por el equipo.",
    });
    const validResult = buildMetricValuesFromWizardInputs({
      evaluationId: evaluation.id,
      inputs: validInputs,
      requiredMetricIds: ["C1"],
    });

    expect(validResult.success).toBe(true);

    if (!validResult.success) {
      throw new Error(validResult.message);
    }

    expect(validResult.data.metricValues[0]).toMatchObject({
      metricId: "C1",
      simpleLevel: "medium",
      advancedValue: 120,
      unit: "horas estimadas",
      source: "Backlog técnico",
      timeWindow: "Trimestre actual",
      evidenceNote: "Estimación revisada por el equipo.",
      normalizedValue: 0.5,
    });
  });

  test("counts unavailable metrics as answered while reducing coverage", () => {
    const evaluation = createDraftEvaluationFixture();
    const inputs = updateMetricInput(
      updateMetricInput(buildMetricWizardInputs(evaluation), "C1", {
        simpleLevel: "high",
      }),
      "C2",
      {
        available: false,
      },
    );

    const summary = summarizeMetricWizardInputs(inputs);
    const codeProgress = summary.byPillar.find(
      (progress) => progress.pillar === "code_architecture",
    );

    expect(codeProgress).toMatchObject({
      answered: 2,
      available: 1,
      unavailable: 1,
      incomplete: 2,
      coverage: 0.25,
      completion: 0.5,
    });
  });

  test("keeps protective metrics normalized inversely through the catalog", () => {
    const evaluation = createDraftEvaluationFixture();
    const inputs = updateMetricInput(
      buildMetricWizardInputs(evaluation),
      "D1",
      {
        simpleLevel: "high",
      },
    );

    const result = buildMetricValuesFromWizardInputs({
      evaluationId: evaluation.id,
      inputs,
      requiredMetricIds: ["D1"],
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.metricValues[0]).toMatchObject({
      metricId: "D1",
      simpleLevel: "high",
      normalizedValue: 0.2,
    });
  });

  test("marks the evaluation ready for scorecard after all metrics are answered or unavailable", () => {
    const evaluation = createDraftEvaluationFixture();
    const inputs = updateMetricInput(
      answerAllWithLevel(buildMetricWizardInputs(evaluation), "medium"),
      "C4",
      {
        available: false,
        simpleLevel: undefined,
      },
    );

    const result = buildEvaluationFromMetricWizardInputs({
      evaluation,
      inputs,
      requiredMetricIds: METRIC_IDS,
      now: "2026-05-16T13:00:00.000Z",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.evaluation.status).toBe("ready_for_scorecard");
    expect(result.data.evaluation.metricValues).toHaveLength(12);
    expect(
      result.data.evaluation.metricValues.find(
        (metric) => metric.metricId === "C4",
      ),
    ).toMatchObject({
      available: false,
    });
  });
});
