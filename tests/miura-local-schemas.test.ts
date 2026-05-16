import { describe, expect, test } from "vitest";

import {
  CURRENT_LOCAL_SCHEMA_VERSION,
  parseMiuraLocalExportJson,
  serializeMiuraLocalExport,
  validateMiuraLocalExport,
} from "@/lib/miura/schemas";

const timestamp = "2026-05-16T10:00:00.000Z";

type LocalExportFixture = {
  schemaVersion: number;
  exportedAt: string;
  workspaces: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  evaluations: Array<
    Record<string, unknown> & {
      metricValues: Array<Record<string, unknown>>;
      calculationResult?: Record<string, unknown>;
      recommendationSet?: Record<string, unknown>;
    }
  >;
};

function createValidLocalExport(): LocalExportFixture {
  return {
    schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
    exportedAt: timestamp,
    workspaces: [
      {
        id: "workspace-demo",
        name: "Organización demo",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    projects: [
      {
        id: "project-demo",
        workspaceId: "workspace-demo",
        name: "Portal interno",
        methodology: "Scrum",
        monthlyCapacityHours: 640,
        currency: "EUR",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    evaluations: [
      {
        id: "evaluation-demo",
        projectId: "project-demo",
        name: "Diagnóstico inicial",
        status: "draft",
        horizonMonths: 6,
        metricValues: [
          {
            id: "metric-value-c1",
            evaluationId: "evaluation-demo",
            metricId: "C1",
            simpleLevel: "medium",
            available: true,
            normalizedValue: 0.5,
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

function expectFailure(result: ReturnType<typeof validateMiuraLocalExport>) {
  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error("Expected schema validation to fail.");
  }

  return result;
}

describe("MIURA local data schemas", () => {
  test("validates a minimal Workspace -> Project -> Evaluation export", () => {
    const result = validateMiuraLocalExport(createValidLocalExport());

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(result.data.schemaVersion).toBe(CURRENT_LOCAL_SCHEMA_VERSION);
    expect(result.data.workspaces[0]?.name).toBe("Organización demo");
    expect(result.data.projects[0]?.workspaceId).toBe("workspace-demo");
    expect(result.data.evaluations[0]?.metricValues).toHaveLength(1);
  });

  test("parses and serializes valid local export JSON after validation", () => {
    const serialized = serializeMiuraLocalExport(createValidLocalExport());

    expect(serialized.success).toBe(true);

    if (!serialized.success) {
      throw new Error(serialized.message);
    }

    const parsed = parseMiuraLocalExportJson(serialized.data);

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    expect(parsed.data.evaluations[0]?.id).toBe("evaluation-demo");
  });

  test("returns a useful Spanish message for invalid JSON", () => {
    const result = parseMiuraLocalExportJson("{not-json");

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected JSON parsing to fail.");
    }

    expect(result.message).toMatch(/no es JSON válido/i);
    expect(result.issues[0]?.path).toBe("raíz");
  });

  test("fails clearly for unsupported schema versions", () => {
    const result = expectFailure(
      validateMiuraLocalExport({
        ...createValidLocalExport(),
        schemaVersion: 999,
      }),
    );

    expect(result.message).toMatch(/versión de datos 999 no está soportada/i);
    expect(result.issues[0]?.path).toBe("schemaVersion");
  });

  test("rejects unknown keys on strict stored objects", () => {
    const result = expectFailure(
      validateMiuraLocalExport({
        ...createValidLocalExport(),
        unexpected: true,
      }),
    );

    expect(result.message).toMatch(/JSON de MIURA no es válido/i);
    expect(result.issues[0]?.path).toBe("raíz");
  });

  test("rejects invalid metric IDs, empty names, invalid dates, and out-of-range normalized values", () => {
    const exportData = createValidLocalExport();
    exportData.exportedAt = "not-a-date";
    exportData.workspaces[0].name = " ";
    exportData.evaluations[0].metricValues[0].metricId = "C5";
    exportData.evaluations[0].metricValues[0].normalizedValue = 1.2;

    const result = expectFailure(validateMiuraLocalExport(exportData));
    const paths = result.issues.map((issue) => issue.path);

    expect(paths).toContain("exportedAt");
    expect(paths).toContain("workspaces.0.name");
    expect(paths).toContain("evaluations.0.metricValues.0.metricId");
    expect(paths).toContain("evaluations.0.metricValues.0.normalizedValue");
  });

  test("allows unavailable metrics without values and rejects available metrics without usable input", () => {
    const unavailableExport = createValidLocalExport();
    unavailableExport.evaluations[0].metricValues = [
      {
        id: "metric-value-c2",
        evaluationId: "evaluation-demo",
        metricId: "C2",
        available: false,
      },
    ];

    expect(validateMiuraLocalExport(unavailableExport).success).toBe(true);

    const missingInputExport = createValidLocalExport();
    missingInputExport.evaluations[0].metricValues = [
      {
        id: "metric-value-c3",
        evaluationId: "evaluation-demo",
        metricId: "C3",
        available: true,
      },
    ];

    const result = expectFailure(validateMiuraLocalExport(missingInputExport));

    expect(result.issues.map((issue) => issue.path)).toContain(
      "evaluations.0.metricValues.0.simpleLevel",
    );
  });

  test("validates advanced metric values as value plus unit", () => {
    const advancedExport = createValidLocalExport();
    advancedExport.evaluations[0].metricValues = [
      {
        id: "metric-value-d1",
        evaluationId: "evaluation-demo",
        metricId: "D1",
        advancedValue: 12,
        unit: "incidencias/mes",
        source: "Revisión manual",
        timeWindow: "Últimos 3 meses",
        evidenceNote: "Dato aproximado para demo",
        available: true,
      },
    ];

    expect(validateMiuraLocalExport(advancedExport).success).toBe(true);

    const missingUnitExport = createValidLocalExport();
    missingUnitExport.evaluations[0].metricValues[0] = {
      id: "metric-value-d2",
      evaluationId: "evaluation-demo",
      metricId: "D2",
      advancedValue: 4,
      available: true,
    };

    const result = expectFailure(validateMiuraLocalExport(missingUnitExport));

    expect(result.issues.map((issue) => issue.path)).toContain(
      "evaluations.0.metricValues.0.unit",
    );
  });

  test("rejects invalid calculation result ranges and scenarios", () => {
    const exportData = createValidLocalExport();
    exportData.evaluations[0].calculationResult = {
      evaluationId: "evaluation-demo",
      CDI: 0.7,
      DDI: 0.6,
      PDI: 0.8,
      DS: 1.2,
      coverage: {
        code_architecture: -0.1,
        documentation_knowledge: 0.75,
        people_process: 0.75,
      },
      scenarios: [
        {
          scenario: "stress",
          lambda: 0.25,
          CF: 0.18,
          lostHoursMonthly: 12,
          lostHoursTotal: 72,
        },
      ],
      warnings: [],
    };

    const result = expectFailure(validateMiuraLocalExport(exportData));
    const paths = result.issues.map((issue) => issue.path);

    expect(paths).toContain("evaluations.0.calculationResult.DS");
    expect(paths).toContain(
      "evaluations.0.calculationResult.coverage.code_architecture",
    );
    expect(paths).toContain(
      "evaluations.0.calculationResult.scenarios.0.scenario",
    );
  });

  test("validates calculation result coverage gating fields", () => {
    const exportData = createValidLocalExport();
    exportData.evaluations[0].calculationResult = {
      evaluationId: "evaluation-demo",
      CDI: 0.7,
      DDI: 0.6,
      PDI: 0.8,
      DS: 0.71,
      coverage: {
        code_architecture: 0.25,
        documentation_knowledge: 0.75,
        people_process: 0.75,
      },
      coverageStatus: "partial",
      economicOutputAllowed: false,
      insufficientCoveragePillars: ["code_architecture"],
      scenarios: [
        {
          scenario: "central",
          lambda: 0.25,
          CF: 0.1775,
          lostHoursMonthly: 149.1,
          lostHoursTotal: 1789.2,
          currency: "EUR",
        },
      ],
      assumptions: ["MIURA es preliminar y no está validado industrialmente."],
      warnings: ["Diagnóstico parcial por cobertura insuficiente."],
    };

    expect(validateMiuraLocalExport(exportData).success).toBe(true);
  });

  test("rejects invalid calculation coverage status and insufficient pillar IDs", () => {
    const exportData = createValidLocalExport();
    exportData.evaluations[0].calculationResult = {
      evaluationId: "evaluation-demo",
      CDI: 0.7,
      DDI: 0.6,
      PDI: 0.8,
      DS: 0.71,
      coverage: {
        code_architecture: 0.75,
        documentation_knowledge: 0.75,
        people_process: 0.75,
      },
      coverageStatus: "unknown",
      economicOutputAllowed: true,
      insufficientCoveragePillars: ["business"],
      scenarios: [],
      assumptions: [],
      warnings: [],
    };

    const result = expectFailure(validateMiuraLocalExport(exportData));
    const paths = result.issues.map((issue) => issue.path);

    expect(paths).toContain("evaluations.0.calculationResult.coverageStatus");
    expect(paths).toContain(
      "evaluations.0.calculationResult.insufficientCoveragePillars.0",
    );
  });

  test("requires complete recommendation sets when present", () => {
    const exportData = createValidLocalExport();
    exportData.evaluations[0].recommendationSet = {
      evaluationId: "evaluation-demo",
      level: "unexpected",
      summary: "",
      actions: [],
      scrumMapping: [],
      dominantPillar: "business",
      disclaimers: [],
    };

    const result = expectFailure(validateMiuraLocalExport(exportData));
    const paths = result.issues.map((issue) => issue.path);

    expect(paths).toContain("evaluations.0.recommendationSet.level");
    expect(paths).toContain("evaluations.0.recommendationSet.summary");
    expect(paths).toContain("evaluations.0.recommendationSet.actions");
    expect(paths).toContain("evaluations.0.recommendationSet.dominantPillar");
    expect(paths).toContain("evaluations.0.recommendationSet.disclaimers");
  });
});
