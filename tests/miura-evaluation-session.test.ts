import { beforeEach, describe, expect, test } from "vitest";

import { createDraftMiuraEvaluation } from "@/lib/miura/domain";
import type { MiuraLocalExport } from "@/lib/miura/schemas";
import {
  clearMiuraLocalStore,
  replaceMiuraLocalExport,
} from "@/lib/miura/session/local-store";
import {
  clearTemporaryEvaluationSessions,
  getLatestTemporaryEvaluationSession,
  getTemporaryEvaluationSession,
  setTemporaryEvaluationSession,
} from "@/lib/miura/session/evaluation-session";

const validFormInput = {
  workspaceName: "Organización demo",
  projectName: "Portal operativo",
  projectDescription: "",
  methodology: "Scrum/Kanban",
  monthlyCapacityHours: "840",
  hourlyCost: "",
  horizonMonths: "12",
};

function createDraftLocalExport({
  idSeed,
  now,
  projectName = "Portal operativo",
}: {
  idSeed: string;
  now: string;
  projectName?: string;
}) {
  const result = createDraftMiuraEvaluation({
    formInput: {
      ...validFormInput,
      projectName,
    },
    idSeed,
    now,
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.data.localExport;
}

function firstEvaluationId(localExport: MiuraLocalExport) {
  const evaluation = localExport.evaluations[0];

  if (evaluation === undefined) {
    throw new Error("Expected fixture evaluation.");
  }

  return evaluation.id;
}

describe("MIURA evaluation session bridge", () => {
  beforeEach(() => {
    clearTemporaryEvaluationSessions();
    clearMiuraLocalStore();
  });

  test("does not resolve stale temporary sessions after local reset", () => {
    const localExport = createDraftLocalExport({
      idSeed: "reset-session-seed",
      now: "2026-05-18T08:00:00.000Z",
    });
    const evaluationId = firstEvaluationId(localExport);

    setTemporaryEvaluationSession(localExport, "draft");
    expect(getTemporaryEvaluationSession(evaluationId)?.evaluation.id).toBe(
      evaluationId,
    );

    clearMiuraLocalStore();

    expect(getTemporaryEvaluationSession(evaluationId)).toBeUndefined();
    expect(getLatestTemporaryEvaluationSession()).toBeUndefined();
  });

  test("treats imported replacement data as authoritative over old sessions", () => {
    const oldLocalExport = createDraftLocalExport({
      idSeed: "old-session-seed",
      now: "2026-05-18T08:00:00.000Z",
      projectName: "Portal anterior",
    });
    const importedLocalExport = createDraftLocalExport({
      idSeed: "imported-session-seed",
      now: "2026-05-18T10:00:00.000Z",
      projectName: "Portal importado",
    });
    const oldEvaluationId = firstEvaluationId(oldLocalExport);
    const importedEvaluationId = firstEvaluationId(importedLocalExport);

    setTemporaryEvaluationSession(oldLocalExport, "draft");
    replaceMiuraLocalExport(importedLocalExport);

    expect(getTemporaryEvaluationSession(oldEvaluationId)).toBeUndefined();
    expect(
      getTemporaryEvaluationSession(importedEvaluationId)?.project.name,
    ).toBe("Portal importado");
    expect(getLatestTemporaryEvaluationSession()?.evaluation.id).toBe(
      importedEvaluationId,
    );
  });
});
