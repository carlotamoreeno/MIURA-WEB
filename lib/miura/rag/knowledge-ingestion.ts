import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { z } from "zod";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, JsonValue>;

const sourceSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sourceType: z.string().min(1).optional(),
    language: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    canonicalUrl: z.string().min(1).optional(),
    localPath: z.string().min(1).optional(),
    license: z.string().min(1).optional(),
    includeForDirectIngestion: z.boolean().optional(),
    generatedCorpusPaths: z.array(z.string().min(1)).optional(),
    sourceSelectionPath: z.string().min(1).optional(),
    generatedFrom: z.string().min(1).optional(),
  })
  .passthrough();

const manifestSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    validatedOn: z.string().min(1),
    project: z.string().min(1),
    embedding: z
      .object({
        model: z.string().min(1),
        dimensions: z.number().int().positive(),
        defaultLanguage: z.string().min(1),
      })
      .passthrough(),
    chunking: z
      .object({
        targetTokens: z.number().int().positive(),
        overlapTokens: z.number().int().nonnegative(),
        preserveHeadings: z.boolean(),
        preserveFrontMatter: z.boolean(),
      })
      .passthrough(),
    sources: z.array(sourceSchema).min(1),
  })
  .passthrough();

export type SourceManifest = z.infer<typeof sourceSchema>;
export type KnowledgeManifest = z.infer<typeof manifestSchema>;

export type PathReferenceKind = "direct" | "generated";

export interface PathReference {
  kind: PathReferenceKind;
  source: SourceManifest;
}

interface MarkdownBlock {
  text: string;
  section: string;
}

interface PreparedChunk {
  content: string;
  sections: string[];
  tokenCount: number;
  overlapTokenCount: number;
}

export interface KnowledgeIngestionOptions {
  rootDir: string;
  knowledgeDir?: string;
  manifestPath?: string;
  checksumPath?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
  targetTokens?: number;
  overlapTokens?: number;
}

export interface KnowledgeDocumentRow {
  id: string;
  source_type: string;
  title: string;
  author: string | null;
  version: string | null;
  language: string;
  canonical_url: string | null;
  local_path: string;
  license: string | null;
  metadata: JsonRecord;
  content_hash: string;
}

export interface KnowledgeChunkRowWithoutEmbedding {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  page: number | null;
  section: string | null;
  url: string | null;
  metadata: JsonRecord;
  content_hash: string;
}

export interface PreparedKnowledgeDocument {
  documentRow: KnowledgeDocumentRow;
  sourceIds: string[];
  localPath: string;
  chunkCount: number;
  tokenCount: number;
}

export interface PreparedKnowledgeChunk {
  chunkRow: KnowledgeChunkRowWithoutEmbedding;
  sourceIds: string[];
}

export interface KnowledgeIngestionPlan {
  manifest: KnowledgeManifest;
  documents: PreparedKnowledgeDocument[];
  chunks: PreparedKnowledgeChunk[];
  checksumResults: ChecksumVerificationResult[];
  summary: {
    documentCount: number;
    chunkCount: number;
    tokenCount: number;
    embeddingModel: string;
    embeddingDimensions: number;
    targetTokens: number;
    overlapTokens: number;
  };
}

export interface ChecksumVerificationResult {
  relativePath: string;
  expectedHash: string;
  actualHash: string;
  ok: boolean;
}

export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_TARGET_TOKENS = 800;
export const DEFAULT_OVERLAP_TOKENS = 160;

const allowedKnowledgeExtensions = new Set([".md", ".json", ".sha256"]);

export async function prepareKnowledgeIngestion(
  options: KnowledgeIngestionOptions,
): Promise<KnowledgeIngestionPlan> {
  const knowledgeDir = normalizeRelativePath(
    options.knowledgeDir ?? "knowledge",
  );
  const manifestPath = normalizeRelativePath(
    options.manifestPath ?? path.posix.join(knowledgeDir, "sources.json"),
  );
  const checksumPath = normalizeRelativePath(
    options.checksumPath ?? path.posix.join(knowledgeDir, "checksums.sha256"),
  );
  const embeddingModel = options.embeddingModel ?? DEFAULT_EMBEDDING_MODEL;
  const embeddingDimensions =
    options.embeddingDimensions ?? DEFAULT_EMBEDDING_DIMENSIONS;
  const targetTokens = options.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  if (embeddingDimensions !== DEFAULT_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `MIURA RAG schema expects ${DEFAULT_EMBEDDING_DIMENSIONS} embedding dimensions; received ${embeddingDimensions}.`,
    );
  }

  if (overlapTokens >= targetTokens) {
    throw new Error("overlapTokens must be lower than targetTokens.");
  }

  const manifest = await readKnowledgeManifest(options.rootDir, manifestPath);
  const checksumEntries = await readChecksumEntries(
    options.rootDir,
    checksumPath,
  );

  await assertNoUnexpectedKnowledgeFiles({
    rootDir: options.rootDir,
    knowledgeDir,
    checksumPath,
    checksumEntries,
  });

  const checksumResults = await verifyKnowledgeChecksums({
    rootDir: options.rootDir,
    checksumEntries,
  });
  const failedChecksums = checksumResults.filter((result) => !result.ok);

  if (failedChecksums.length > 0) {
    throw new Error(
      `Knowledge checksum validation failed for: ${failedChecksums
        .map((result) => result.relativePath)
        .join(", ")}.`,
    );
  }

  const ingestionPaths = buildIngestionPathReferences(manifest);
  const documents: PreparedKnowledgeDocument[] = [];
  const chunks: PreparedKnowledgeChunk[] = [];

  for (const [relativePath, references] of ingestionPaths) {
    const absolutePath = resolveSafePath(options.rootDir, relativePath);
    const fileBuffer = await readFile(absolutePath);
    const fileContent = fileBuffer.toString("utf8");
    const parsed = matter(fileContent);
    const frontMatter = parsed.data as Record<string, unknown>;
    const body = parsed.content.trim();
    const frontMatterIngestion = getRecord(frontMatter, "ingestion");

    if (getBoolean(frontMatterIngestion, "include") !== true) {
      throw new Error(
        `Knowledge file ${relativePath} is selected by sources.json but front matter ingestion.include is not true.`,
      );
    }

    const documentId = requireString(frontMatter, "id", relativePath);
    const title = requireString(frontMatter, "title", relativePath);
    const sourceType =
      getString(frontMatter, "source_type") ??
      references[0]?.source.sourceType ??
      "knowledge_source";
    const language =
      getString(frontMatter, "language") ??
      references[0]?.source.language ??
      manifest.embedding.defaultLanguage;
    const canonicalUrl =
      getString(frontMatter, "canonical_url") ??
      getString(frontMatter, "canonical_guide_url") ??
      references.find((reference) => reference.source.canonicalUrl)?.source
        .canonicalUrl ??
      null;
    const license =
      getString(frontMatter, "license") ??
      getString(frontMatter, "license_notes") ??
      references.find((reference) => reference.source.license)?.source
        .license ??
      null;
    const version =
      getString(frontMatter, "version") ??
      getString(frontMatter, "version_reference") ??
      references.find((reference) => reference.source.version)?.source
        .version ??
      null;
    const sourceIds = references.map((reference) => reference.source.id);
    const sourceTitles = references.map((reference) => reference.source.title);
    const sourceTypes = uniqueStrings(
      references
        .map((reference) => reference.source.sourceType)
        .filter((value): value is string => typeof value === "string"),
    );
    const author = normalizeAuthor(frontMatter, references);
    const fileHash = sha256(fileBuffer);
    const documentTokenCount = estimateTokenCount(body);
    const documentMetadata = compactJsonRecord({
      sourceIds,
      sourceTitles,
      sourceTypes,
      sourceReferenceKinds: uniqueStrings(
        references.map((reference) => reference.kind),
      ),
      localPath: relativePath,
      status: getString(frontMatter, "status"),
      validatedOn: getString(frontMatter, "validated_on"),
      citationLabel: getString(frontMatterIngestion, "citation_label"),
      generatedFrom:
        toJsonValueOrNull(frontMatter.generated_from) ??
        references.find((reference) => reference.source.generatedFrom)?.source
          .generatedFrom ??
        null,
      sourceSelectionPaths: uniqueStrings(
        references
          .map((reference) => reference.source.sourceSelectionPath)
          .filter((value): value is string => typeof value === "string"),
      ),
      frontMatter: toJsonValue(frontMatter),
      embedding: {
        model: embeddingModel,
        dimensions: embeddingDimensions,
      },
      chunking: {
        targetTokens,
        overlapTokens,
      },
    });
    const documentRow: KnowledgeDocumentRow = {
      id: documentId,
      source_type: sourceType,
      title,
      author,
      version,
      language,
      canonical_url: canonicalUrl,
      local_path: relativePath,
      license,
      metadata: documentMetadata,
      content_hash: fileHash,
    };
    const markdownChunks = chunkMarkdown(body, {
      defaultSection: title,
      overlapTokens,
      targetTokens,
    });

    documents.push({
      documentRow,
      sourceIds,
      localPath: relativePath,
      chunkCount: markdownChunks.length,
      tokenCount: documentTokenCount,
    });

    markdownChunks.forEach((chunk, index) => {
      const chunkId = `${documentId}-chunk-${index}`;
      const section = chunk.sections[0] ?? title;
      const chunkMetadata = compactJsonRecord({
        documentId,
        sourceIds,
        title,
        localPath: relativePath,
        sections: chunk.sections,
        overlapTokenCount: chunk.overlapTokenCount,
        citationLabel: getString(frontMatterIngestion, "citation_label"),
        embedding: {
          model: embeddingModel,
          dimensions: embeddingDimensions,
        },
        chunking: {
          targetTokens,
          overlapTokens,
        },
      });

      chunks.push({
        chunkRow: {
          id: chunkId,
          document_id: documentId,
          chunk_index: index,
          content: chunk.content,
          token_count: chunk.tokenCount,
          page: null,
          section,
          url: canonicalUrl,
          metadata: chunkMetadata,
          content_hash: sha256(Buffer.from(chunk.content, "utf8")),
        },
        sourceIds,
      });
    });
  }

  return {
    manifest,
    documents,
    chunks,
    checksumResults,
    summary: {
      documentCount: documents.length,
      chunkCount: chunks.length,
      tokenCount: documents.reduce(
        (total, document) => total + document.tokenCount,
        0,
      ),
      embeddingModel,
      embeddingDimensions,
      targetTokens,
      overlapTokens,
    },
  };
}

export async function readKnowledgeManifest(
  rootDir: string,
  relativePath = "knowledge/sources.json",
): Promise<KnowledgeManifest> {
  const manifestJson = await readFile(resolveSafePath(rootDir, relativePath), {
    encoding: "utf8",
  });
  const parsed: unknown = JSON.parse(manifestJson);

  return manifestSchema.parse(parsed);
}

export async function readChecksumEntries(
  rootDir: string,
  checksumPath = "knowledge/checksums.sha256",
): Promise<Map<string, string>> {
  const checksumText = await readFile(resolveSafePath(rootDir, checksumPath), {
    encoding: "utf8",
  });
  const entries = new Map<string, string>();

  checksumText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = /^([a-f0-9]{64})\s+(.+)$/.exec(line);

      if (!match?.[1] || !match[2]) {
        throw new Error(`Invalid checksum line: ${line}`);
      }

      entries.set(normalizeRelativePath(match[2]), match[1]);
    });

  return entries;
}

export async function verifyKnowledgeChecksums({
  rootDir,
  checksumEntries,
}: {
  rootDir: string;
  checksumEntries: Map<string, string>;
}): Promise<ChecksumVerificationResult[]> {
  const results: ChecksumVerificationResult[] = [];

  for (const [relativePath, expectedHash] of checksumEntries) {
    const fileBuffer = await readFile(resolveSafePath(rootDir, relativePath));
    const actualHash = sha256(fileBuffer);

    results.push({
      relativePath,
      expectedHash,
      actualHash,
      ok: actualHash === expectedHash,
    });
  }

  return results;
}

export async function assertNoUnexpectedKnowledgeFiles({
  rootDir,
  knowledgeDir,
  checksumPath,
  checksumEntries,
}: {
  rootDir: string;
  knowledgeDir: string;
  checksumPath: string;
  checksumEntries: Map<string, string>;
}): Promise<void> {
  const allowedFiles = new Set([...checksumEntries.keys(), checksumPath]);
  const allFiles = await listFilesRecursively(
    resolveSafePath(rootDir, knowledgeDir),
  );
  const unexpectedFiles = allFiles
    .map((absolutePath) =>
      normalizeRelativePath(path.relative(rootDir, absolutePath)),
    )
    .filter((relativePath) => {
      const extension = path.extname(relativePath);

      return (
        !allowedFiles.has(relativePath) ||
        !allowedKnowledgeExtensions.has(extension)
      );
    });

  if (unexpectedFiles.length > 0) {
    throw new Error(
      `Unexpected knowledge corpus files found: ${unexpectedFiles.join(", ")}.`,
    );
  }
}

export function buildIngestionPathReferences(
  manifest: KnowledgeManifest,
): Map<string, PathReference[]> {
  const referencesByPath = new Map<string, PathReference[]>();

  for (const source of manifest.sources) {
    if (source.includeForDirectIngestion === true && source.localPath) {
      addPathReference(referencesByPath, source.localPath, {
        kind: "direct",
        source,
      });
    }

    for (const generatedPath of source.generatedCorpusPaths ?? []) {
      addPathReference(referencesByPath, generatedPath, {
        kind: "generated",
        source,
      });
    }
  }

  return new Map(
    [...referencesByPath.entries()]
      .filter(([relativePath]) => relativePath.endsWith(".md"))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function chunkMarkdown(
  markdown: string,
  {
    defaultSection,
    targetTokens = DEFAULT_TARGET_TOKENS,
    overlapTokens = DEFAULT_OVERLAP_TOKENS,
  }: {
    defaultSection: string;
    targetTokens?: number;
    overlapTokens?: number;
  },
): PreparedChunk[] {
  const blocks = splitMarkdownBlocks(markdown, defaultSection);
  const chunks: PreparedChunk[] = [];
  let currentContent = "";
  let currentSections: string[] = [];
  let currentTokenCount = 0;
  let currentOverlapTokenCount = 0;

  function pushCurrent() {
    if (!currentContent.trim()) return;

    chunks.push({
      content: currentContent.trim(),
      sections: uniqueStrings(currentSections),
      tokenCount: estimateTokenCount(currentContent),
      overlapTokenCount: currentOverlapTokenCount,
    });
  }

  for (const block of blocks) {
    const blockTokenCount = estimateTokenCount(block.text);

    if (
      currentContent.trim() &&
      currentTokenCount + blockTokenCount > targetTokens
    ) {
      pushCurrent();

      const overlapText = takeLastWords(currentContent, overlapTokens);
      currentContent = overlapText
        ? `${overlapText}\n\n${block.text}`
        : block.text;
      currentSections = [block.section];
      currentTokenCount = estimateTokenCount(currentContent);
      currentOverlapTokenCount = estimateTokenCount(overlapText);
      continue;
    }

    currentContent = currentContent
      ? `${currentContent}\n\n${block.text}`
      : block.text;
    currentSections.push(block.section);
    currentTokenCount += blockTokenCount;
  }

  pushCurrent();

  return chunks;
}

export function estimateTokenCount(text: string): number {
  return text.trim().match(/\S+/g)?.length ?? 0;
}

export function sha256(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function addPathReference(
  referencesByPath: Map<string, PathReference[]>,
  relativePath: string,
  reference: PathReference,
) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const currentReferences = referencesByPath.get(normalizedPath) ?? [];

  currentReferences.push(reference);
  referencesByPath.set(normalizedPath, currentReferences);
}

function splitMarkdownBlocks(
  markdown: string,
  defaultSection: string,
): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let currentLines: string[] = [];
  let currentSection = defaultSection;

  function flushCurrent() {
    const text = currentLines.join("\n").trim();

    if (text) {
      blocks.push({ text, section: currentSection });
    }
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);

    if (heading?.[2]) {
      flushCurrent();
      currentSection = heading[2].trim();
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  flushCurrent();

  return blocks;
}

async function listFilesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry);
    const entryStat = await stat(absolutePath);

    if (entryStat.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath)));
    } else if (entryStat.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  const collapsed = path.posix.normalize(normalized);

  if (
    path.isAbsolute(relativePath) ||
    collapsed === "." ||
    collapsed.startsWith("../") ||
    collapsed.includes("/../")
  ) {
    throw new Error(`Unsafe relative path: ${relativePath}`);
  }

  return collapsed;
}

function resolveSafePath(rootDir: string, relativePath: string): string {
  const normalizedRelativePath = normalizeRelativePath(relativePath);
  const absolutePath = path.resolve(rootDir, normalizedRelativePath);
  const absoluteRoot = path.resolve(rootDir);

  if (!absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }

  return absolutePath;
}

function normalizeAuthor(
  frontMatter: Record<string, unknown>,
  references: PathReference[],
): string | null {
  const frontMatterAuthors =
    getString(frontMatter, "author") ?? getString(frontMatter, "authors");

  if (frontMatterAuthors) {
    return frontMatterAuthors;
  }

  const arrayAuthors = frontMatter.authors;

  if (
    Array.isArray(arrayAuthors) &&
    arrayAuthors.every((author): author is string => typeof author === "string")
  ) {
    return arrayAuthors.join("; ");
  }

  const manifestAuthors = references
    .map((reference) => reference.source.authors)
    .filter((authors): authors is unknown[] => Array.isArray(authors))
    .flat()
    .filter((author): author is string => typeof author === "string");

  return manifestAuthors.length > 0
    ? uniqueStrings(manifestAuthors).join("; ")
    : null;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = getString(record, key);

  if (!value) {
    throw new Error(
      `Missing required front matter field "${key}" in ${context}.`,
    );
  }

  return value;
}

function getString(
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getBoolean(
  record: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined {
  const value = record?.[key];

  return typeof value === "boolean" ? value : undefined;
}

function getRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = record[key];

  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function takeLastWords(text: string, maxWords: number): string {
  if (maxWords === 0) return "";

  const words = text.trim().match(/\S+/g) ?? [];

  return words.slice(Math.max(0, words.length - maxWords)).join(" ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function compactJsonRecord(record: Record<string, unknown>): JsonRecord {
  const result: JsonRecord = {};

  for (const [key, value] of Object.entries(record)) {
    const jsonValue = toJsonValueOrNull(value);

    if (jsonValue !== null) {
      result[key] = jsonValue;
    }
  }

  return result;
}

function toJsonValueOrNull(value: unknown): JsonValue | null {
  if (value === undefined || value === null) return null;

  return toJsonValue(value);
}

function toJsonValue(value: unknown): JsonValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .map(([key, nestedValue]) => [key, toJsonValue(nestedValue)]),
    );
  }

  return String(value);
}
