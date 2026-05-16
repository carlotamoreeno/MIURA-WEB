import { describe, expect, test } from "vitest";

import {
  calculateBreakEven,
  calculateDebtSeverity,
  calculateFrictionScenarios,
  calculateMiuraEvaluation,
  calculatePrincipal,
  sampleMiuraLocalExport,
  sampleMiuraReducedCaseExpectedResults,
} from "@/lib/miura/domain";
import {
  calculationResultSchema,
  type Evaluation,
  type MetricValue,
  type Project,
} from "@/lib/miura/schemas";

const sampleProject = sampleMiuraLocalExport.projects[0];
const sampleEvaluation = sampleMiuraLocalExport.evaluations[0];

if (sampleProject === undefined || sampleEvaluation === undefined) {
  throw new Error(
    "The MIURA sample fixture must include one project and one evaluation.",
  );
}

function replaceMetricValue(
  evaluation: Evaluation,
  metricId: MetricValue["metricId"],
  updater: (metricValue: MetricValue) => MetricValue,
): Evaluation {
  return {
    ...evaluation,
    metricValues: evaluation.metricValues.map((metricValue) =>
      metricValue.metricId === metricId ? updater(metricValue) : metricValue,
    ),
  };
}

describe("MIURA calculation engine", () => {
  test("calculates pillar indexes and DS for the reduced reproducible fixture", () => {
    const result = calculateMiuraEvaluation({
      evaluation: sampleEvaluation,
      project: sampleProject,
    });

    expect(result.CDI).toBe(sampleMiuraReducedCaseExpectedResults.CDI);
    expect(result.DDI).toBe(sampleMiuraReducedCaseExpectedResults.DDI);
    expect(result.PDI).toBe(sampleMiuraReducedCaseExpectedResults.PDI);
    expect(result.DS).toBe(sampleMiuraReducedCaseExpectedResults.DS);
    expect(result.coverage).toEqual({
      code_architecture: 0.75,
      documentation_knowledge: 0.75,
      people_process: 0.75,
    });
    expect(calculationResultSchema.safeParse(result).success).toBe(true);
  });

  test("calculates DS with MIURA weights", () => {
    expect(
      calculateDebtSeverity({
        CDI: 0.7,
        DDI: 0.6,
        PDI: 0.8,
      }),
    ).toBe(0.71);
  });

  test("calculates friction, lost capacity and projected waste cost by scenario", () => {
    const scenarios = calculateFrictionScenarios({
      DS: sampleMiuraReducedCaseExpectedResults.DS,
      monthlyCapacityHours: sampleProject.monthlyCapacityHours,
      horizonMonths: sampleEvaluation.horizonMonths,
      hourlyCost: sampleProject.hourlyCost,
      currency: sampleProject.currency,
    });

    expect(scenarios).toEqual([
      {
        scenario: "conservative",
        lambda: 0.15,
        CF: 0.1065,
        lostHoursMonthly: 89.46,
        lostHoursTotal: 1073.52,
        PWC: 45087.84,
        currency: "EUR",
      },
      {
        scenario: "central",
        lambda: 0.25,
        CF: 0.1775,
        lostHoursMonthly: 149.1,
        lostHoursTotal: 1789.2,
        PWC: 75146.4,
        currency: "EUR",
      },
      {
        scenario: "tensioned",
        lambda: 0.35,
        CF: 0.2485,
        lostHoursMonthly: 208.74,
        lostHoursTotal: 2504.88,
        PWC: 105204.96,
        currency: "EUR",
      },
    ]);
  });

  test("calculates principal and central break-even from remediation effort", () => {
    const scenarios = calculateFrictionScenarios({
      DS: sampleMiuraReducedCaseExpectedResults.DS,
      monthlyCapacityHours: sampleProject.monthlyCapacityHours,
      horizonMonths: sampleEvaluation.horizonMonths,
      hourlyCost: sampleProject.hourlyCost,
      currency: sampleProject.currency,
    });
    const principal = calculatePrincipal({
      metricValues: sampleEvaluation.metricValues,
      hourlyCost: sampleProject.hourlyCost,
    });
    const breakEven = calculateBreakEven({
      principal,
      scenarios,
      hourlyCost: sampleProject.hourlyCost,
    });

    expect(principal).toBe(21840);
    expect(breakEven?.months).toBe(3.5);
    expect(breakEven?.assumptions.join(" ")).toMatch(/heurística|central/i);
  });

  test("renormalizes over observed metrics and reduces coverage for unavailable values", () => {
    const partialEvaluation = replaceMetricValue(
      sampleEvaluation,
      "C3",
      (metricValue) => ({
        ...metricValue,
        available: false,
      }),
    );

    const result = calculateMiuraEvaluation({
      evaluation: partialEvaluation,
      project: sampleProject,
    });

    expect(result.CDI).toBe(0.8);
    expect(result.coverage.code_architecture).toBe(0.5);
    expect(result.warnings.join(" ")).toMatch(/C3 .*no disponible/i);
  });

  test("normalizes protective simple metrics inversely during calculation", () => {
    const fallbackEvaluation = replaceMetricValue(
      sampleEvaluation,
      "P4",
      (metricValue) => ({
        ...metricValue,
        normalizedValue: undefined,
      }),
    );

    const result = calculateMiuraEvaluation({
      evaluation: fallbackEvaluation,
      project: sampleProject,
    });

    expect(result.PDI).toBe(0.8);
  });

  test("omits euros, principal and break-even without a positive hourly cost", () => {
    const projectWithoutHourlyCost = {
      ...sampleProject,
      hourlyCost: undefined,
    } satisfies Project;

    const result = calculateMiuraEvaluation({
      evaluation: sampleEvaluation,
      project: projectWithoutHourlyCost,
    });

    expect(
      result.scenarios.every((scenario) => scenario.PWC === undefined),
    ).toBe(true);
    expect(result.principal).toBeUndefined();
    expect(result.breakEven).toBeUndefined();
    expect(result.warnings.join(" ")).toMatch(/coste hora positivo/i);
  });

  test("throws before calculation when project or evaluation input violates Zod contracts", () => {
    expect(() =>
      calculateMiuraEvaluation({
        evaluation: sampleEvaluation,
        project: {
          ...sampleProject,
          monthlyCapacityHours: 0,
        },
      }),
    ).toThrow(/proyecto MIURA.*monthlyCapacityHours/i);
  });

  test("calculates a standard evaluation under the 100ms performance target", () => {
    const startedAt = performance.now();

    calculateMiuraEvaluation({
      evaluation: sampleEvaluation,
      project: sampleProject,
    });

    const durationMs = performance.now() - startedAt;

    expect(durationMs).toBeLessThan(100);
  });
});
