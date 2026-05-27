import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

type CapturedChatRequest = {
  useEvaluationContext?: boolean;
  evaluationContext?: unknown;
  messages?: unknown[];
};

const citationData = {
  hasSufficientSources: true,
  citations: [
    {
      id: "citation-critical-1",
      chunkId: "chunk-critical-1",
      documentId: "miura-pilares",
      documentTitle: "Pilares, metricas y rubricas MIURA MVP",
      sourceType: "miura_summary",
      section: "Personas/proceso - PDI",
      page: null,
      snippet: "PDI recoge friccion operativa y capacidad real reservada.",
      score: 0.51,
      url: null,
      localPath: "knowledge/miura/fichas/01-pilares-metricas-rubricas.md",
      sourceIds: ["miura-prd"],
      sourceTitles: ["PRD - MIURA Web App"],
      citationLabel: "MIURA MVP - pilares y metricas",
    },
  ],
  retrieval: {
    query: "Que es PDI?",
    retrievedChunks: 1,
    topK: 5,
    matchThreshold: 0.25,
  },
  usesEvaluationContext: false,
};

function createSseBody(parts: Array<object | "[DONE]">) {
  return parts
    .map((part) =>
      part === "[DONE]"
        ? "data: [DONE]\n\n"
        : `data: ${JSON.stringify(part)}\n\n`,
    )
    .join("");
}

function createChatStream(text: string) {
  return createSseBody([
    {
      type: "start",
      messageMetadata: {
        usesEvaluationContext: false,
      },
      messageId: "assistant-critical-flow",
    },
    {
      type: "data-citations",
      data: citationData,
    },
    {
      type: "text-start",
      id: "text-critical-flow",
    },
    {
      type: "text-delta",
      id: "text-critical-flow",
      delta: text,
    },
    {
      type: "text-end",
      id: "text-critical-flow",
    },
    {
      type: "finish",
      finishReason: "stop",
      messageMetadata: {
        usesEvaluationContext: false,
      },
    },
    "[DONE]",
  ]);
}

async function mockChatApi(page: Page, requests: CapturedChatRequest[]) {
  await page.route("**/api/chat", async (route) => {
    const postData = route.request().postData();

    if (postData !== null) {
      requests.push(JSON.parse(postData) as CapturedChatRequest);
    }

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-store",
      },
      body: createChatStream(
        "PDI resume la friccion operativa en MIURA y debe leerse con citas.",
      ),
    });
  });
}

async function chooseSimpleLevel(
  page: Page,
  metricId: string,
  level: "low" | "medium" | "high",
) {
  await page.getByTestId(`metric-${metricId}-level-${level}`).click();
}

async function completeCurrentPillar(
  page: Page,
  metricIds: readonly string[],
  level: "low" | "medium" | "high",
) {
  for (const metricId of metricIds) {
    await chooseSimpleLevel(page, metricId, level);
  }
}

async function completeWizard(page: Page) {
  await completeCurrentPillar(page, ["C1", "C2", "C3", "C4"], "high");
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-D1")).toBeVisible();

  await completeCurrentPillar(page, ["D1", "D2", "D3", "D4"], "medium");
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-P1")).toBeVisible();

  await completeCurrentPillar(page, ["P1", "P2", "P3", "P4"], "high");
  await page.getByTestId("wizard-finish").click();

  await expect(page.getByText(/Evaluaci.n lista para scorecard/)).toBeVisible();
  await expect(page.getByText("12/12 respondidas")).toBeVisible();
}

function evaluationIdFromUrl(page: Page) {
  const match = /\/evaluacion\/([^/]+)\/wizard$/.exec(page.url());

  expect(match?.[1]).toBeTruthy();

  return match![1];
}

test.describe("MIURA critical MVP flows", () => {
  test("creates, completes, persists, exports, imports, and chats with a local evaluation", async ({
    page,
  }, testInfo) => {
    const chatRequests: CapturedChatRequest[] = [];

    await mockChatApi(page, chatRequests);

    await page.goto("/");
    await page
      .getByRole("link", { name: /Crear evaluaci.n MIURA/i })
      .first()
      .click();

    await expect(page).toHaveURL("/evaluacion/nueva");
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByLabel(/email|contrase.a|password/i)).toHaveCount(0);

    await page.getByLabel("Proyecto", { exact: true }).fill("Portal critico");
    await page.getByLabel("Capacidad mensual").fill("900");
    await page.getByLabel("Coste hora opcional").fill("42");
    await page.getByLabel("Horizonte temporal").fill("9");
    await page.getByRole("button", { name: /Crear evaluaci.n/i }).click();

    await expect(page).toHaveURL(
      /\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: /Wizard de evaluaci.n/ }),
    ).toBeVisible();
    await expect(page.getByText("Portal critico").first()).toBeVisible();
    await expect(page.getByText("Guardado local")).toBeVisible();

    const evaluationId = evaluationIdFromUrl(page);

    await completeWizard(page);

    await page.getByRole("link", { name: /Ver scorecard/i }).click();
    await expect(page).toHaveURL(`/evaluacion/${evaluationId}/scorecard`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expect(page.getByText("Portal critico").first()).toBeVisible();
    await expect(page.getByText("Lectura ejecutiva")).toBeVisible();
    await expect(page.getByTestId("scenario-panel")).toContainText(
      /Fricci.n, capacidad y coste/,
    );

    await page.getByRole("tab", { name: /T.cnica/ }).click();
    await expect(page.getByText("Pesos y cobertura")).toBeVisible();
    await expect(page.getByText(/Trazabilidad de m.tricas/)).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expect(page.getByText("Portal critico").first()).toBeVisible();
    await expect(page.getByTestId("scenario-panel")).toBeVisible();

    await page.goto(`/evaluacion/${evaluationId}/wizard`);
    await expect(page.getByText("Portal critico").first()).toBeVisible();
    await expect(page.getByTestId("metric-C1-level-high")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.goto("/ajustes-locales");
    await expect(page.getByTestId("local-settings-list")).toContainText(
      "Portal critico",
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("local-export-json").click();
    const download = await downloadPromise;
    const exportedPath = path.join(testInfo.outputDir, "miura-critical.json");

    await download.saveAs(exportedPath);

    const exportedJson = await readFile(exportedPath, "utf8");

    expect(exportedJson).toContain("Portal critico");
    expect(exportedJson).toContain(evaluationId);
    expect(exportedJson).not.toContain("process.env");
    expect(exportedJson).not.toContain("NEXT_PUBLIC_");

    await page.getByTestId("local-reset-open").click();
    await page.getByTestId("local-reset-confirm").click();
    await expect(page.getByText("Datos locales borrados")).toBeVisible();
    await expect(page.getByTestId("local-settings-empty")).toContainText(
      "No hay evaluaciones guardadas",
    );

    await page.goto(`/evaluacion/${evaluationId}/scorecard`);
    await expect(
      page.getByText(/Evaluaci.n local no disponible/).first(),
    ).toBeVisible();

    await page.goto("/ajustes-locales");
    await page.getByTestId("local-import-file").setInputFiles(exportedPath);
    await expect(page.getByText(/Importaci.n completada/)).toBeVisible();
    await expect(page.getByTestId("local-settings-list")).toContainText(
      "Portal critico",
    );

    await page.getByRole("link", { name: "Abrir scorecard" }).click();
    await expect(page).toHaveURL(`/evaluacion/${evaluationId}/scorecard`);
    await expect(page.getByText("Portal critico").first()).toBeVisible();
    await expect(page.getByText("Lectura ejecutiva")).toBeVisible();

    await page.goto("/chat");
    await expect(
      page.getByRole("heading", { level: 1, name: "Pregunta a MIURA" }),
    ).toBeVisible();
    await expect(page.getByTestId("chat-context-status")).toContainText(
      "Portal critico",
    );

    await page.getByTestId("chat-input").fill("Que es PDI?");
    await page.getByTestId("chat-submit").click();

    await expect(page.getByTestId("chat-message-user")).toContainText(
      "Que es PDI?",
    );
    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "PDI resume la friccion operativa en MIURA",
    );
    await expect(page.getByTestId("chat-citations")).toContainText(
      "Pilares, metricas y rubricas MIURA MVP",
    );

    expect(chatRequests).toHaveLength(1);
    expect(chatRequests[0]?.useEvaluationContext).toBe(false);
    expect(chatRequests[0]?.evaluationContext).toBeUndefined();
  });
});
