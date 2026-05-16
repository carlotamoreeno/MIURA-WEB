import { expect, test } from "@playwright/test";

async function createDraftEvaluation(page: import("@playwright/test").Page) {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill("Portal operativo");
  await page.getByLabel("Capacidad mensual").fill("900");
  await page.getByLabel("Horizonte temporal").fill("9");
  await page.getByRole("button", { name: /Crear evaluación/i }).click();
  await expect(page).toHaveURL(/\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/);
}

async function chooseSimpleLevel(
  page: import("@playwright/test").Page,
  metricId: string,
  level: "low" | "medium" | "high",
) {
  await page.getByTestId(`metric-${metricId}-level-${level}`).click();
}

test.describe("MIURA metric wizard", () => {
  test("captures simple, advanced, and unavailable metric inputs across the three pillars", async ({
    page,
  }) => {
    await createDraftEvaluation(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Wizard de evaluación" }),
    ).toBeVisible();
    await expect(page.getByTestId("metric-C1")).toBeVisible();

    await chooseSimpleLevel(page, "C1", "high");
    await page.getByTestId("metric-C1-mode-advanced").click();
    await page.getByTestId("metric-C1-advancedValue").fill("120");
    await page.getByTestId("metric-C1-unit").fill("horas estimadas");
    await page.getByTestId("metric-C1-source").fill("Backlog técnico");
    await page.getByTestId("metric-C1-timeWindow").fill("Trimestre actual");
    await page
      .getByTestId("metric-C1-evidenceNote")
      .fill("Estimación revisada por el equipo.");
    await chooseSimpleLevel(page, "C2", "medium");
    await chooseSimpleLevel(page, "C3", "low");
    await page.getByTestId("metric-C4-unavailable").click();

    await expect(page.getByTestId("coverage-code_architecture")).toContainText(
      "Cobertura 75%",
    );
    await page.getByTestId("wizard-save-continue").click();
    await expect(page.getByTestId("metric-D1")).toBeVisible();

    await chooseSimpleLevel(page, "D1", "high");
    await chooseSimpleLevel(page, "D2", "medium");
    await chooseSimpleLevel(page, "D3", "low");
    await chooseSimpleLevel(page, "D4", "high");
    await page.getByTestId("wizard-save-continue").click();
    await expect(page.getByTestId("metric-P1")).toBeVisible();

    await chooseSimpleLevel(page, "P1", "high");
    await chooseSimpleLevel(page, "P2", "medium");
    await chooseSimpleLevel(page, "P3", "low");
    await chooseSimpleLevel(page, "P4", "high");
    await page.getByTestId("wizard-finish").click();

    await expect(
      page.getByText("Evaluación lista para scorecard"),
    ).toBeVisible();
    await expect(page.getByText("12/12 respondidas")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Ver scorecard/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: /Ver scorecard/i }).click();
    await expect(page).toHaveURL(
      /\/evaluacion\/evaluation-[a-z0-9-]+\/scorecard$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Scorecard MIURA" }),
    ).toBeVisible();
  });

  test("shows Spanish validation when trying to continue with incomplete metric evidence", async ({
    page,
  }) => {
    await createDraftEvaluation(page);

    await page.getByTestId("metric-C1-mode-advanced").click();
    await page.getByTestId("metric-C1-advancedValue").fill("12");
    await page.getByTestId("wizard-save-continue").click();

    await expect(
      page.getByText("Revisa las métricas marcadas antes de guardar este paso"),
    ).toBeVisible();
    await expect(
      page
        .getByTestId("metric-C1")
        .getByText(
          "Selecciona bajo, medio o alto, o marca la métrica como no disponible.",
        ),
    ).toBeVisible();
    await expect(
      page.getByText("La unidad es obligatoria en modo avanzado."),
    ).toBeVisible();
  });

  test("keeps the generated evaluation id from overflowing on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await createDraftEvaluation(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Wizard de evaluación" }),
    ).toBeVisible();

    const viewport = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
    }));

    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
  });
});
