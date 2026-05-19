import { readFile } from "node:fs/promises";

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

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
}

test.describe("MIURA report", () => {
  test("renders the reproducible example as a complete printable report", async ({
    page,
  }) => {
    await page.goto("/evaluacion/evaluation-demo/informe");

    await expect(
      page.getByRole("heading", { level: 1, name: "Informe exportable" }),
    ).toBeVisible();
    await expect(page.getByTestId("report-document")).toContainText(
      "Resumen ejecutivo",
    );
    await expect(page.getByText("0.71", { exact: true })).toBeVisible();
    await expect(page.getByText("Recomendación: intervenir")).toBeVisible();
    await expect(
      page.getByText("Pilar dominante: Personas/proceso"),
    ).toBeVisible();
    await expect(page.getByTestId("report-scenario-central")).toContainText(
      "149,1 h/mes",
    );
    await expect(page.getByTestId("report-economics")).toContainText(/21\.840/);
    await expect(page.getByTestId("report-metric-table")).toContainText("C1");
    await expect(page.getByTestId("report-metric-table")).toContainText("P4");
    await expect(page.getByText("Mapeo Scrum/Kanban")).toBeVisible();
    await expect(
      page.getByText(/puede contener nombres, métricas, notas/i),
    ).toBeVisible();
    await expect(
      page.getByText(/MIURA es un framework metodológico preliminar/i).first(),
    ).toBeVisible();
  });

  test("downloads Markdown with the visible report content", async ({
    page,
  }, testInfo) => {
    await page.goto("/evaluacion/evaluation-demo/informe");
    await expect(page.getByTestId("report-download-markdown")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("report-download-markdown").click();
    const download = await downloadPromise;
    const outputPath = testInfo.outputPath("miura-report.md");

    await download.saveAs(outputPath);

    const content = await readFile(outputPath, "utf8");

    expect(download.suggestedFilename()).toMatch(
      /^miura-informe-evaluation-demo-\d{4}-\d{2}-\d{2}\.md$/,
    );
    expect(content).toContain(
      "# Informe MIURA - Producto interno de consultoría",
    );
    expect(content).toContain("Versión app: 0.1.0");
    expect(content).toContain("## Resumen ejecutivo");
    expect(content).toContain("## Métricas y evidencia");
    expect(content).toContain("C1 - Esfuerzo de remediación observable");
    expect(content).toContain("Product Backlog refinement");
    expect(content).toContain("MIURA es un framework metodológico preliminar");
    expect(content).not.toContain("NEXT_PUBLIC_");
    expect(content).not.toContain("process.env");
  });

  test("hides report actions and navigation in print media", async ({
    page,
  }) => {
    await page.goto("/evaluacion/evaluation-demo/informe");
    await expect(page.getByTestId("report-actions")).toBeVisible();

    await page.emulateMedia({ media: "print" });

    await expect(page.getByTestId("report-actions")).toBeHidden();
    await expect(page.getByTestId("nav-report")).toBeHidden();
    await expect(page.getByTestId("report-document")).toBeVisible();
  });

  test("marks partial diagnosis and keeps monetary outputs gated", async ({
    page,
  }) => {
    await createDraftEvaluation(page);
    await completePartialCoverageWizard(page);

    const evaluationId = /\/evaluacion\/([^/]+)\/wizard$/.exec(page.url())?.[1];
    expect(evaluationId).toBeDefined();

    await page.goto(`/evaluacion/${evaluationId}/informe`);

    await expect(page.getByText("Diagnóstico parcial").first()).toBeVisible();
    await expect(
      page.getByText("Recomendación: mejorar evidencia"),
    ).toBeVisible();
    await expect(page.getByTestId("report-scenario-central")).toContainText(
      "h/mes",
    );
    await expect(page.getByText(/Coste proyectado de fricción/)).toHaveCount(0);
    await expect(page.getByTestId("report-economics")).toHaveCount(0);
  });

  test("does not overflow horizontally on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/evaluacion/evaluation-demo/informe");

    await expect(
      page.getByRole("heading", { level: 1, name: "Informe exportable" }),
    ).toBeVisible();
    await expect(page.getByTestId("report-document")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
