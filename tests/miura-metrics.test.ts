import { describe, expect, test } from "vitest";

import {
  METRIC_IDS,
  PILLARS,
  SIMPLE_LEVELS,
  validateMiuraLocalExport,
  type Pillar,
} from "@/lib/miura/schemas";
import {
  MIURA_METRIC_DEFINITIONS,
  MIURA_PILLARS,
  SIMPLE_RUBRIC_VALUES,
  getMetricDefinition,
  getMetricsByPillar,
  metricIdsMatchSchema,
  normalizeSimpleMetricValue,
  pillarsMatchSchema,
  sampleMiuraLocalExport,
  sampleMiuraMetricValues,
  sampleMiuraReducedCaseExpectedResults,
  sampleMiuraReducedCaseObservedMetricIds,
} from "@/lib/miura/domain";

function average(values: number[]) {
  return Number(
    (values.reduce((total, value) => total + value, 0) / values.length).toFixed(
      2,
    ),
  );
}

function observedNormalizedValuesForPillar(pillar: Pillar) {
  return getMetricsByPillar(pillar).flatMap((metric) => {
    const value = sampleMiuraMetricValues.find(
      (metricValue) => metricValue.metricId === metric.id,
    );

    return value?.normalizedValue === undefined ? [] : [value.normalizedValue];
  });
}

describe("MIURA metric catalog", () => {
  test("defines exactly 12 active metrics in schema order and four metrics per pillar", () => {
    expect(MIURA_METRIC_DEFINITIONS).toHaveLength(12);
    expect(MIURA_METRIC_DEFINITIONS.map((metric) => metric.id)).toEqual([
      ...METRIC_IDS,
    ]);
    expect(metricIdsMatchSchema).toBe(true);

    expect(MIURA_PILLARS.map((pillar) => pillar.id)).toEqual([...PILLARS]);
    expect(pillarsMatchSchema).toBe(true);

    PILLARS.forEach((pillar) => {
      expect(getMetricsByPillar(pillar)).toHaveLength(4);
    });
  });

  test("keeps every metric UI-ready with help, risk direction, advanced guidance, and simple rubric copy", () => {
    MIURA_METRIC_DEFINITIONS.forEach((metric) => {
      expect(metric.active).toBe(true);
      expect(metric.name.trim()).not.toBe("");
      expect(metric.description.trim()).not.toBe("");
      expect(metric.helpText.trim()).not.toBe("");
      expect(metric.methodologicalCaveat).toMatch(/preliminar/i);
      expect(["higher_is_worse", "higher_is_better"]).toContain(
        metric.riskDirection,
      );

      expect(Object.keys(metric.simpleRubric).sort()).toEqual(
        [...SIMPLE_LEVELS].sort(),
      );

      SIMPLE_LEVELS.forEach((level) => {
        expect(metric.simpleRubric[level].value).toBe(
          SIMPLE_RUBRIC_VALUES[level],
        );
        expect(metric.simpleRubric[level].label.trim()).not.toBe("");
        expect(metric.simpleRubric[level].description.trim()).not.toBe("");
      });

      expect(metric.advancedInput.unit.trim()).not.toBe("");
      expect(metric.advancedInput.source.trim()).not.toBe("");
      expect(metric.advancedInput.timeWindow.trim()).not.toBe("");
      expect(metric.advancedInput.guidance.trim()).not.toBe("");
    });
  });

  test("declares only D1, D2, and P4 as protective inverse metrics", () => {
    const protectiveMetricIds = MIURA_METRIC_DEFINITIONS.filter(
      (metric) => metric.riskDirection === "higher_is_better",
    ).map((metric) => metric.id);

    expect(protectiveMetricIds).toEqual(["D1", "D2", "P4"]);
  });

  test("normalizes simple rubric levels for standard and protective metrics", () => {
    expect(normalizeSimpleMetricValue("C1", "low")).toBe(0.2);
    expect(normalizeSimpleMetricValue("C1", "medium")).toBe(0.5);
    expect(normalizeSimpleMetricValue("C1", "high")).toBe(0.8);

    expect(normalizeSimpleMetricValue("D1", "low")).toBe(0.8);
    expect(normalizeSimpleMetricValue("D1", "medium")).toBe(0.5);
    expect(normalizeSimpleMetricValue("D1", "high")).toBe(0.2);

    expect(normalizeSimpleMetricValue("P4", "low")).toBe(0.8);
    expect(normalizeSimpleMetricValue("P4", "medium")).toBe(0.5);
    expect(normalizeSimpleMetricValue("P4", "high")).toBe(0.2);
  });

  test("returns typed metric definitions by ID for downstream UI rendering", () => {
    expect(getMetricDefinition("C1").name).toBe(
      "Esfuerzo de remediación observable",
    );
    expect(getMetricDefinition("P4").helpText).toMatch(/protectora/i);
  });
});

describe("MIURA sample evaluation fixture", () => {
  test("is compatible with the local export Zod contract", () => {
    const result = validateMiuraLocalExport(sampleMiuraLocalExport);

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.projects[0]?.monthlyCapacityHours).toBe(840);
    expect(result.data.projects[0]?.hourlyCost).toBe(42);
    expect(result.data.evaluations[0]?.horizonMonths).toBe(12);
    expect(result.data.evaluations[0]?.metricValues).toHaveLength(9);
  });

  test("uses the reduced TFG case inputs expected by the future calculation engine", () => {
    expect(
      sampleMiuraMetricValues.map((metricValue) => metricValue.metricId),
    ).toEqual([...sampleMiuraReducedCaseObservedMetricIds]);

    expect(
      average(observedNormalizedValuesForPillar("code_architecture")),
    ).toBe(sampleMiuraReducedCaseExpectedResults.CDI);
    expect(
      average(observedNormalizedValuesForPillar("documentation_knowledge")),
    ).toBe(sampleMiuraReducedCaseExpectedResults.DDI);
    expect(average(observedNormalizedValuesForPillar("people_process"))).toBe(
      sampleMiuraReducedCaseExpectedResults.PDI,
    );

    const p4Value = sampleMiuraMetricValues.find(
      (metricValue) => metricValue.metricId === "P4",
    );

    expect(p4Value?.simpleLevel).toBe("low");
    expect(p4Value?.normalizedValue).toBe(0.8);
    expect(sampleMiuraReducedCaseExpectedResults.DS).toBe(0.71);
    expect(sampleMiuraReducedCaseExpectedResults.remediationEffortHours).toBe(
      520,
    );
  });
});
