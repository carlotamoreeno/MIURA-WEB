import { z } from "zod";

import {
  PILLARS,
  RECOMMENDATION_LEVELS,
  coverageStatusSchema,
  type CoverageStatus,
  type Pillar,
  type RecommendationLevel,
} from "@/lib/miura/schemas";

import type {
  MiuraKnowledgeCitation,
  MiuraRagRetrieverPublicConfig,
} from "./retrieve";

const MAX_CHAT_MESSAGES = 12;
const MAX_MESSAGE_PARTS = 20;
const MAX_MESSAGE_TEXT_LENGTH = 4000;
const MAX_TOTAL_MESSAGE_TEXT_LENGTH = 12000;
const MAX_EVALUATION_CONTEXT_ITEMS = 6;

const chatMessagePartSchema = z
  .object({
    type: z.string().trim().min(1).max(80),
  })
  .passthrough();

const chatUiMessageSchema = z
  .strictObject({
    id: z.string().trim().min(1).max(160),
    role: z.enum(["system", "user", "assistant"]),
    metadata: z.unknown().optional(),
    parts: z.array(chatMessagePartSchema).min(1).max(MAX_MESSAGE_PARTS),
  })
  .superRefine((message, context) => {
    if (message.role === "system") {
      context.addIssue({
        code: "custom",
        path: ["role"],
        message:
          "Los mensajes de sistema del cliente no están permitidos; el prompt de sistema se define en el servidor.",
      });
    }

    const nonTextUserPart = message.parts.find(
      (part) => message.role === "user" && part.type !== "text",
    );

    if (nonTextUserPart !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["parts"],
        message:
          "Los mensajes de usuario del chat MIURA solo pueden contener texto.",
      });
    }
  });

const unitIntervalSchema = z.number().finite().min(0).max(1);
const optionalContextTextSchema = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).optional();

const minimalEvaluationContextSchema = z.strictObject({
  projectName: optionalContextTextSchema(160),
  evaluationName: optionalContextTextSchema(160),
  methodology: optionalContextTextSchema(120),
  horizonMonths: z.number().int().positive().max(120).optional(),
  indices: z
    .strictObject({
      CDI: unitIntervalSchema,
      DDI: unitIntervalSchema,
      PDI: unitIntervalSchema,
      DS: unitIntervalSchema,
    })
    .optional(),
  coverageStatus: coverageStatusSchema.optional(),
  dominantPillar: z.enum(PILLARS).optional(),
  recommendationLevel: z.enum(RECOMMENDATION_LEVELS).optional(),
  summary: optionalContextTextSchema(1000),
  signals: z
    .array(z.string().trim().min(1).max(240))
    .max(MAX_EVALUATION_CONTEXT_ITEMS)
    .optional(),
});

const chatRequestBodySchema = z
  .strictObject({
    id: z.string().trim().min(1).max(160).optional(),
    messages: z.array(chatUiMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
    trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
    messageId: z.string().trim().min(1).max(160).nullable().optional(),
    useEvaluationContext: z.boolean().default(false),
    evaluationContext: minimalEvaluationContextSchema.optional(),
  })
  .superRefine((body, context) => {
    const totalTextLength = body.messages.reduce(
      (total, message) => total + extractTextFromChatMessage(message).length,
      0,
    );

    if (totalTextLength > MAX_TOTAL_MESSAGE_TEXT_LENGTH) {
      context.addIssue({
        code: "custom",
        path: ["messages"],
        message: `La conversación supera el límite de ${MAX_TOTAL_MESSAGE_TEXT_LENGTH} caracteres de texto.`,
      });
    }

    const latestUserQuestion = getLatestUserQuestion(body.messages);

    if (latestUserQuestion === null) {
      context.addIssue({
        code: "custom",
        path: ["messages"],
        message: "El payload necesita una pregunta de usuario con texto.",
      });
    }
  });

type MiuraChatUiMessage = z.infer<typeof chatUiMessageSchema>;
type MiuraChatRequestBody = z.infer<typeof chatRequestBodySchema>;
type MiuraMinimalEvaluationContext = z.infer<
  typeof minimalEvaluationContextSchema
>;

type MiuraChatCitation = Pick<
  MiuraKnowledgeCitation,
  | "id"
  | "chunkId"
  | "documentId"
  | "documentTitle"
  | "sourceType"
  | "section"
  | "page"
  | "snippet"
  | "score"
  | "url"
  | "localPath"
  | "sourceIds"
  | "sourceTitles"
  | "citationLabel"
>;

type MiuraChatCitationsData = {
  hasSufficientSources: boolean;
  citations: MiuraChatCitation[];
  retrieval: {
    query: string;
    retrievedChunks: number;
    topK: number;
    matchThreshold: number;
  };
  usesEvaluationContext: boolean;
};

function parseMiuraChatRequestBody(value: unknown) {
  return chatRequestBodySchema.safeParse(value);
}

function extractTextFromChatMessage(message: MiuraChatUiMessage): string {
  return message.parts
    .filter(isTextMessagePart)
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_MESSAGE_TEXT_LENGTH)
    .trim();
}

function getLatestUserQuestion(
  messages: readonly MiuraChatUiMessage[],
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role !== "user") continue;

    const text = extractTextFromChatMessage(message);

    if (text !== "") {
      return text;
    }
  }

  return null;
}

function toMiuraChatCitationsData({
  query,
  citations,
  config,
  usesEvaluationContext,
}: {
  query: string;
  citations: MiuraKnowledgeCitation[];
  config: MiuraRagRetrieverPublicConfig;
  usesEvaluationContext: boolean;
}): MiuraChatCitationsData {
  return {
    hasSufficientSources: citations.length > 0,
    citations: citations.map(toMiuraChatCitation),
    retrieval: {
      query,
      retrievedChunks: citations.length,
      topK: config.topK,
      matchThreshold: config.matchThreshold,
    },
    usesEvaluationContext,
  };
}

function formatPillarForChat(pillar: Pillar): string {
  const labels = {
    code_architecture: "Código/arquitectura",
    documentation_knowledge: "Documentación/conocimiento",
    people_process: "Personas/proceso",
  } as const satisfies Record<Pillar, string>;

  return labels[pillar];
}

function formatCoverageStatusForChat(status: CoverageStatus): string {
  return status === "sufficient" ? "suficiente" : "parcial";
}

function formatRecommendationLevelForChat(level: RecommendationLevel): string {
  const labels = {
    monitor: "monitorizar/mantener",
    mitigate: "mitigar selectivamente",
    intervene: "intervenir",
    improve_evidence: "mejorar evidencia",
  } as const satisfies Record<RecommendationLevel, string>;

  return labels[level];
}

function toMiuraChatCitation(
  citation: MiuraKnowledgeCitation,
): MiuraChatCitation {
  return {
    id: citation.id,
    chunkId: citation.chunkId,
    documentId: citation.documentId,
    documentTitle: citation.documentTitle,
    sourceType: citation.sourceType,
    section: citation.section,
    page: citation.page,
    snippet: citation.snippet,
    score: citation.score,
    url: citation.url,
    localPath: citation.localPath,
    sourceIds: citation.sourceIds,
    sourceTitles: citation.sourceTitles,
    citationLabel: citation.citationLabel,
  };
}

function isTextMessagePart(
  part: z.infer<typeof chatMessagePartSchema>,
): part is z.infer<typeof chatMessagePartSchema> & { text: string } {
  return (
    part.type === "text" &&
    typeof part.text === "string" &&
    part.text.trim() !== ""
  );
}

export {
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_TEXT_LENGTH,
  MAX_TOTAL_MESSAGE_TEXT_LENGTH,
  chatRequestBodySchema,
  extractTextFromChatMessage,
  formatCoverageStatusForChat,
  formatPillarForChat,
  formatRecommendationLevelForChat,
  getLatestUserQuestion,
  minimalEvaluationContextSchema,
  parseMiuraChatRequestBody,
  toMiuraChatCitationsData,
  type MiuraChatCitationsData,
  type MiuraChatCitation,
  type MiuraChatRequestBody,
  type MiuraChatUiMessage,
  type MiuraMinimalEvaluationContext,
};
