"use client";

import type {
  Evaluation,
  MiuraLocalExport,
  Project,
  Workspace,
} from "@/lib/miura/schemas";
import { miuraLocalExportSchema } from "@/lib/miura/schemas";

type TemporaryEvaluationSessionSource = "draft" | "example";

type TemporaryEvaluationSession = {
  source: TemporaryEvaluationSessionSource;
  localExport: MiuraLocalExport;
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
};

const temporaryEvaluations = new Map<string, TemporaryEvaluationSession>();

function firstOrThrow<T>(items: readonly T[], label: string) {
  const item = items[0];

  if (item === undefined) {
    throw new Error(`La sesión temporal no incluye ${label}.`);
  }

  return item;
}

function setTemporaryEvaluationSession(
  localExport: MiuraLocalExport,
  source: TemporaryEvaluationSessionSource,
) {
  const workspace = firstOrThrow(localExport.workspaces, "organización");
  const project = firstOrThrow(localExport.projects, "proyecto");
  const evaluation = firstOrThrow(localExport.evaluations, "evaluación");
  const session = {
    source,
    localExport,
    workspace,
    project,
    evaluation,
  } satisfies TemporaryEvaluationSession;

  temporaryEvaluations.set(evaluation.id, session);

  return session;
}

function getTemporaryEvaluationSession(evaluationId: string) {
  return temporaryEvaluations.get(evaluationId);
}

function updateTemporaryEvaluationSession(evaluation: Evaluation) {
  const currentSession = temporaryEvaluations.get(evaluation.id);

  if (currentSession === undefined) {
    return undefined;
  }

  const localExport = miuraLocalExportSchema.parse({
    ...currentSession.localExport,
    exportedAt: evaluation.updatedAt,
    evaluations: currentSession.localExport.evaluations.map(
      (storedEvaluation) =>
        storedEvaluation.id === evaluation.id ? evaluation : storedEvaluation,
    ),
  });

  return setTemporaryEvaluationSession(localExport, currentSession.source);
}

export {
  getTemporaryEvaluationSession,
  setTemporaryEvaluationSession,
  updateTemporaryEvaluationSession,
  type TemporaryEvaluationSession,
  type TemporaryEvaluationSessionSource,
};
