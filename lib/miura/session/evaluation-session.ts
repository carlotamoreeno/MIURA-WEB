"use client";

import type {
  Evaluation,
  MiuraLocalExport,
  Project,
  Workspace,
} from "@/lib/miura/schemas";
import { miuraLocalExportSchema } from "@/lib/miura/schemas";
import {
  latestEvaluationFromLocalExport,
  readMiuraLocalStore,
  updateMiuraLocalEvaluation,
  upsertMiuraLocalExport,
  type MiuraLocalStoreMode,
} from "./local-store";

type TemporaryEvaluationSessionSource = "draft" | "example" | "local";

type TemporaryEvaluationSession = {
  source: TemporaryEvaluationSessionSource;
  localExport: MiuraLocalExport;
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  storageMode: MiuraLocalStoreMode;
  storageWarning?: string;
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
  const storeState = upsertMiuraLocalExport(localExport);
  const session = {
    source,
    localExport: storeState.localExport ?? localExport,
    workspace,
    project,
    evaluation,
    storageMode: storeState.mode,
    storageWarning: storeState.warning,
  } satisfies TemporaryEvaluationSession;

  temporaryEvaluations.set(evaluation.id, session);

  return session;
}

function sessionFromLocalExport({
  localExport,
  evaluationId,
  source,
  storageMode,
  storageWarning,
}: {
  localExport: MiuraLocalExport;
  evaluationId: string;
  source: TemporaryEvaluationSessionSource;
  storageMode: MiuraLocalStoreMode;
  storageWarning?: string;
}) {
  const evaluation = localExport.evaluations.find(
    (storedEvaluation) => storedEvaluation.id === evaluationId,
  );

  if (evaluation === undefined) {
    return undefined;
  }

  const project = localExport.projects.find(
    (storedProject) => storedProject.id === evaluation.projectId,
  );

  if (project === undefined) {
    return undefined;
  }

  const workspace = localExport.workspaces.find(
    (storedWorkspace) => storedWorkspace.id === project.workspaceId,
  );

  if (workspace === undefined) {
    return undefined;
  }

  const session = {
    source,
    localExport,
    workspace,
    project,
    evaluation,
    storageMode,
    storageWarning,
  } satisfies TemporaryEvaluationSession;

  temporaryEvaluations.set(evaluation.id, session);

  return session;
}

function getTemporaryEvaluationSession(evaluationId: string) {
  const storeState = readMiuraLocalStore();

  if (storeState.localExport !== undefined) {
    return sessionFromLocalExport({
      localExport: storeState.localExport,
      evaluationId,
      source: "local",
      storageMode: storeState.mode,
      storageWarning: storeState.warning,
    });
  }

  if (storeState.mode === "session_fallback") {
    return temporaryEvaluations.get(evaluationId);
  }

  return undefined;
}

function getLatestTemporaryEvaluationSession() {
  const storeState = readMiuraLocalStore();
  const latestEvaluation =
    storeState.localExport === undefined
      ? undefined
      : latestEvaluationFromLocalExport(storeState.localExport);

  if (storeState.localExport !== undefined && latestEvaluation !== undefined) {
    return sessionFromLocalExport({
      localExport: storeState.localExport,
      evaluationId: latestEvaluation.id,
      source: "local",
      storageMode: storeState.mode,
      storageWarning: storeState.warning,
    });
  }

  if (storeState.mode !== "session_fallback") {
    return undefined;
  }

  return [...temporaryEvaluations.values()].sort(
    (left, right) =>
      Date.parse(right.evaluation.updatedAt) -
      Date.parse(left.evaluation.updatedAt),
  )[0];
}

function clearTemporaryEvaluationSessions() {
  temporaryEvaluations.clear();
}

function updateTemporaryEvaluationSession(evaluation: Evaluation) {
  const currentSession = getTemporaryEvaluationSession(evaluation.id);

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
  const storeState = updateMiuraLocalEvaluation(evaluation);
  const persistedLocalExport = storeState?.localExport ?? localExport;

  const updatedSession = sessionFromLocalExport({
    localExport: persistedLocalExport,
    evaluationId: evaluation.id,
    source: currentSession.source,
    storageMode: storeState?.mode ?? currentSession.storageMode,
    storageWarning: storeState?.warning ?? currentSession.storageWarning,
  });

  return updatedSession;
}

export {
  clearTemporaryEvaluationSessions,
  getLatestTemporaryEvaluationSession,
  getTemporaryEvaluationSession,
  setTemporaryEvaluationSession,
  updateTemporaryEvaluationSession,
  type TemporaryEvaluationSession,
  type TemporaryEvaluationSessionSource,
};
