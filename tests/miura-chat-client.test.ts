import { describe, expect, test } from "vitest";

import {
  buildMiuraChatEvaluationContext,
  parseMiuraChatCitationsData,
} from "@/lib/miura/rag/chat-client";
import type { MiuraChatCitationsData } from "@/lib/miura/rag/chat-contract";
import {
  buildMiuraRecommendationSet,
  buildPreloadedMiuraExampleSnapshot,
  calculateMiuraEvaluation,
} from "@/lib/miura/domain";

function buildExampleContext() {
  const example = buildPreloadedMiuraExampleSnapshot();
  const calculationResult = calculateMiuraEvaluation({
    project: example.project,
    evaluation: example.evaluation,
  });
  const recommendationSet = buildMiuraRecommendationSet(calculationResult);

  return buildMiuraChatEvaluationContext({
    project: example.project,
    evaluation: example.evaluation,
    calculationResult,
    recommendationSet,
  });
}

describe("MIURA chat client context", () => {
  test("builds the minimal evaluation context accepted by the chat API", () => {
    const context = buildExampleContext();

    expect(context).toMatchObject({
      projectName: "Producto interno de consultoría",
      evaluationName: "Caso ilustrativo reducido MIURA",
      methodology: "Scrum/Kanban",
      horizonMonths: 12,
      indices: {
        CDI: 0.7,
        DDI: 0.6,
        PDI: 0.8,
        DS: 0.71,
      },
      coverageStatus: "sufficient",
      dominantPillar: "people_process",
      recommendationLevel: "intervene",
    });
    expect(context.signals?.length).toBeGreaterThan(0);
    expect(context.signals?.length).toBeLessThanOrEqual(6);
  });

  test("does not include raw evaluation payload, evidence notes, storage export, or costs", () => {
    const serializedContext = JSON.stringify(buildExampleContext());

    expect(serializedContext).not.toContain("metricValues");
    expect(serializedContext).not.toContain("evidenceNote");
    expect(serializedContext).not.toContain("advancedValue");
    expect(serializedContext).not.toContain("localExport");
    expect(serializedContext).not.toContain("hourlyCost");
    expect(serializedContext).not.toContain("monthlyCapacityHours");
  });
});

describe("MIURA chat citation stream metadata", () => {
  const validCitationData = {
    hasSufficientSources: true,
    citations: [
      {
        id: "citation-1",
        chunkId: "chunk-1",
        documentId: "miura-pilares",
        documentTitle: "Pilares, métricas y rúbricas MIURA MVP",
        sourceType: "miura_summary",
        section: "Personas/proceso - PDI",
        page: null,
        snippet: "PDI recoge fricción operativa.",
        score: 0.51,
        url: null,
        localPath: "knowledge/miura/fichas/01-pilares-metricas-rubricas.md",
        sourceIds: ["miura-prd"],
        sourceTitles: ["PRD - MIURA Web App"],
        citationLabel: "MIURA MVP - pilares y métricas",
      },
    ],
    retrieval: {
      query: "Que es PDI?",
      retrievedChunks: 1,
      topK: 5,
      matchThreshold: 0.25,
    },
    usesEvaluationContext: false,
  } satisfies MiuraChatCitationsData;

  test("accepts valid data-citations metadata", () => {
    expect(parseMiuraChatCitationsData(validCitationData)).toEqual(
      validCitationData,
    );
  });

  test("rejects invalid data-citations metadata", () => {
    expect(
      parseMiuraChatCitationsData({
        ...validCitationData,
        retrieval: {
          ...validCitationData.retrieval,
          matchThreshold: 1.5,
        },
      }),
    ).toBeUndefined();
    expect(
      parseMiuraChatCitationsData({
        ...validCitationData,
        citations: [{ documentTitle: "Sin contrato completo" }],
      }),
    ).toBeUndefined();
  });
});
