"use client";

import type {
  Evaluation,
  MiuraLocalExport,
  Project,
  Workspace,
} from "@/lib/miura/schemas";

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

export {
  getTemporaryEvaluationSession,
  setTemporaryEvaluationSession,
  type TemporaryEvaluationSession,
  type TemporaryEvaluationSessionSource,
};
