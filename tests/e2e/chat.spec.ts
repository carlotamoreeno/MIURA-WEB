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
      id: "citation-1",
      chunkId: "chunk-1",
      documentId: "miura-pilares",
      documentTitle: "Pilares, métricas y rúbricas MIURA MVP",
      sourceType: "miura_summary",
      section: "Personas/proceso - PDI",
      page: null,
      snippet: "PDI recoge fricción operativa y capacidad real reservada.",
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

function createChatStream({
  text,
  citations = citationData,
}: {
  text: string;
  citations?: typeof citationData;
}) {
  return createSseBody([
    {
      type: "start",
      messageMetadata: {
        usesEvaluationContext: citations.usesEvaluationContext,
      },
      messageId: "assistant-test",
    },
    {
      type: "data-citations",
      data: citations,
    },
    {
      type: "text-start",
      id: "text-test",
    },
    {
      type: "text-delta",
      id: "text-test",
      delta: text,
    },
    {
      type: "text-end",
      id: "text-test",
    },
    {
      type: "finish",
      finishReason: "stop",
      messageMetadata: {
        usesEvaluationContext: citations.usesEvaluationContext,
      },
    },
    "[DONE]",
  ]);
}

async function mockChatApi(
  page: Page,
  options: {
    text?: string;
    status?: number;
    citations?: typeof citationData;
    requests?: CapturedChatRequest[];
  } = {},
) {
  await page.route("**/api/chat", async (route) => {
    const postData = route.request().postData();

    if (postData !== null && options.requests !== undefined) {
      options.requests.push(JSON.parse(postData) as CapturedChatRequest);
    }

    if (options.status !== undefined && options.status >= 400) {
      await route.fulfill({
        status: options.status,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message:
              "El chat RAG no está disponible temporalmente para la prueba.",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-store",
      },
      body: createChatStream({
        text: options.text ?? "PDI resume la fricción operativa en MIURA.",
        citations: options.citations,
      }),
    });
  });
}

async function askQuestion(page: Page, question = "Que es PDI?") {
  await page.getByTestId("chat-input").fill(question);
  await page.getByTestId("chat-submit").click();
}

async function createDraftEvaluation(page: Page) {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill("Portal contexto");
  await page.getByLabel("Capacidad mensual").fill("900");
  await page.getByLabel("Horizonte temporal").fill("9");
  await page.getByRole("button", { name: /Crear evaluación/i }).click();
  await expect(page).toHaveURL(/\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/);
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
}

test.describe("MIURA chat UI", () => {
  test("sends a question, renders the answer, and shows citations", async ({
    page,
  }) => {
    const requests: CapturedChatRequest[] = [];

    await mockChatApi(page, { requests });
    await page.goto("/chat");

    await expect(
      page.getByRole("heading", { level: 1, name: "Pregunta a MIURA" }),
    ).toBeVisible();
    await expect(page.getByTestId("chat-context-toggle")).toBeDisabled();

    await askQuestion(page);

    await expect(page.getByTestId("chat-message-user")).toContainText(
      "Que es PDI?",
    );
    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "PDI resume la fricción operativa en MIURA.",
    );
    await expect(page.getByTestId("chat-citations")).toContainText(
      "Pilares, métricas y rúbricas MIURA MVP",
    );
    await expect(page.getByTestId("chat-citations")).toContainText(
      "knowledge/miura/fichas/01-pilares-metricas-rubricas.md",
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]?.useEvaluationContext).toBe(false);
    expect(requests[0]?.evaluationContext).toBeUndefined();
  });

  test("keeps evaluation context off by default and sends only minimal context when enabled", async ({
    page,
  }) => {
    const requests: CapturedChatRequest[] = [];

    await mockChatApi(page, {
      requests,
      citations: {
        ...citationData,
        usesEvaluationContext: true,
      },
    });
    await createDraftEvaluation(page);

    await page.goto("/chat");
    await expect(page.getByTestId("chat-context-status")).toContainText(
      "Portal contexto",
    );

    const contextSwitch = page.getByRole("switch", {
      name: /Usar resumen mínimo/i,
    });

    await expect(contextSwitch).toHaveAttribute("aria-checked", "false");
    await contextSwitch.click();
    await expect(contextSwitch).toHaveAttribute("aria-checked", "true");

    await askQuestion(page, "Resume mi evaluación desde MIURA");

    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "PDI resume la fricción operativa en MIURA.",
    );
    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "Con resumen de evaluación",
    );

    const requestBody = requests[0];
    const serializedBody = JSON.stringify(requestBody);

    expect(requestBody?.useEvaluationContext).toBe(true);
    expect(serializedBody).toContain("Portal contexto");
    expect(serializedBody).toContain("coverageStatus");
    expect(serializedBody).not.toContain("metricValues");
    expect(serializedBody).not.toContain("localExport");
    expect(serializedBody).not.toContain("hourlyCost");
    expect(serializedBody).not.toContain("monthlyCapacityHours");
  });

  test("shows a no-sources state without breaking the chat", async ({
    page,
  }) => {
    await mockChatApi(page, {
      text: "No encuentro evidencia suficiente en el corpus controlado de MIURA para responder con seguridad.",
      citations: {
        ...citationData,
        hasSufficientSources: false,
        citations: [],
        retrieval: {
          ...citationData.retrieval,
          retrievedChunks: 0,
        },
      },
    });
    await page.goto("/chat");

    await askQuestion(page, "Quien gano el mundial de futbol de 2010?");

    await expect(
      page.getByTestId("chat-message-assistant").getByTestId("chat-no-sources"),
    ).toContainText("Sin evidencia suficiente");
    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "No encuentro evidencia suficiente",
    );
    await expect(page.getByTestId("chat-input")).toBeEnabled();
  });

  test("shows a controlled error state and keeps the app usable", async ({
    page,
  }) => {
    await mockChatApi(page, { status: 503 });
    await page.goto("/chat");

    await askQuestion(page, "Que es DS?");

    await expect(page.getByTestId("chat-error")).toContainText(
      "No se ha podido completar la respuesta",
    );
    await expect(page.getByTestId("chat-retry")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toBeEnabled();
  });

  test("does not overflow horizontally on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/chat");

    await expect(
      page.getByRole("heading", { level: 1, name: "Pregunta a MIURA" }),
    ).toBeVisible();
    await expect(page.getByTestId("chat-form")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
