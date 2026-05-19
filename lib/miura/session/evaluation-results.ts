"use client";

import {
  buildMiuraRecommendationSet,
  buildPreloadedMiuraExampleSnapshot,
  calculateMiuraEvaluation,
  sampleMiuraEvaluationId,
} from "@/lib/miura/domain";
import type {
  CalculationResult,
  Evaluation,
  Project,
  RecommendationSet,
  Workspace,
} from "@/lib/miura/schemas";

import { getTemporaryEvaluationSession } from "./evaluation-session";

type MiuraEvaluationResultData = {
  source: "session" | "example";
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
};

type MiuraEvaluationResultState =
  | {
      status: "ready";
      data: MiuraEvaluationResultData;
    }
  | {
      status: "missing";
    }
  | {
      status: "error";
      message: string;
    };

function resolveMiuraEvaluationResult(
  evaluationId: string,
): MiuraEvaluationResultState {
  try {
    const temporarySession = getTemporaryEvaluationSession(evaluationId);

    if (temporarySession !== undefined) {
      const calculationResult = calculateMiuraEvaluation({
        project: temporarySession.project,
        evaluation: temporarySession.evaluation,
      });
      const recommendationSet = buildMiuraRecommendationSet(calculationResult);

      return {
        status: "ready",
        data: {
          source: "session",
          workspace: temporarySession.workspace,
          project: temporarySession.project,
          evaluation: temporarySession.evaluation,
          calculationResult,
          recommendationSet,
        },
      };
    }

    if (evaluationId === sampleMiuraEvaluationId) {
      const example = buildPreloadedMiuraExampleSnapshot();
      const calculationResult = calculateMiuraEvaluation({
        project: example.project,
        evaluation: example.evaluation,
      });
      const recommendationSet = buildMiuraRecommendationSet(calculationResult);

      return {
        status: "ready",
        data: {
          source: "example",
          workspace: example.workspace,
          project: example.project,
          evaluation: example.evaluation,
          calculationResult,
          recommendationSet,
        },
      };
    }

    return {
      status: "missing",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se ha podido calcular la evaluación MIURA.",
    };
  }
}

export {
  resolveMiuraEvaluationResult,
  type MiuraEvaluationResultData,
  type MiuraEvaluationResultState,
};
