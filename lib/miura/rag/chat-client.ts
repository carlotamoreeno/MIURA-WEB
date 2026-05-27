import { z } from "zod";

import {
  type CalculationResult,
  type Evaluation,
  type Project,
  type RecommendationSet,
} from "@/lib/miura/schemas";

import type {
  MiuraChatCitationsData,
  MiuraMinimalEvaluationContext,
} from "./chat-contract";

type MiuraChatEvaluationContextInput = {
  project: Project;
  evaluation: Evaluation;
  calculationResult: CalculationResult;
  recommendationSet: RecommendationSet;
};

const MAX_CONTEXT_SUMMARY_LENGTH = 1000;
const MAX_CONTEXT_SIGNAL_LENGTH = 240;
const MAX_CONTEXT_SIGNALS = 6;

const nullableStringSchema = z.string().nullable();

const miuraChatCitationSchema = z.strictObject({
  id: z.string().min(1),
  chunkId: z.string().min(1),
  documentId: z.string().min(1),
  documentTitle: z.string().min(1),
  sourceType: z.string().min(1),
  section: nullableStringSchema,
  page: z.number().int().positive().nullable(),
  snippet: z.string().min(1),
  score: z.number().finite(),
  url: nullableStringSchema,
  localPath: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  sourceTitles: z.array(z.string().min(1)),
  citationLabel: nullableStringSchema,
});

const miuraChatCitationsDataSchema = z.strictObject({
  hasSufficientSources: z.boolean(),
  citations: z.array(miuraChatCitationSchema),
  retrieval: z.strictObject({
    query: z.string().min(1),
    retrievedChunks: z.number().int().min(0),
    topK: z.number().int().positive(),
    matchThreshold: z.number().finite().min(0).max(1),
  }),
  usesEvaluationContext: z.boolean(),
});

function truncateForChatContext(value: string, maxLength: number) {
  const trimmedValue = value.trim();

  if (trimmedValue.length <= maxLength) {
    return trimmedValue;
  }

  return `${trimmedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildContextSignals({
  calculationResult,
  recommendationSet,
}: Pick<
  MiuraChatEvaluationContextInput,
  "calculationResult" | "recommendationSet"
>) {
  return [
    `DS ${calculationResult.DS.toFixed(2)} con cobertura ${calculationResult.coverageStatus === "sufficient" ? "suficiente" : "parcial"}.`,
    `Pilar dominante: ${recommendationSet.dominantPillar}.`,
    ...calculationResult.pillarResults.flatMap((pillarResult) =>
      pillarResult.dominantSignals.map(
        (signal) => `${pillarResult.pillar}: ${signal}`,
      ),
    ),
  ]
    .map((signal) => truncateForChatContext(signal, MAX_CONTEXT_SIGNAL_LENGTH))
    .slice(0, MAX_CONTEXT_SIGNALS);
}

function buildMiuraChatEvaluationContext({
  project,
  evaluation,
  calculationResult,
  recommendationSet,
}: MiuraChatEvaluationContextInput): MiuraMinimalEvaluationContext {
  return {
    projectName: truncateForChatContext(project.name, 160),
    evaluationName: truncateForChatContext(evaluation.name, 160),
    methodology: truncateForChatContext(project.methodology, 120),
    horizonMonths: evaluation.horizonMonths,
    indices: {
      CDI: calculationResult.CDI,
      DDI: calculationResult.DDI,
      PDI: calculationResult.PDI,
      DS: calculationResult.DS,
    },
    coverageStatus: calculationResult.coverageStatus,
    dominantPillar: recommendationSet.dominantPillar,
    recommendationLevel: recommendationSet.level,
    summary: truncateForChatContext(
      recommendationSet.summary,
      MAX_CONTEXT_SUMMARY_LENGTH,
    ),
    signals: buildContextSignals({
      calculationResult,
      recommendationSet,
    }),
  };
}

function parseMiuraChatCitationsData(
  value: unknown,
): MiuraChatCitationsData | undefined {
  const result = miuraChatCitationsDataSchema.safeParse(value);

  return result.success ? result.data : undefined;
}

export {
  miuraChatCitationsDataSchema,
  parseMiuraChatCitationsData,
  buildMiuraChatEvaluationContext,
  type MiuraChatEvaluationContextInput,
};
