import { describe, expect, test } from "vitest";

import {
  buildMiuraKnowledgeRetrievalResult,
  DEFAULT_RAG_MATCH_THRESHOLD,
  parseKnowledgeChunkRpcRows,
  readMiuraRagRetrieverConfig,
  type KnowledgeChunkRpcRow,
  type MiuraRagRetrieverConfig,
} from "@/lib/miura/rag/retrieve";

const baseEnv = {
  OPENAI_API_KEY: "openai-test-key",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "supabase-secret-key",
};

function createConfig(
  overrides: Partial<MiuraRagRetrieverConfig> = {},
): MiuraRagRetrieverConfig {
  return {
    ...readMiuraRagRetrieverConfig({ env: baseEnv }),
    ...overrides,
  };
}

function createRpcRow(
  overrides: Partial<KnowledgeChunkRpcRow> = {},
): KnowledgeChunkRpcRow {
  return {
    chunk_id: "miura-pilares-metricas-rubricas-chunk-0",
    document_id: "miura-pilares-metricas-rubricas",
    document_title: "Pilares, metricas y rubricas MIURA MVP",
    source_type: "miura_summary",
    content:
      "# Personas/proceso - PDI\n\nPDI recoge friccion operativa, variabilidad de flujo, urgencias y capacidad real reservada para reducir deuda.",
    page: null,
    section: "Personas/proceso - PDI",
    url: "https://example.com/miura",
    language: "es",
    version: null,
    license: "project-internal",
    canonical_url: "https://example.com/miura",
    local_path: "knowledge/miura/fichas/01-pilares-metricas-rubricas.md",
    document_metadata: {
      sourceIds: ["miura-prd", "miura-domain-code"],
      sourceTitles: ["PRD - MIURA Web App", "Codigo de dominio MIURA"],
      citationLabel: "MIURA MVP - pilares y metricas",
    },
    chunk_metadata: {
      sourceIds: ["miura-prd"],
      localPath: "knowledge/miura/fichas/01-pilares-metricas-rubricas.md",
      citationLabel: "MIURA MVP - pilares y metricas",
    },
    document_content_hash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    chunk_content_hash:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    similarity: 0.48,
    ...overrides,
  };
}

describe("MIURA RAG retriever config", () => {
  test("reads server-only configuration with safe defaults", () => {
    const config = readMiuraRagRetrieverConfig({ env: baseEnv });

    expect(config.embeddingModel).toBe("text-embedding-3-small");
    expect(config.embeddingDimensions).toBe(1536);
    expect(config.topK).toBe(5);
    expect(config.matchThreshold).toBe(DEFAULT_RAG_MATCH_THRESHOLD);
    expect(config.supabaseServerKey).toBe("supabase-secret-key");
  });

  test("prefers SUPABASE_SERVICE_ROLE_KEY over the secret-key fallback", () => {
    const config = readMiuraRagRetrieverConfig({
      env: {
        ...baseEnv,
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      },
    });

    expect(config.supabaseServerKey).toBe("service-role-key");
  });

  test("validates topK, threshold, dimensions, and required secrets", () => {
    expect(() =>
      readMiuraRagRetrieverConfig({
        env: {
          ...baseEnv,
          MIURA_RAG_TOP_K: "0",
        },
      }),
    ).toThrow(/MIURA_RAG_TOP_K/);

    expect(() =>
      readMiuraRagRetrieverConfig({
        env: {
          ...baseEnv,
          MIURA_RAG_MATCH_THRESHOLD: "1.5",
        },
      }),
    ).toThrow(/MIURA_RAG_MATCH_THRESHOLD/);

    expect(() =>
      readMiuraRagRetrieverConfig({
        env: {
          ...baseEnv,
          MIURA_EMBEDDING_DIMENSIONS: "768",
        },
      }),
    ).toThrow(/1536/);

    expect(() =>
      readMiuraRagRetrieverConfig({
        env: {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SECRET_KEY: "supabase-secret-key",
        },
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });
});

describe("MIURA RAG RPC row mapping", () => {
  test("maps citation metadata and creates readable snippets", () => {
    const config = createConfig({ matchThreshold: 0.25 });
    const result = buildMiuraKnowledgeRetrievalResult({
      query: "que es PDI",
      rows: [createRpcRow()],
      config,
    });

    expect(result.hasSufficientSources).toBe(true);
    expect(result.chunks).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({
      documentTitle: "Pilares, metricas y rubricas MIURA MVP",
      section: "Personas/proceso - PDI",
      page: null,
      score: 0.48,
      sourceIds: ["miura-prd", "miura-domain-code"],
      citationLabel: "MIURA MVP - pilares y metricas",
    });
    expect(result.citations[0]?.snippet).toContain("PDI recoge friccion");
    expect(result.citations[0]?.snippet).not.toContain("#");
    expect(result.config).toEqual({
      embeddingModel: "text-embedding-3-small",
      embeddingDimensions: 1536,
      topK: 5,
      matchThreshold: 0.25,
    });
  });

  test("filters below-threshold rows and returns a no-sources result", () => {
    const config = createConfig({ matchThreshold: 0.25 });
    const result = buildMiuraKnowledgeRetrievalResult({
      query: "quien gano el mundial de futbol de 2010",
      rows: [createRpcRow({ similarity: 0.12 })],
      config,
    });

    expect(result.hasSufficientSources).toBe(false);
    expect(result.chunks).toEqual([]);
    expect(result.citations).toEqual([]);
  });

  test("keeps the highest scoring rows within topK", () => {
    const config = createConfig({ topK: 2, matchThreshold: 0.2 });
    const result = buildMiuraKnowledgeRetrievalResult({
      query: "Scrum y deuda tecnica",
      rows: [
        createRpcRow({ chunk_id: "low", similarity: 0.21 }),
        createRpcRow({ chunk_id: "high", similarity: 0.6 }),
        createRpcRow({ chunk_id: "middle", similarity: 0.4 }),
      ],
      config,
    });

    expect(result.chunks.map((chunk) => chunk.chunkId)).toEqual([
      "high",
      "middle",
    ]);
  });

  test("rejects malformed RPC rows at the boundary", () => {
    const invalidRows: unknown = [
      {
        ...createRpcRow(),
        similarity: "0.48",
      },
    ];

    expect(() => parseKnowledgeChunkRpcRows(invalidRows)).toThrow(
      /Invalid knowledge chunk RPC rows/,
    );
  });
});
