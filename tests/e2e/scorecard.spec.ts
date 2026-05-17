import { expect, test, type Page } from "@playwright/test";

async function createDraftEvaluation(page: Page) {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill("Portal operativo");
  await page.getByLabel("Capacidad mensual").fill("900");
  await page.getByLabel("Horizonte temporal").fill("9");
  await page.getByRole("button", { name: /Crear evaluación/i }).click();
  await expect(page).toHaveURL(/\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/);
}

async function chooseSimpleLevel(
  page: Page,
  metricId: string,
  level: "low" | "medium" | "high",
) {
  await page.getByTestId(`metric-${metricId}-level-${level}`).click();
}

async function completeFullWizard(page: Page) {
  for (const metricId of ["C1", "C2", "C3", "C4"]) {
    await chooseSimpleLevel(page, metricId, "high");
  }
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-D1")).toBeVisible();

  for (const metricId of ["D1", "D2", "D3", "D4"]) {
    await chooseSimpleLevel(page, metricId, "medium");
  }
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-P1")).toBeVisible();

  for (const metricId of ["P1", "P2", "P3", "P4"]) {
    await chooseSimpleLevel(page, metricId, "high");
  }
  await page.getByTestId("wizard-finish").click();
  await expect(page.getByText("Evaluación lista para scorecard")).toBeVisible();
}

async function completePartialCoverageWizard(page: Page) {
  await chooseSimpleLevel(page, "C1", "high");
  for (const metricId of ["C2", "C3", "C4"]) {
    await page.getByTestId(`metric-${metricId}-unavailable`).click();
  }
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-D1")).toBeVisible();

  for (const metricId of ["D1", "D2", "D3", "D4"]) {
    await chooseSimpleLevel(page, metricId, "high");
  }
  await page.getByTestId("wizard-save-continue").click();
  await expect(page.getByTestId("metric-P1")).toBeVisible();

  for (const metricId of ["P1", "P2", "P3", "P4"]) {
    await chooseSimpleLevel(page, metricId, "high");
  }
  await page.getByTestId("wizard-finish").click();
  await expect(page.getByText("Evaluación lista para scorecard")).toBeVisible();
}

async function goToScorecard(page: Page) {
  await page.getByRole("link", { name: /Ver scorecard/i }).click();
  await expect(page).toHaveURL(
    /\/evaluacion\/evaluation-[a-z0-9-]+\/scorecard$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
}

test.describe("MIURA scorecard", () => {
  test("renders the reproducible example with executive results", async ({
    page,
  }) => {
    await page.goto("/evaluacion/evaluation-demo/scorecard");

    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expect(page.getByText("0.70", { exact: true })).toBeVisible();
    await expect(page.getByText("0.60", { exact: true })).toBeVisible();
    await expect(page.getByText("0.80", { exact: true })).toBeVisible();
    await expect(page.getByText("0.71", { exact: true })).toBeVisible();
    await expect(page.getByText("Nivel recomendado: intervenir")).toBeVisible();
    await expect(
      page.getByText("Pilar dominante: Personas/proceso"),
    ).toBeVisible();
    await expect(
      page.getByTestId("scorecard-executive-coverage-code_architecture"),
    ).toContainText("Cobertura 0.75");
  });

  test("renders executive and technical tabs for a generated evaluation", async ({
    page,
  }) => {
    await createDraftEvaluation(page);
    await completeFullWizard(page);
    await goToScorecard(page);

    await expect(page.getByRole("tab", { name: "Ejecutiva" })).toBeVisible();
    await expect(page.getByText("Lectura ejecutiva")).toBeVisible();
    await expect(page.getByText("Capacidad perdida")).toBeVisible();

    await page.getByRole("tab", { name: "Técnica" }).click();
    await expect(page.getByText("Pesos y cobertura")).toBeVisible();
    await expect(page.getByText("λ de escenarios")).toBeVisible();
    await expect(page.getByText("Trazabilidad de métricas")).toBeVisible();
    await expect(
      page.getByText("0.40*CDI + 0.25*DDI + 0.35*PDI"),
    ).toBeVisible();
  });

  test("shows partial diagnosis and improve evidence when coverage is insufficient", async ({
    page,
  }) => {
    await createDraftEvaluation(page);
    await completePartialCoverageWizard(page);
    await goToScorecard(page);

    await expect(page.getByText("Diagnóstico parcial").first()).toBeVisible();
    await expect(page.getByText(/mejorar evidencia/i).first()).toBeVisible();
    await expect(page.getByText(/Código\/arquitectura/).first()).toBeVisible();
    await expect(
      page.getByText(/no presenta PWC, principal ni break-even/i),
    ).toBeVisible();
  });

  test("does not overflow horizontally on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/evaluacion/evaluation-demo/scorecard");

    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
