import { expect, test, type Page } from "@playwright/test";

async function createDraftEvaluation(page: Page) {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill("Portal operativo");
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

test.describe("MIURA contextual help and disclaimers", () => {
  test("glossary renders core terms, formulas, metric help, and methodology disclaimers", async ({
    page,
  }) => {
    await page.goto("/glosario");

    await expect(
      page.getByRole("heading", { level: 1, name: "Glosario MIURA" }),
    ).toBeVisible();
    await expect(
      page.getByText("Fórmulas principales", { exact: true }),
    ).toBeVisible();
    for (const term of ["CDI", "DDI", "PDI", "DS", "CF", "PWC"]) {
      await expect(page.getByText(term, { exact: true }).first()).toBeVisible();
    }
    await expect(
      page.getByText("C1 · Esfuerzo de remediación observable"),
    ).toBeVisible();
    await expect(
      page.getByText(/MIURA es un framework metodológico preliminar/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/no son contabilidad exacta/i).first(),
    ).toBeVisible();
  });

  test("metric help tooltip is keyboard accessible in the wizard", async ({
    page,
  }) => {
    await createDraftEvaluation(page);

    const helpTrigger = page.getByTestId("metric-C1-help");
    await expect(helpTrigger).toBeVisible();
    await helpTrigger.focus();

    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await expect(
      tooltip.getByText("C1 · Esfuerzo de remediación observable").first(),
    ).toBeVisible();
    await expect(
      tooltip.getByText(/Modo simple: bajo, medio o alto/i).first(),
    ).toBeVisible();
    await expect(
      tooltip.getByText(/señal preliminar y no como prueba/i).first(),
    ).toBeVisible();
  });

  test("scorecard and report expose required disclaimers", async ({ page }) => {
    await page.goto("/evaluacion/evaluation-demo/scorecard");

    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expect(
      page.getByText(/MIURA es un framework metodológico preliminar/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/no son contabilidad exacta/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/cobertura inferior al 50%/i).first(),
    ).toBeVisible();

    await page.goto("/evaluacion/evaluation-demo/informe");
    await expect(
      page.getByRole("heading", { level: 1, name: "Informe exportable" }),
    ).toBeVisible();
    await expect(
      page.getByText(/puede contener nombres, métricas, notas/i),
    ).toBeVisible();
    await expect(
      page.getByText(/MIURA es un framework metodológico preliminar/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/no son contabilidad exacta/i).first(),
    ).toBeVisible();
  });

  test("dynamic scorecard and report badges do not overflow on mobile", async ({
    page,
  }) => {
    const longEvaluationId =
      "evaluation-12345678-90ab-cdef-1234-567890abcdef-extra";

    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto(`/evaluacion/${longEvaluationId}/scorecard`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/evaluacion/${longEvaluationId}/informe`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Informe exportable" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
