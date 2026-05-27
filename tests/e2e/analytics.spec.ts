import { expect, test, type Page } from "@playwright/test";

type CapturedAnalyticsEvent = {
  eventName?: string;
  sessionId?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
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

const noSourcesCitationData = {
  ...citationData,
  hasSufficientSources: false,
  citations: [],
  retrieval: {
    ...citationData.retrieval,
    query: "quien gano el mundial de futbol de 2010",
    retrievedChunks: 0,
  },
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
  citations,
}: {
  text: string;
  citations: typeof citationData;
}) {
  const suffix = citations.hasSufficientSources ? "sources" : "no-sources";

  return createSseBody([
    {
      type: "start",
      messageMetadata: {
        usesEvaluationContext: citations.usesEvaluationContext,
      },
      messageId: `assistant-analytics-${suffix}`,
    },
    {
      type: "data-citations",
      data: citations,
    },
    {
      type: "text-start",
      id: `text-analytics-${suffix}`,
    },
    {
      type: "text-delta",
      id: `text-analytics-${suffix}`,
      delta: text,
    },
    {
      type: "text-end",
      id: `text-analytics-${suffix}`,
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

async function captureAnalytics(page: Page) {
  const events: CapturedAnalyticsEvent[] = [];

  await page.route("**/api/analytics", async (route) => {
    const postData = route.request().postData();

    if (postData !== null) {
      events.push(JSON.parse(postData) as CapturedAnalyticsEvent);
    }

    await route.fulfill({
      status: 204,
      body: "",
    });
  });

  return events;
}

async function mockChatApi(page: Page) {
  await page.route("**/api/chat", async (route) => {
    const postData = route.request().postData() ?? "";
    const useNoSources = postData.toLowerCase().includes("mundial de futbol");
    const citations = useNoSources ? noSourcesCitationData : citationData;

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-store",
      },
      body: createChatStream({
        text: useNoSources
          ? "No encuentro evidencia suficiente en el corpus controlado."
          : "PDI resume la fricción operativa en MIURA.",
        citations,
      }),
    });
  });
}

async function waitForAnalyticsEvent(
  events: CapturedAnalyticsEvent[],
  eventName: string,
  minimumCount = 1,
) {
  await expect
    .poll(
      () => events.filter((event) => event.eventName === eventName).length,
      {
        timeout: 10_000,
      },
    )
    .toBeGreaterThanOrEqual(minimumCount);

  return events.filter((event) => event.eventName === eventName).at(-1)!;
}

async function askQuestion(page: Page, question: string) {
  await page.getByTestId("chat-input").fill(question);
  await page.getByTestId("chat-submit").click();
}

test.skip(
  process.env.ENABLE_ANALYTICS !== "true",
  "Analytics E2E requires ENABLE_ANALYTICS=true so the server passes the flag to the client provider.",
);

test.describe("MIURA anonymous analytics", () => {
  test("emits sanitized events for creation, chat and local reset", async ({
    page,
  }) => {
    const events = await captureAnalytics(page);

    await mockChatApi(page);
    await page.goto("/evaluacion/nueva");

    const appOpened = await waitForAnalyticsEvent(events, "app_opened");

    expect(appOpened.sessionId).toMatch(/^miura-session-/);
    expect(appOpened.timestamp).toBeTruthy();
    expect(appOpened.properties).toMatchObject({
      appVersion: "0.1.0",
    });

    await page.getByLabel("Proyecto", { exact: true }).fill("Portal operativo");
    await page.getByLabel("Capacidad mensual").fill("900");
    await page.getByLabel("Horizonte temporal").fill("9");
    await page.getByRole("button", { name: /Crear evaluación/i }).click();

    const evaluationCreated = await waitForAnalyticsEvent(
      events,
      "evaluation_created",
    );

    expect(evaluationCreated.properties).toEqual({
      methodology: "Scrum/Kanban",
      hasCapacity: true,
      hasHourlyCost: false,
    });
    expect(JSON.stringify(evaluationCreated)).not.toContain("Portal operativo");

    await page.goto("/chat");
    await askQuestion(page, "Que es PDI?");
    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "PDI resume la fricción operativa en MIURA.",
    );

    const chatQuestionSent = await waitForAnalyticsEvent(
      events,
      "chat_question_sent",
    );

    expect(chatQuestionSent.properties).toEqual({
      usesEvaluationContext: false,
      questionLengthBucket: "1-80",
    });
    expect(JSON.stringify(chatQuestionSent)).not.toContain("Que es PDI");
    expect(chatQuestionSent.properties).not.toHaveProperty("question");

    const chatAnswerCompleted = await waitForAnalyticsEvent(
      events,
      "chat_answer_completed",
    );

    expect(chatAnswerCompleted.properties).toMatchObject({
      citationsCount: 1,
      retrievalCount: 1,
    });
    expect(chatAnswerCompleted.properties?.latencyBucket).toMatch(/s$/);

    await askQuestion(page, "quien gano el mundial de futbol de 2010");
    await expect(page.getByTestId("chat-no-sources").first()).toBeVisible();

    const chatNoSources = await waitForAnalyticsEvent(
      events,
      "chat_no_sources",
    );

    expect(chatNoSources.properties).toEqual({
      queryCategoryIfKnown: "out_of_domain_or_guardrail",
    });

    await page.goto("/ajustes-locales");
    await page.getByTestId("local-reset-open").click();
    await page.getByTestId("local-reset-confirm").click();

    const localDataReset = await waitForAnalyticsEvent(
      events,
      "local_data_reset",
    );

    expect(localDataReset.properties).toEqual({
      hadEvaluations: true,
    });
  });
});
