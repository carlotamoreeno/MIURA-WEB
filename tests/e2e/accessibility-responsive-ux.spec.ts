import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

type CapturedChatRequest = {
  useEvaluationContext?: boolean;
  evaluationContext?: unknown;
};

const citationData = {
  hasSufficientSources: true,
  citations: [
    {
      id: "citation-1",
      chunkId: "chunk-1",
      documentId: "miura-pilares",
      documentTitle: "Pilares, métricas y rubricas MIURA MVP",
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

function createChatStream({
  text,
  usesEvaluationContext = false,
}: {
  text: string;
  usesEvaluationContext?: boolean;
}) {
  const citations = {
    ...citationData,
    usesEvaluationContext,
  };

  return createSseBody([
    {
      type: "start",
      messageMetadata: {
        usesEvaluationContext,
      },
      messageId: "assistant-accessibility",
    },
    {
      type: "data-citations",
      data: citations,
    },
    {
      type: "text-start",
      id: "text-accessibility",
    },
    {
      type: "text-delta",
      id: "text-accessibility",
      delta: text,
    },
    {
      type: "text-end",
      id: "text-accessibility",
    },
    {
      type: "finish",
      finishReason: "stop",
      messageMetadata: {
        usesEvaluationContext,
      },
    },
    "[DONE]",
  ]);
}

async function mockChatApi(page: Page, requests: CapturedChatRequest[] = []) {
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
      body: createChatStream({
        text: "PDI resume la friccion operativa en MIURA.",
        usesEvaluationContext: requests.at(-1)?.useEvaluationContext === true,
      }),
    });
  });
}

async function createDraftEvaluation(page: Page) {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill("Portal QA MIURA");
  await page.getByLabel("Capacidad mensual").fill("900");
  await page.getByLabel("Horizonte temporal").fill("9");
  await page.getByRole("button", { name: /Crear evaluación/i }).click();
  await expect(page).toHaveURL(/\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/);
}

async function chooseSimpleLevelWithKeyboard(
  page: Page,
  metricId: string,
  level: "low" | "medium" | "high",
) {
  const radio = page.getByTestId(`metric-${metricId}-level-${level}`);

  await radio.focus();
  await page.keyboard.press("Space");
  await expect(radio).toHaveAttribute("aria-checked", "true");
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
}

function summarizeViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
}

async function expectNoCriticalAxeViolations(
  page: Page,
  testInfo: TestInfo,
  label: string,
) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  await testInfo.attach(`${label}-axe-summary.json`, {
    body: JSON.stringify(
      {
        url: results.url,
        criticalViolations: summarizeViolations(criticalViolations),
        nonCriticalViolations: summarizeViolations(
          results.violations.filter(
            (violation) => violation.impact !== "critical",
          ),
        ),
        incomplete: results.incomplete.length,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  expect(
    criticalViolations,
    JSON.stringify(criticalViolations, null, 2),
  ).toHaveLength(0);
}

test.describe("MIURA accessibility QA", () => {
  test("has no critical Axe violations on priority surfaces", async ({
    page,
  }, testInfo) => {
    await mockChatApi(page);

    const staticRoutes = [
      { label: "landing", href: "/" },
      { label: "new-evaluation", href: "/evaluacion/nueva" },
      {
        label: "scorecard-demo",
        href: "/evaluacion/evaluation-demo/scorecard",
      },
      { label: "chat", href: "/chat" },
      { label: "methodology", href: "/metodologia" },
      { label: "scrum-kanban", href: "/scrum-kanban" },
    ] as const;

    for (const route of staticRoutes) {
      await page.goto(route.href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoCriticalAxeViolations(page, testInfo, route.label);
    }

    await createDraftEvaluation(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Wizard de evaluación" }),
    ).toBeVisible();
    await expectNoCriticalAxeViolations(page, testInfo, "wizard-generated");
  });

  test("supports keyboard navigation for skip link and mobile sidebar", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", {
      name: "Saltar al contenido",
    });

    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#contenido")).toBeFocused();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const sidebarTrigger = page.getByTestId("sidebar-trigger");

    await sidebarTrigger.focus();
    await expect(sidebarTrigger).toBeFocused();
    await page.keyboard.press("Enter");

    const glossaryLink = page.getByRole("link", { name: "Glosario" }).last();

    await expect(glossaryLink).toBeVisible();
    await glossaryLink.focus();
    await expect(glossaryLink).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { level: 1, name: "Glosario MIURA" }),
    ).toBeVisible();
  });

  test("supports keyboard operation in wizard, scorecard tabs, and chat", async ({
    page,
  }) => {
    const chatRequests: CapturedChatRequest[] = [];

    await mockChatApi(page, chatRequests);
    await createDraftEvaluation(page);

    for (const metricId of ["C1", "C2", "C3", "C4"]) {
      await chooseSimpleLevelWithKeyboard(page, metricId, "high");
    }

    const continueButton = page.getByTestId("wizard-save-continue");

    await continueButton.focus();
    await expect(continueButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("metric-D1")).toBeVisible();

    await page.goto("/evaluacion/evaluation-demo/scorecard");
    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();

    const severityIndicator = page.locator(
      '[aria-label*="Severidad alta"][aria-label*="Intervenir"]',
    );

    await expect(severityIndicator).toBeVisible();
    await expect(severityIndicator).toContainText("Severidad alta");
    await expect(severityIndicator).toContainText("Intervenir");
    await expect(
      severityIndicator.locator("svg[aria-hidden='true']"),
    ).toHaveCount(1);

    const executiveTab = page.getByRole("tab", { name: "Ejecutiva" });
    const technicalTab = page.getByRole("tab", { name: "Técnica" });

    await executiveTab.focus();
    await expect(executiveTab).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(technicalTab).toHaveAttribute("data-state", "active");
    await expect(page.getByText("Pesos y cobertura")).toBeVisible();

    await page.goto("/chat");
    await expect(page.getByTestId("chat-context-status")).toContainText(
      "Portal QA MIURA",
    );

    const contextSwitch = page.getByRole("switch", {
      name: /Usar resumen mínimo/i,
    });

    await contextSwitch.focus();
    await expect(contextSwitch).toBeFocused();
    await page.keyboard.press("Space");
    await expect(contextSwitch).toHaveAttribute("aria-checked", "true");

    await page.getByTestId("chat-input").focus();
    await page.keyboard.type("Que es PDI?");
    await page.getByTestId("chat-submit").focus();
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("chat-message-assistant")).toContainText(
      "PDI resume la friccion operativa en MIURA.",
    );
    await expect(chatRequests.at(-1)?.useEvaluationContext).toBe(true);
    expect(JSON.stringify(chatRequests.at(-1))).not.toContain("metricValues");
  });
});

test.describe("MIURA responsive QA", () => {
  const viewports = [
    { name: "mobile-390", width: 390, height: 844 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1440", width: 1440, height: 900 },
  ] as const;

  for (const viewport of viewports) {
    test(`keeps priority surfaces usable at ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await mockChatApi(page);
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await createDraftEvaluation(page);
      await expect(
        page.getByRole("heading", { level: 1, name: "Wizard de evaluación" }),
      ).toBeVisible();
      await expect(page.getByTestId("metric-C1")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`wizard-${viewport.name}.png`),
        fullPage: true,
      });

      await page.goto("/evaluacion/evaluation-demo/scorecard");
      await expect(
        page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
      ).toBeVisible();
      await expect(page.getByTestId("scenario-panel")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`scorecard-${viewport.name}.png`),
        fullPage: true,
      });

      await page.goto("/chat");
      await expect(
        page.getByRole("heading", { level: 1, name: "Pregunta a MIURA" }),
      ).toBeVisible();
      await expect(page.getByTestId("chat-form")).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`chat-${viewport.name}.png`),
        fullPage: true,
      });
    });
  }
});
