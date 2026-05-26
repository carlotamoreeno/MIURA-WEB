// @vitest-environment node
import { config as loadDotenv } from "dotenv";
import { describe, expect, test } from "vitest";

import { retrieveMiuraKnowledge } from "@/lib/miura/rag/retrieve";

loadDotenv({ path: ".env", quiet: true });

const runIntegration = process.env.RUN_MIURA_RAG_INTEGRATION === "1";
const describeIfIntegration = runIntegration ? describe : describe.skip;

describeIfIntegration("MIURA RAG retrieval integration", () => {
  test("retrieves citation-ready MIURA context for PDI", async () => {
    const result = await retrieveMiuraKnowledge("que es PDI", {
      matchThreshold: 0.25,
      topK: 5,
    });

    expect(result.hasSufficientSources).toBe(true);
    expect(result.citations.length).toBeGreaterThanOrEqual(1);
    expect(
      result.citations.some(
        (citation) =>
          citation.documentTitle.toLowerCase().includes("miura") &&
          citation.section !== null &&
          citation.snippet.length > 0,
      ),
    ).toBe(true);
  }, 30_000);

  test("returns insufficient sources for an out-of-corpus question", async () => {
    const result = await retrieveMiuraKnowledge(
      "quien gano el mundial de futbol de 2010",
      {
        matchThreshold: 0.25,
        topK: 5,
      },
    );

    expect(result.hasSufficientSources).toBe(false);
    expect(result.chunks).toEqual([]);
    expect(result.citations).toEqual([]);
  }, 30_000);
});
