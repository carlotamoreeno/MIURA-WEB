import { describe, expect, test } from "vitest";

import {
  buildPreloadedMiuraExampleSnapshot,
  createDraftMiuraEvaluation,
  sampleMiuraReducedCaseExpectedResults,
} from "@/lib/miura/domain";
import { validateMiuraLocalExport } from "@/lib/miura/schemas";

const validFormInput = {
  workspaceName: "Organización demo",
  projectName: "Portal operativo",
  projectDescription: "",
  methodology: "Scrum/Kanban",
  monthlyCapacityHours: "840",
  hourlyCost: "",
  horizonMonths: "12",
};

describe("MIURA evaluation creation flow helpers", () => {
  test("creates a schema-valid draft Workspace -> Project -> Evaluation export", () => {
    const result = createDraftMiuraEvaluation({
      formInput: validFormInput,
      idSeed: "seed-001",
      now: "2026-05-16T12:00:00.000Z",
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(result.message);
    }

    expect(validateMiuraLocalExport(result.data.localExport).success).toBe(
      true,
    );
    expect(result.data.workspace.id).toBe("workspace-seed-001");
    expect(result.data.project.id).toBe("project-seed-001");
    expect(result.data.evaluation.id).toBe("evaluation-seed-001");
    expect(result.data.project.hourlyCost).toBeUndefined();
    expect(result.data.project.monthlyCapacityHours).toBe(840);
    expect(result.data.evaluation.status).toBe("draft");
    expect(result.data.evaluation.horizonMonths).toBe(12);
    expect(result.data.evaluation.metricValues).toEqual([]);
  });

  test("returns Spanish field errors for invalid creation input", () => {
    const result = createDraftMiuraEvaluation({
      formInput: {
        ...validFormInput,
        projectName: " ",
        monthlyCapacityHours: "0",
        hourlyCost: "-1",
        horizonMonths: "1.5",
      },
      idSeed: "seed-002",
      now: "2026-05-16T12:00:00.000Z",
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected invalid form input to fail.");
    }

    expect(result.fieldErrors.projectName).toMatch(/proyecto/i);
    expect(result.fieldErrors.monthlyCapacityHours).toMatch(/mayor que 0/i);
    expect(result.fieldErrors.hourlyCost).toMatch(/no puede ser negativo/i);
    expect(result.fieldErrors.horizonMonths).toMatch(/entero/i);
  });

  test("builds the reproducible preloaded scorecard snapshot from the accepted fixture", () => {
    const snapshot = buildPreloadedMiuraExampleSnapshot();

    expect(validateMiuraLocalExport(snapshot.localExport).success).toBe(true);
    expect(snapshot.scorecard.CDI).toBe(
      sampleMiuraReducedCaseExpectedResults.CDI,
    );
    expect(snapshot.scorecard.DDI).toBe(
      sampleMiuraReducedCaseExpectedResults.DDI,
    );
    expect(snapshot.scorecard.PDI).toBe(
      sampleMiuraReducedCaseExpectedResults.PDI,
    );
    expect(snapshot.scorecard.DS).toBe(
      sampleMiuraReducedCaseExpectedResults.DS,
    );
    expect(snapshot.scorecard.coverage).toEqual({
      codeArchitecture: 0.75,
      documentationKnowledge: 0.75,
      peopleProcess: 0.75,
    });
    expect(snapshot.scorecard.recommendationLevel).toBe("intervene");
    expect(snapshot.evaluation.calculationResult?.DS).toBe(0.71);
    expect(snapshot.evaluation.recommendationSet?.level).toBe("intervene");
  });
});
