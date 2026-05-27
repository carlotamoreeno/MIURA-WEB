import { createOpenAI } from "@ai-sdk/openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessageChunk,
} from "ai";

import {
  extractTextFromChatMessage,
  formatCoverageStatusForChat,
  formatPillarForChat,
  formatRecommendationLevelForChat,
  getLatestUserQuestion,
  parseMiuraChatRequestBody,
  toMiuraChatCitationsData,
  type MiuraChatCitationsData,
  type MiuraChatRequestBody,
  type MiuraMinimalEvaluationContext,
} from "./chat-contract";
import {
  retrieveMiuraKnowledge,
  type MiuraKnowledgeRetrievalResult,
} from "./retrieve";

const DEFAULT_OPENAI_CHAT_MODEL = "gpt-5.4-mini";
const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 900;
const MIN_CHAT_MAX_OUTPUT_TOKENS = 128;
const MAX_CHAT_MAX_OUTPUT_TOKENS = 2000;
const CHAT_TEMPERATURE = 0.2;
const CHAT_TOTAL_TIMEOUT_MS = 28_000;
const CHAT_CHUNK_TIMEOUT_MS = 12_000;

const MIURA_NO_SOURCES_RESPONSE =
  "No encuentro evidencia suficiente en el corpus controlado de MIURA para responder con seguridad. Reformula la pregunta sobre MIURA, deuda técnica, Scrum/Kanban o revisa si falta una fuente en el corpus.";

const MIURA_PROVIDER_ERROR_RESPONSE =
  "No se ha podido completar la respuesta por un fallo temporal del proveedor LLM. Reintenta en unos segundos; la evaluación local no se ha visto afectada.";

const MIURA_RETRIEVAL_ERROR_RESPONSE =
  "No se ha podido recuperar evidencia del corpus MIURA. Reintenta más tarde; la evaluación local no se ha visto afectada.";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

type MiuraChatConfig = {
  enabled: boolean;
  evaluationContextEnabled: boolean;
  openAiApiKey: string;
  model: string;
  maxOutputTokens: number;
};

type StreamTextInput = {
  model: LanguageModel;
  system: string;
  messages: ModelMessage[];
  maxOutputTokens: number;
  temperature: number;
  maxRetries: number;
  abortSignal?: AbortSignal;
  timeout: {
    totalMs: number;
    chunkMs: number;
  };
};

type StreamTextResultLike = {
  toUIMessageStream: (options?: {
    sendStart?: boolean;
    onError?: (error: unknown) => string;
  }) => ReadableStream<UIMessageChunk>;
};

type MiuraChatDependencies = {
  env?: Record<string, string | undefined>;
  logger?: Pick<Console, "error">;
  retrieveKnowledge?: (query: string) => Promise<MiuraKnowledgeRetrievalResult>;
  createLanguageModel?: (config: MiuraChatConfig) => LanguageModel;
  streamText?: (input: StreamTextInput) => StreamTextResultLike;
};

async function handleMiuraChatRequest(
  request: Request,
  dependencies: MiuraChatDependencies = {},
): Promise<Response> {
  const logger = dependencies.logger ?? console;
  const rawBody = await readRequestJson(request);

  if (!rawBody.success) {
    return jsonError(400, rawBody.message);
  }

  const parsedBody = parseMiuraChatRequestBody(rawBody.data);

  if (!parsedBody.success) {
    return jsonError(400, formatChatValidationError(parsedBody.error));
  }

  let config: MiuraChatConfig;

  try {
    config = readMiuraChatConfig({ env: dependencies.env });
  } catch (error) {
    logSanitizedError(logger, "config", error);

    return jsonError(
      503,
      "El chat RAG no está configurado correctamente. La evaluación local sigue disponible.",
    );
  }

  if (!config.enabled) {
    return jsonError(
      503,
      "El chat RAG está desactivado temporalmente. Puedes seguir usando la evaluación local y el informe.",
    );
  }

  const question = getLatestUserQuestion(parsedBody.data.messages);

  if (question === null) {
    return jsonError(400, "El payload necesita una pregunta de usuario.");
  }

  let retrieval: MiuraKnowledgeRetrievalResult;

  try {
    retrieval = await (
      dependencies.retrieveKnowledge ?? retrieveMiuraKnowledge
    )(question);
  } catch (error) {
    logSanitizedError(logger, "retrieval", error);

    return jsonError(503, MIURA_RETRIEVAL_ERROR_RESPONSE);
  }

  const usesEvaluationContext =
    config.evaluationContextEnabled &&
    parsedBody.data.useEvaluationContext &&
    parsedBody.data.evaluationContext !== undefined;
  const citationsData = toMiuraChatCitationsData({
    query: retrieval.query,
    citations: retrieval.citations,
    config: retrieval.config,
    usesEvaluationContext,
  });

  if (!retrieval.hasSufficientSources) {
    return createNoSourcesResponse(citationsData);
  }

  let languageModel: LanguageModel;

  try {
    languageModel = (
      dependencies.createLanguageModel ?? createOpenAiLanguageModel
    )(config);
  } catch (error) {
    logSanitizedError(logger, "provider", error);

    return jsonError(503, MIURA_PROVIDER_ERROR_RESPONSE);
  }

  const systemPrompt = buildMiuraChatSystemPrompt({
    retrieval,
    evaluationContext: usesEvaluationContext
      ? parsedBody.data.evaluationContext
      : undefined,
  });
  const modelMessages = toModelMessages(parsedBody.data);
  const streamTextFn = dependencies.streamText ?? streamText;
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: "start",
        messageMetadata: {
          model: config.model,
          usesEvaluationContext,
        },
      });
      writer.write({
        type: "data-citations",
        data: citationsData,
      });

      const result = streamTextFn({
        model: languageModel,
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: config.maxOutputTokens,
        temperature: CHAT_TEMPERATURE,
        maxRetries: 1,
        abortSignal: request.signal,
        timeout: {
          totalMs: CHAT_TOTAL_TIMEOUT_MS,
          chunkMs: CHAT_CHUNK_TIMEOUT_MS,
        },
      });

      writer.merge(
        result.toUIMessageStream({
          sendStart: false,
          onError: (error) => handleProviderStreamError(logger, error),
        }),
      );
    },
    onError: (error) => handleProviderStreamError(logger, error),
  });

  return createUIMessageStreamResponse({
    headers: RESPONSE_HEADERS,
    stream,
  });
}

function readMiuraChatConfig({
  env = process.env,
}: {
  env?: Record<string, string | undefined>;
} = {}): MiuraChatConfig {
  const enabled = readBooleanEnv(env.ENABLE_RAG_CHAT, true);

  return {
    enabled,
    evaluationContextEnabled: readBooleanEnv(
      env.ENABLE_EVALUATION_CONTEXT_IN_CHAT,
      true,
    ),
    openAiApiKey: enabled
      ? requireConfigValue(env.OPENAI_API_KEY, "OPENAI_API_KEY")
      : "",
    model:
      firstNonEmptyString(env.OPENAI_CHAT_MODEL, env.AI_MODEL) ??
      DEFAULT_OPENAI_CHAT_MODEL,
    maxOutputTokens: readIntegerEnv(
      env.MIURA_CHAT_MAX_OUTPUT_TOKENS ?? env.AI_MAX_OUTPUT_TOKENS,
      DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
      "MIURA_CHAT_MAX_OUTPUT_TOKENS",
      MIN_CHAT_MAX_OUTPUT_TOKENS,
      MAX_CHAT_MAX_OUTPUT_TOKENS,
    ),
  };
}

function buildMiuraChatSystemPrompt({
  retrieval,
  evaluationContext,
}: {
  retrieval: MiuraKnowledgeRetrievalResult;
  evaluationContext?: MiuraMinimalEvaluationContext;
}): string {
  const retrievedContext = retrieval.chunks
    .map((chunk, index) => {
      const citation = chunk.citation;
      const section = citation.section ? `Sección: ${citation.section}` : "";
      const page =
        citation.page !== null ? `Página/posición: ${citation.page}` : "";

      return [
        `[Fuente ${index + 1}]`,
        `Documento: ${citation.documentTitle}`,
        section,
        page,
        `Ruta local: ${citation.localPath}`,
        `Puntuación retrieval: ${citation.score.toFixed(4)}`,
        "Extracto:",
        chunk.content,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  return [
    "Eres el asistente RAG de MIURA Web App MVP 0.1.",
    "Responde siempre en español claro, con tono profesional de consultoría y orientado a perfiles de negocio, gestión y delivery.",
    "Usa solo el contexto recuperado del corpus controlado que aparece más abajo. No inventes fuentes, métricas, fórmulas, validación industrial ni contenido del TFG fuera de los extractos.",
    "Si el contexto recuperado no basta para una afirmación, dilo de forma explícita y limita la respuesta a lo que sí está soportado.",
    "Cuando respondas con base en el corpus, menciona las fuentes por documento/sección de forma breve. La UI recibirá las citas estructuradas por separado.",
    "Mantén MIURA como framework preliminar, sociotécnico y complementario a Scrum/Kanban; no lo presentes como validado industrialmente ni como contabilidad exacta.",
    evaluationContext
      ? `Resumen mínimo de evaluación autorizado por el usuario:\n${formatEvaluationContext(evaluationContext)}`
      : "No se ha autorizado contexto de evaluación activa para esta respuesta.",
    `Contexto recuperado del corpus:\n${retrievedContext}`,
  ].join("\n\n");
}

function toModelMessages(body: MiuraChatRequestBody): ModelMessage[] {
  return body.messages
    .map((message): ModelMessage | null => {
      if (message.role === "system") {
        return null;
      }

      const text = extractTextFromChatMessage(message);

      if (text === "") {
        return null;
      }

      return {
        role: message.role,
        content: text,
      };
    })
    .filter((message): message is ModelMessage => message !== null);
}

function createNoSourcesResponse(citationsData: MiuraChatCitationsData) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: "start",
        messageMetadata: {
          noSources: true,
          usesEvaluationContext: citationsData.usesEvaluationContext,
        },
      });
      writer.write({
        type: "data-citations",
        data: citationsData,
      });
      writer.write({
        type: "text-start",
        id: "miura-no-sources",
      });
      writer.write({
        type: "text-delta",
        id: "miura-no-sources",
        delta: MIURA_NO_SOURCES_RESPONSE,
      });
      writer.write({
        type: "text-end",
        id: "miura-no-sources",
      });
      writer.write({
        type: "finish",
        finishReason: "stop",
        messageMetadata: {
          noSources: true,
          usesEvaluationContext: citationsData.usesEvaluationContext,
        },
      });
    },
  });

  return createUIMessageStreamResponse({
    headers: RESPONSE_HEADERS,
    stream,
  });
}

function createOpenAiLanguageModel(config: MiuraChatConfig): LanguageModel {
  return createOpenAI({
    apiKey: config.openAiApiKey,
  })(config.model);
}

function formatEvaluationContext(context: MiuraMinimalEvaluationContext) {
  const lines = [
    context.projectName ? `Proyecto: ${context.projectName}` : null,
    context.evaluationName ? `Evaluación: ${context.evaluationName}` : null,
    context.methodology ? `Metodología: ${context.methodology}` : null,
    context.horizonMonths ? `Horizonte: ${context.horizonMonths} meses` : null,
    context.indices
      ? `Índices: CDI ${formatIndex(context.indices.CDI)}, DDI ${formatIndex(context.indices.DDI)}, PDI ${formatIndex(context.indices.PDI)}, DS ${formatIndex(context.indices.DS)}`
      : null,
    context.coverageStatus
      ? `Cobertura: ${formatCoverageStatusForChat(context.coverageStatus)}`
      : null,
    context.dominantPillar
      ? `Pilar dominante: ${formatPillarForChat(context.dominantPillar)}`
      : null,
    context.recommendationLevel
      ? `Recomendación: ${formatRecommendationLevelForChat(context.recommendationLevel)}`
      : null,
    context.summary ? `Resumen: ${context.summary}` : null,
    context.signals && context.signals.length > 0
      ? `Señales: ${context.signals.join("; ")}`
      : null,
  ].filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "El usuario no ha enviado detalles adicionales.";
}

function formatIndex(value: number) {
  return value.toFixed(2);
}

function handleProviderStreamError(
  logger: Pick<Console, "error">,
  error: unknown,
) {
  logSanitizedError(logger, "provider", error);

  return MIURA_PROVIDER_ERROR_RESPONSE;
}

function logSanitizedError(
  logger: Pick<Console, "error">,
  category: "config" | "retrieval" | "provider",
  error: unknown,
) {
  logger.error("[MIURA chat] controlled failure", {
    category,
    name: error instanceof Error ? error.name : typeof error,
  });
}

async function readRequestJson(
  request: Request,
): Promise<
  { success: true; data: unknown } | { success: false; message: string }
> {
  try {
    return {
      success: true,
      data: await request.json(),
    };
  } catch {
    return {
      success: false,
      message: "El cuerpo de la petición debe ser JSON válido.",
    };
  }
}

function formatChatValidationError(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}) {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return "El payload del chat no es válido.";
  }

  const path =
    firstIssue.path.length > 0 ? firstIssue.path.map(String).join(".") : "raíz";

  return `El payload del chat no es válido: ${path}: ${firstIssue.message}`;
}

function jsonError(status: number, message: string) {
  return Response.json(
    {
      error: {
        message,
      },
    },
    {
      status,
      headers: RESPONSE_HEADERS,
    },
  );
}

function firstNonEmptyString(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
}

function readBooleanEnv(rawValue: string | undefined, fallback: boolean) {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(rawValue.trim().toLowerCase());
}

function readIntegerEnv(
  rawValue: string | undefined,
  fallback: number,
  label: string,
  min: number,
  max: number,
) {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < min ||
    parsedValue > max
  ) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }

  return parsedValue;
}

function requireConfigValue(value: string | undefined, label: string) {
  if (!value || value.trim() === "") {
    throw new Error(`${label} is required for MIURA chat.`);
  }

  return value.trim();
}

export {
  DEFAULT_CHAT_MAX_OUTPUT_TOKENS,
  DEFAULT_OPENAI_CHAT_MODEL,
  MIURA_NO_SOURCES_RESPONSE,
  MIURA_PROVIDER_ERROR_RESPONSE,
  buildMiuraChatSystemPrompt,
  handleMiuraChatRequest,
  readMiuraChatConfig,
  type MiuraChatConfig,
  type MiuraChatDependencies,
  type StreamTextInput,
  type StreamTextResultLike,
};
