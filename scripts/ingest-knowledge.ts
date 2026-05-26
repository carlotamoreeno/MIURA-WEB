#!/usr/bin/env node
import path from "node:path";

import { openai } from "@ai-sdk/openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { config as loadDotenv } from "dotenv";

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OVERLAP_TOKENS,
  DEFAULT_TARGET_TOKENS,
  prepareKnowledgeIngestion,
  type KnowledgeChunkRowWithoutEmbedding,
  type KnowledgeDocumentRow,
  type KnowledgeIngestionPlan,
} from "@/lib/miura/rag/knowledge-ingestion";

interface CliOptions {
  dryRun: boolean;
  expectedDocuments?: number;
  expectedChunks?: number;
}

interface RuntimeConfig {
  embeddingModel: string;
  embeddingDimensions: number;
  targetTokens: number;
  overlapTokens: number;
  openAiApiKey?: string;
  supabaseUrl?: string;
  supabaseServerKey?: string;
}

interface KnowledgeChunkInsertRow extends KnowledgeChunkRowWithoutEmbedding {
  embedding: number[];
}

const startedAt = Date.now();

async function main() {
  loadDotenv({
    path: path.resolve(process.cwd(), ".env"),
    quiet: true,
  });

  const cliOptions = parseCliOptions(process.argv.slice(2));
  const runtimeConfig = readRuntimeConfig();
  const plan = await prepareKnowledgeIngestion({
    rootDir: process.cwd(),
    embeddingModel: runtimeConfig.embeddingModel,
    embeddingDimensions: runtimeConfig.embeddingDimensions,
    targetTokens: runtimeConfig.targetTokens,
    overlapTokens: runtimeConfig.overlapTokens,
  });

  assertExpectedCounts(plan, cliOptions);
  logPlan(plan, cliOptions);

  if (cliOptions.dryRun) {
    console.log(
      "[miura:rag] Dry-run complete. No embeddings or Supabase writes.",
    );
    return;
  }

  const openAiApiKey = requireConfigValue(
    runtimeConfig.openAiApiKey,
    "OPENAI_API_KEY",
  );
  const supabaseUrl = requireConfigValue(
    runtimeConfig.supabaseUrl,
    "SUPABASE_URL",
  );
  const supabaseServerKey = requireConfigValue(
    runtimeConfig.supabaseServerKey,
    "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY",
  );

  process.env.OPENAI_API_KEY = openAiApiKey;

  const embeddings = await generateEmbeddings(plan, runtimeConfig);
  await upsertKnowledgeCorpus({
    plan,
    embeddings,
    supabaseServerKey,
    supabaseUrl,
  });
}

function parseCliOptions(args: string[]): CliOptions {
  if (args.includes("--help")) {
    console.log(`
Usage:
  npm run rag:ingest:dry-run
  npm run rag:ingest

Options:
  --dry-run                 Validate and chunk corpus without external writes.
  --expect-documents=<n>    Fail if prepared document count differs.
  --expect-chunks=<n>       Fail if prepared chunk count differs.
`);
    process.exit(0);
  }

  return {
    dryRun: args.includes("--dry-run"),
    expectedDocuments: parseIntegerFlag(args, "--expect-documents"),
    expectedChunks: parseIntegerFlag(args, "--expect-chunks"),
  };
}

function readRuntimeConfig(): RuntimeConfig {
  return {
    embeddingModel:
      process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL,
    embeddingDimensions: parseIntegerEnv(
      "MIURA_EMBEDDING_DIMENSIONS",
      DEFAULT_EMBEDDING_DIMENSIONS,
    ),
    targetTokens: parseIntegerEnv(
      "MIURA_RAG_CHUNK_TARGET_TOKENS",
      DEFAULT_TARGET_TOKENS,
    ),
    overlapTokens: parseIntegerEnv(
      "MIURA_RAG_CHUNK_OVERLAP_TOKENS",
      DEFAULT_OVERLAP_TOKENS,
    ),
    openAiApiKey: process.env.OPENAI_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServerKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  };
}

function parseIntegerFlag(args: string[], name: string): number | undefined {
  const prefix = `${name}=`;
  const rawValue = args
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);

  if (rawValue === undefined) return undefined;

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return parsedValue;
}

function parseIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function assertExpectedCounts(
  plan: KnowledgeIngestionPlan,
  options: CliOptions,
) {
  if (
    options.expectedDocuments !== undefined &&
    plan.summary.documentCount !== options.expectedDocuments
  ) {
    throw new Error(
      `Expected ${options.expectedDocuments} documents but prepared ${plan.summary.documentCount}.`,
    );
  }

  if (
    options.expectedChunks !== undefined &&
    plan.summary.chunkCount !== options.expectedChunks
  ) {
    throw new Error(
      `Expected ${options.expectedChunks} chunks but prepared ${plan.summary.chunkCount}.`,
    );
  }
}

function logPlan(plan: KnowledgeIngestionPlan, options: CliOptions) {
  const mode = options.dryRun ? "dry-run" : "ingest";

  console.log(`[miura:rag] Mode: ${mode}`);
  console.log(
    `[miura:rag] Embedding: ${plan.summary.embeddingModel} (${plan.summary.embeddingDimensions} dimensions)`,
  );
  console.log(
    `[miura:rag] Chunking: target=${plan.summary.targetTokens}, overlap=${plan.summary.overlapTokens}`,
  );
  console.log(
    `[miura:rag] Prepared ${plan.summary.documentCount} documents, ${plan.summary.chunkCount} chunks, ${plan.summary.tokenCount} estimated tokens.`,
  );

  for (const document of plan.documents) {
    console.log(
      `[miura:rag] ${document.documentRow.id}: ${document.chunkCount} chunks, ${document.tokenCount} tokens, sources=${document.sourceIds.join(",")}`,
    );
  }
}

async function generateEmbeddings(
  plan: KnowledgeIngestionPlan,
  runtimeConfig: RuntimeConfig,
): Promise<number[][]> {
  console.log(
    `[miura:rag] Generating ${plan.chunks.length} embeddings with ${runtimeConfig.embeddingModel}.`,
  );

  const { embeddings, usage } = await embedMany({
    model: openai.embedding(runtimeConfig.embeddingModel),
    values: plan.chunks.map((chunk) => chunk.chunkRow.content),
    maxParallelCalls: parseIntegerEnv("MIURA_RAG_EMBEDDING_PARALLELISM", 2),
    maxRetries: 2,
    providerOptions: {
      openai: {
        dimensions: runtimeConfig.embeddingDimensions,
      },
    },
  });

  const invalidEmbedding = embeddings.find(
    (embedding) => embedding.length !== runtimeConfig.embeddingDimensions,
  );

  if (invalidEmbedding) {
    throw new Error(
      `Embedding dimension mismatch: expected ${runtimeConfig.embeddingDimensions}, received ${invalidEmbedding.length}.`,
    );
  }

  console.log(`[miura:rag] Embedding usage tokens=${usage.tokens}.`);

  return embeddings;
}

async function upsertKnowledgeCorpus({
  plan,
  embeddings,
  supabaseUrl,
  supabaseServerKey,
}: {
  plan: KnowledgeIngestionPlan;
  embeddings: number[][];
  supabaseUrl: string;
  supabaseServerKey: string;
}) {
  const supabase = createClient(supabaseUrl, supabaseServerKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const documentRows: KnowledgeDocumentRow[] = plan.documents.map(
    (document) => document.documentRow,
  );
  const documentIds = documentRows.map((document) => document.id);
  const chunkRows: KnowledgeChunkInsertRow[] = plan.chunks.map(
    (chunk, index) => ({
      ...chunk.chunkRow,
      embedding: embeddings[index] ?? [],
    }),
  );

  console.log(
    `[miura:rag] Upserting ${documentRows.length} knowledge documents.`,
  );

  const documentResult = await supabase
    .from("knowledge_documents")
    .upsert(documentRows, { onConflict: "id" });

  if (documentResult.error) {
    throw documentResult.error;
  }

  console.log(
    `[miura:rag] Replacing chunks for ${documentIds.length} ingested documents.`,
  );

  const deleteResult = await supabase
    .from("knowledge_chunks")
    .delete()
    .in("document_id", documentIds);

  if (deleteResult.error) {
    throw deleteResult.error;
  }

  console.log(`[miura:rag] Inserting ${chunkRows.length} knowledge chunks.`);

  const chunkResult = await supabase.from("knowledge_chunks").insert(chunkRows);

  if (chunkResult.error) {
    throw chunkResult.error;
  }

  await logRemoteCounts({ supabase, documentIds });
  console.log(`[miura:rag] Ingestion complete in ${Date.now() - startedAt}ms.`);
}

async function logRemoteCounts({
  supabase,
  documentIds,
}: {
  supabase: SupabaseClient;
  documentIds: string[];
}) {
  const documentsResult = await supabase
    .from("knowledge_documents")
    .select("id")
    .in("id", documentIds);

  if (documentsResult.error) {
    throw documentsResult.error;
  }

  const chunksResult = await supabase
    .from("knowledge_chunks")
    .select("id, document_id")
    .in("document_id", documentIds);

  if (chunksResult.error) {
    throw chunksResult.error;
  }

  const chunkIds = chunksResult.data.map((chunk) => chunk.id);
  const distinctChunkIds = new Set(chunkIds);

  console.log(
    `[miura:rag] Remote row count: documents=${documentsResult.data.length}, chunks=${chunksResult.data.length}, distinctChunks=${distinctChunkIds.size}.`,
  );
}

function requireConfigValue(value: string | undefined, label: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${label} is required for real corpus ingestion.`);
  }

  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`[miura:rag] Ingestion failed: ${message}`);
  process.exitCode = 1;
});
