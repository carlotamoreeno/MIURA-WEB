import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
} from "@/lib/miura/rag/knowledge-ingestion";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

export const DEFAULT_RAG_TOP_K = 5;
export const DEFAULT_RAG_MATCH_THRESHOLD = 0.25;
export const MAX_RAG_TOP_K = 20;

const jsonRecordSchema = z
  .record(z.string(), z.unknown())
  .superRefine((value, context) => {
    if (!isJsonRecord(value)) {
      context.addIssue({
        code: "custom",
        message: "Expected a JSON-compatible object.",
      });
    }
  })
  .transform((value) => value as JsonRecord);

const knowledgeChunkRpcRowSchema = z.object({
  chunk_id: z.string().min(1),
  document_id: z.string().min(1),
  document_title: z.string().min(1),
  source_type: z.string().min(1),
  content: z.string().min(1),
  page: z.number().int().positive().nullable(),
  section: z.string().nullable(),
  url: z.string().nullable(),
  language: z.string().min(1),
  version: z.string().nullable(),
  license: z.string().nullable(),
  canonical_url: z.string().nullable(),
  local_path: z.string().min(1),
  document_metadata: jsonRecordSchema,
  chunk_metadata: jsonRecordSchema,
  document_content_hash: z.string().min(1),
  chunk_content_hash: z.string().min(1),
  similarity: z.number().finite(),
});

const knowledgeChunkRpcRowsSchema = z.array(knowledgeChunkRpcRowSchema);

export type KnowledgeChunkRpcRow = z.infer<typeof knowledgeChunkRpcRowSchema>;

export interface MiuraRagRetrieverConfig {
  openAiApiKey: string;
  supabaseUrl: string;
  supabaseServerKey: string;
  embeddingModel: string;
  embeddingDimensions: number;
  topK: number;
  matchThreshold: number;
}

export interface MiuraRagRetrieverPublicConfig {
  embeddingModel: string;
  embeddingDimensions: number;
  topK: number;
  matchThreshold: number;
}

export interface MiuraRagRetrieverConfigInput {
  env?: Record<string, string | undefined>;
  openAiApiKey?: string;
  supabaseUrl?: string;
  supabaseServerKey?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  topK?: number;
  matchThreshold?: number;
}

export interface MiuraKnowledgeCitation {
  id: string;
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: string;
  section: string | null;
  page: number | null;
  snippet: string;
  score: number;
  url: string | null;
  localPath: string;
  sourceIds: string[];
  sourceTitles: string[];
  citationLabel: string | null;
}

export interface MiuraKnowledgeRetrievedChunk {
  id: string;
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  citation: MiuraKnowledgeCitation;
  metadata: {
    document: JsonRecord;
    chunk: JsonRecord;
    language: string;
    version: string | null;
    license: string | null;
    canonicalUrl: string | null;
    documentContentHash: string;
    chunkContentHash: string;
  };
}

export interface MiuraKnowledgeRetrievalResult {
  query: string;
  hasSufficientSources: boolean;
  chunks: MiuraKnowledgeRetrievedChunk[];
  citations: MiuraKnowledgeCitation[];
  config: MiuraRagRetrieverPublicConfig;
}

export interface RetrieveMiuraKnowledgeOptions extends MiuraRagRetrieverConfigInput {
  filter?: JsonRecord;
  embedQuery?: (query: string) => Promise<number[]>;
  matchKnowledgeChunks?: (
    request: MatchKnowledgeChunksRequest,
  ) => Promise<KnowledgeChunkRpcRow[]>;
  supabaseClient?: SupabaseClient;
}

export interface MatchKnowledgeChunksRequest {
  queryEmbedding: number[];
  topK: number;
  matchThreshold: number;
  filter: JsonRecord;
}

export function readMiuraRagRetrieverConfig({
  env = process.env,
  openAiApiKey,
  supabaseUrl,
  supabaseServerKey,
  embeddingModel,
  embeddingDimensions,
  topK,
  matchThreshold,
}: MiuraRagRetrieverConfigInput = {}): MiuraRagRetrieverConfig {
  const resolvedEmbeddingDimensions =
    embeddingDimensions ??
    readPositiveIntegerEnv(
      env.MIURA_EMBEDDING_DIMENSIONS,
      DEFAULT_EMBEDDING_DIMENSIONS,
      "MIURA_EMBEDDING_DIMENSIONS",
    );

  if (resolvedEmbeddingDimensions !== DEFAULT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `MIURA RAG schema expects ${DEFAULT_EMBEDDING_DIMENSIONS} embedding dimensions; received ${resolvedEmbeddingDimensions}.`,
    );
  }

  return {
    openAiApiKey: requireConfigValue(
      openAiApiKey ?? env.OPENAI_API_KEY,
      "OPENAI_API_KEY",
    ),
    supabaseUrl: requireConfigValue(
      supabaseUrl ?? env.SUPABASE_URL,
      "SUPABASE_URL",
    ),
    supabaseServerKey: requireConfigValue(
      supabaseServerKey ??
        env.SUPABASE_SERVICE_ROLE_KEY ??
        env.SUPABASE_SECRET_KEY,
      "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
    ),
    embeddingModel:
      firstNonEmptyString(
        embeddingModel,
        env.OPENAI_EMBEDDING_MODEL,
        env.EMBEDDING_MODEL,
      ) ?? DEFAULT_EMBEDDING_MODEL,
    embeddingDimensions: resolvedEmbeddingDimensions,
    topK: validateTopK(
      topK ??
        readTopKEnv(
          env.MIURA_RAG_TOP_K ?? env.RAG_TOP_K,
          DEFAULT_RAG_TOP_K,
          "MIURA_RAG_TOP_K",
        ),
      "topK",
    ),
    matchThreshold: validateThreshold(
      matchThreshold ??
        readThresholdEnv(
          env.MIURA_RAG_MATCH_THRESHOLD ?? env.RAG_MATCH_THRESHOLD,
          DEFAULT_RAG_MATCH_THRESHOLD,
          "MIURA_RAG_MATCH_THRESHOLD",
        ),
      "matchThreshold",
    ),
  };
}

function firstNonEmptyString(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== "");
}

export function toPublicRetrieverConfig(
  config: MiuraRagRetrieverConfig,
): MiuraRagRetrieverPublicConfig {
  return {
    embeddingModel: config.embeddingModel,
    embeddingDimensions: config.embeddingDimensions,
    topK: validateTopK(config.topK, "topK"),
    matchThreshold: validateThreshold(config.matchThreshold, "matchThreshold"),
  };
}

export function parseKnowledgeChunkRpcRows(
  data: unknown,
): KnowledgeChunkRpcRow[] {
  const parsed = knowledgeChunkRpcRowsSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error(
      `Invalid knowledge chunk RPC rows: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }

  return parsed.data;
}

export function buildMiuraKnowledgeRetrievalResult({
  query,
  rows,
  config,
}: {
  query: string;
  rows: KnowledgeChunkRpcRow[];
  config: MiuraRagRetrieverConfig;
}): MiuraKnowledgeRetrievalResult {
  const publicConfig = toPublicRetrieverConfig(config);
  const chunks = rows
    .filter((row) => row.similarity >= publicConfig.matchThreshold)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, publicConfig.topK)
    .map(mapKnowledgeChunkRow);

  return {
    query,
    hasSufficientSources: chunks.length > 0,
    chunks,
    citations: chunks.map((chunk) => chunk.citation),
    config: publicConfig,
  };
}

export async function retrieveMiuraKnowledge(
  query: string,
  options: RetrieveMiuraKnowledgeOptions = {},
): Promise<MiuraKnowledgeRetrievalResult> {
  assertServerRuntime();

  const normalizedQuery = normalizeQuery(query);
  const config = readMiuraRagRetrieverConfig(options);

  if (!normalizedQuery) {
    return buildMiuraKnowledgeRetrievalResult({
      query: "",
      rows: [],
      config,
    });
  }

  const publicConfig = toPublicRetrieverConfig(config);
  const queryEmbedding = await embedKnowledgeQuery(normalizedQuery, {
    config,
    embedQuery: options.embedQuery,
  });
  const rows = options.matchKnowledgeChunks
    ? await options.matchKnowledgeChunks({
        queryEmbedding,
        topK: publicConfig.topK,
        matchThreshold: publicConfig.matchThreshold,
        filter: normalizeFilter(options.filter),
      })
    : await matchKnowledgeChunksWithSupabase({
        supabase:
          options.supabaseClient ?? createMiuraKnowledgeSupabaseClient(config),
        queryEmbedding,
        topK: publicConfig.topK,
        matchThreshold: publicConfig.matchThreshold,
        filter: normalizeFilter(options.filter),
      });

  return buildMiuraKnowledgeRetrievalResult({
    query: normalizedQuery,
    rows,
    config,
  });
}

export function createMiuraKnowledgeSupabaseClient(
  config: MiuraRagRetrieverConfig,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServerKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function matchKnowledgeChunksWithSupabase({
  supabase,
  queryEmbedding,
  topK,
  matchThreshold,
  filter,
}: {
  supabase: SupabaseClient;
  queryEmbedding: number[];
  topK: number;
  matchThreshold: number;
  filter: JsonRecord;
}): Promise<KnowledgeChunkRpcRow[]> {
  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
    filter,
    match_threshold: matchThreshold,
  });

  if (error) {
    throw new Error(`MIURA RAG retrieval failed: ${error.message}`);
  }

  return parseKnowledgeChunkRpcRows(data);
}

async function embedKnowledgeQuery(
  query: string,
  {
    config,
    embedQuery,
  }: {
    config: MiuraRagRetrieverConfig;
    embedQuery?: (query: string) => Promise<number[]>;
  },
): Promise<number[]> {
  const embedding = embedQuery
    ? await embedQuery(query)
    : await new OpenAIEmbeddings({
        apiKey: config.openAiApiKey,
        model: config.embeddingModel,
        dimensions: config.embeddingDimensions,
        maxConcurrency: 2,
      }).embedQuery(query);

  if (embedding.length !== config.embeddingDimensions) {
    throw new Error(
      `Query embedding dimension mismatch: expected ${config.embeddingDimensions}, received ${embedding.length}.`,
    );
  }

  return embedding;
}

function mapKnowledgeChunkRow(
  row: KnowledgeChunkRpcRow,
): MiuraKnowledgeRetrievedChunk {
  const sourceIds = uniqueStrings([
    ...getStringArray(row.document_metadata, "sourceIds"),
    ...getStringArray(row.chunk_metadata, "sourceIds"),
  ]);
  const sourceTitles = uniqueStrings([
    ...getStringArray(row.document_metadata, "sourceTitles"),
    ...getStringArray(row.chunk_metadata, "sourceTitles"),
  ]);
  const citationLabel =
    getString(row.chunk_metadata, "citationLabel") ??
    getString(row.document_metadata, "citationLabel");
  const url = row.url ?? row.canonical_url;
  const citation: MiuraKnowledgeCitation = {
    id: `${row.document_id}:${row.chunk_id}`,
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    sourceType: row.source_type,
    section: normalizeNullableString(row.section),
    page: row.page,
    snippet: createCitationSnippet(row.content),
    score: row.similarity,
    url,
    localPath: row.local_path,
    sourceIds,
    sourceTitles: sourceTitles.length > 0 ? sourceTitles : [row.document_title],
    citationLabel,
  };

  return {
    id: row.chunk_id,
    chunkId: row.chunk_id,
    documentId: row.document_id,
    content: row.content,
    score: row.similarity,
    citation,
    metadata: {
      document: row.document_metadata,
      chunk: row.chunk_metadata,
      language: row.language,
      version: row.version,
      license: row.license,
      canonicalUrl: row.canonical_url,
      documentContentHash: row.document_content_hash,
      chunkContentHash: row.chunk_content_hash,
    },
  };
}

function createCitationSnippet(content: string, maxLength = 280): string {
  const normalized = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()|:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength).trimEnd();
  const lastSpace = clipped.lastIndexOf(" ");
  const endIndex = lastSpace > maxLength * 0.6 ? lastSpace : clipped.length;

  return `${clipped.slice(0, endIndex).trimEnd()}...`;
}

function normalizeQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

function normalizeFilter(filter: JsonRecord | undefined): JsonRecord {
  if (filter === undefined) {
    return {};
  }

  if (!isJsonRecord(filter)) {
    throw new Error("RAG retrieval filter must be a JSON-compatible object.");
  }

  return filter;
}

function normalizeNullableString(value: string | null): string | null {
  if (value === null || value.trim() === "") {
    return null;
  }

  return value;
}

function readPositiveIntegerEnv(
  rawValue: string | undefined,
  fallback: number,
  label: string,
): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsedValue;
}

function readTopKEnv(
  rawValue: string | undefined,
  fallback: number,
  label: string,
): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  return validateTopK(Number.parseInt(rawValue, 10), label);
}

function readThresholdEnv(
  rawValue: string | undefined,
  fallback: number,
  label: string,
): number {
  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  return validateThreshold(Number.parseFloat(rawValue), label);
}

function validateTopK(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_RAG_TOP_K) {
    throw new Error(
      `${label} must be an integer between 1 and ${MAX_RAG_TOP_K}.`,
    );
  }

  return value;
}

function validateThreshold(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a number between 0 and 1.`);
  }

  return value;
}

function requireConfigValue(value: string | undefined, label: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${label} is required for MIURA RAG retrieval.`);
  }

  return value.trim();
}

function getString(record: JsonRecord, key: string): string | null {
  const value = record[key];

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function getStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== "",
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return isPlainObject(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return Number.isFinite(value) || typeof value !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonRecord(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("MIURA RAG retrieval must run server-side only.");
  }
}
