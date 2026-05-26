import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  assertNoUnexpectedKnowledgeFiles,
  buildIngestionPathReferences,
  prepareKnowledgeIngestion,
  readKnowledgeManifest,
} from "@/lib/miura/rag/knowledge-ingestion";

const repoRoot = process.cwd();

describe("MIURA knowledge ingestion preparation", () => {
  test("prepares the controlled corpus with deterministic document and chunk counts", async () => {
    const plan = await prepareKnowledgeIngestion({ rootDir: repoRoot });

    expect(plan.summary.documentCount).toBe(7);
    expect(plan.summary.chunkCount).toBe(10);
    expect(plan.summary.embeddingModel).toBe("text-embedding-3-small");
    expect(plan.summary.embeddingDimensions).toBe(1536);
    expect(plan.checksumResults.every((result) => result.ok)).toBe(true);

    expect(plan.documents.map((document) => document.documentRow.id)).toEqual([
      "kanban-guide-miura-notes",
      "miura-alcance-disclaimers",
      "miura-pilares-metricas-rubricas",
      "miura-formulas-cobertura-escenarios",
      "miura-recomendaciones-scrum-kanban",
      "miura-tfg-seleccion-metodologica",
      "scrum-guide-2020-miura-notes",
    ]);

    const tfgDocument = plan.documents.find(
      (document) =>
        document.documentRow.id === "miura-tfg-seleccion-metodologica",
    );

    expect(tfgDocument?.chunkCount).toBe(4);
  });

  test("deduplicates shared corpus paths while preserving source references", async () => {
    const manifest = await readKnowledgeManifest(repoRoot);
    const pathReferences = buildIngestionPathReferences(manifest);
    const kanbanReferences = pathReferences.get(
      "knowledge/kanban/kanban-guide-miura-notes.md",
    );

    expect(pathReferences.size).toBe(7);
    expect(kanbanReferences?.map((reference) => reference.source.id)).toEqual([
      "kanban-guide-2025-official",
      "kanban-university-official-method",
    ]);

    const plan = await prepareKnowledgeIngestion({ rootDir: repoRoot });
    const kanbanDocument = plan.documents.find(
      (document) => document.documentRow.id === "kanban-guide-miura-notes",
    );

    expect(kanbanDocument?.sourceIds).toEqual([
      "kanban-guide-2025-official",
      "kanban-university-official-method",
    ]);
    expect(kanbanDocument?.documentRow.metadata.sourceIds).toEqual([
      "kanban-guide-2025-official",
      "kanban-university-official-method",
    ]);
  });

  test("creates deterministic chunk identifiers with citation metadata", async () => {
    const plan = await prepareKnowledgeIngestion({ rootDir: repoRoot });

    for (const document of plan.documents) {
      const chunks = plan.chunks.filter(
        (chunk) => chunk.chunkRow.document_id === document.documentRow.id,
      );

      expect(chunks).toHaveLength(document.chunkCount);
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkRow.id).toBe(
          `${document.documentRow.id}-chunk-${index}`,
        );
        expect(chunk.chunkRow.chunk_index).toBe(index);
        expect(chunk.chunkRow.section).toBeTruthy();
        expect(chunk.chunkRow.content_hash).toMatch(/^[a-f0-9]{64}$/);
        expect(chunk.chunkRow.metadata.localPath).toBe(document.localPath);
        expect(chunk.chunkRow.metadata.embedding).toEqual({
          model: "text-embedding-3-small",
          dimensions: 1536,
        });
      });
    }
  });

  test("rejects unexpected files in the knowledge directory", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "miura-knowledge-"));
    const knowledgeDir = path.join(tempRoot, "knowledge");

    await mkdir(knowledgeDir, { recursive: true });
    await writeFile(path.join(knowledgeDir, "checksums.sha256"), "", "utf8");
    await writeFile(path.join(knowledgeDir, ".DS_Store"), "binary", "utf8");

    await expect(
      assertNoUnexpectedKnowledgeFiles({
        rootDir: tempRoot,
        knowledgeDir: "knowledge",
        checksumPath: "knowledge/checksums.sha256",
        checksumEntries: new Map(),
      }),
    ).rejects.toThrow("Unexpected knowledge corpus files found");
  });
});
