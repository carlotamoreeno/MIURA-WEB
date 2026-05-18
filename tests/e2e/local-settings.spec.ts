import { expect, test, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

async function createDraftEvaluation(page: Page, projectName = "Portal local") {
  await page.goto("/evaluacion/nueva");
  await page.getByLabel("Proyecto", { exact: true }).fill(projectName);
  await page.getByLabel("Capacidad mensual").fill("900");
  await page.getByLabel("Horizonte temporal").fill("9");
  await page.getByRole("button", { name: /Crear evaluación/i }).click();
  await expect(page).toHaveURL(/\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/);
  await expect(page.getByText(projectName)).toBeVisible();
}

async function chooseSimpleLevel(
  page: Page,
  metricId: string,
  level: "low" | "medium" | "high",
) {
  await page.getByTestId(`metric-${metricId}-level-${level}`).click();
}

test.describe("MIURA local persistence and portability", () => {
  test("keeps a saved draft after refresh", async ({ page }) => {
    await createDraftEvaluation(page);

    await chooseSimpleLevel(page, "C1", "high");
    await page.getByTestId("wizard-save-draft").click();
    await expect(page.getByText(/Borrador guardado/)).toBeVisible();

    await page.reload();

    await expect(page.getByText("Portal local")).toBeVisible();
    await expect(page.getByTestId("metric-C1")).toBeVisible();
    await expect(page.getByTestId("metric-C1-level-high")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("exports, resets, imports, and reopens a local evaluation", async ({
    page,
  }, testInfo) => {
    await createDraftEvaluation(page, "Portal exportable");
    await chooseSimpleLevel(page, "C1", "medium");
    await page.getByTestId("wizard-save-draft").click();

    await page.goto("/ajustes-locales");
    await expect(page.getByTestId("local-settings-list")).toContainText(
      "Portal exportable",
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("local-export-json").click();
    const download = await downloadPromise;
    const exportedPath = path.join(testInfo.outputDir, "miura-export.json");
    await download.saveAs(exportedPath);

    await page.getByTestId("local-reset-open").click();
    await page.getByTestId("local-reset-confirm").click();
    await expect(page.getByTestId("local-settings-empty")).toContainText(
      "No hay evaluaciones guardadas",
    );

    await page.getByTestId("local-import-file").setInputFiles(exportedPath);
    await expect(page.getByText(/Importación completada/)).toBeVisible();
    await expect(page.getByTestId("local-settings-list")).toContainText(
      "Portal exportable",
    );

    await page.getByRole("link", { name: "Abrir wizard" }).click();
    await expect(page).toHaveURL(
      /\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/,
    );
    await expect(page.getByText("Portal exportable")).toBeVisible();
    await expect(page.getByTestId("metric-C1-level-medium")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("reset removes local data and leaves settings empty", async ({
    page,
  }) => {
    await createDraftEvaluation(page, "Portal descartable");
    const oldEvaluationId = page
      .url()
      .match(/\/evaluacion\/([^/]+)\/wizard$/)?.[1];

    await page.getByTestId("nav-localSettings").click();
    await expect(page).toHaveURL(/\/ajustes-locales$/);

    await page.getByTestId("local-reset-open").click();
    await page.getByTestId("local-reset-confirm").click();

    await expect(page.getByText("Datos locales borrados")).toBeVisible();
    await expect(page.getByTestId("local-settings-empty")).toBeVisible();
    await expect(page.getByTestId("nav-wizard")).not.toHaveAttribute(
      "href",
      new RegExp(oldEvaluationId ?? "missing-id"),
    );
    await page.getByTestId("nav-wizard").click();
    await expect(page).not.toHaveURL(
      new RegExp(`/evaluacion/${oldEvaluationId}/wizard`),
    );

    await page.goto("/evaluacion/evaluation-local-missing/wizard");
    await expect(
      page.getByText("Evaluación local no disponible").first(),
    ).toBeVisible();
  });

  test("import replacement does not leave the previous evaluation active", async ({
    page,
  }, testInfo) => {
    await createDraftEvaluation(page, "Portal reemplazado");
    const oldEvaluationId = page
      .url()
      .match(/\/evaluacion\/([^/]+)\/wizard$/)?.[1];

    await page.getByTestId("nav-localSettings").click();
    await expect(page).toHaveURL(/\/ajustes-locales$/);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("local-export-json").click();
    const download = await downloadPromise;
    const exportedPath = path.join(testInfo.outputDir, "miura-original.json");
    const replacementPath = path.join(
      testInfo.outputDir,
      "miura-replacement.json",
    );

    await download.saveAs(exportedPath);

    const replacement = JSON.parse(await readFile(exportedPath, "utf8"));
    replacement.exportedAt = "2026-05-18T10:00:00.000Z";
    replacement.workspaces[0].id = "workspace-imported-replacement";
    replacement.workspaces[0].name = "Organización importada";
    replacement.workspaces[0].updatedAt = "2026-05-18T10:00:00.000Z";
    replacement.projects[0].id = "project-imported-replacement";
    replacement.projects[0].workspaceId = "workspace-imported-replacement";
    replacement.projects[0].name = "Portal importado reemplazo";
    replacement.projects[0].updatedAt = "2026-05-18T10:00:00.000Z";
    replacement.evaluations[0].id = "evaluation-imported-replacement";
    replacement.evaluations[0].projectId = "project-imported-replacement";
    replacement.evaluations[0].name = "Diagnóstico importado";
    replacement.evaluations[0].updatedAt = "2026-05-18T10:00:00.000Z";

    await writeFile(replacementPath, JSON.stringify(replacement), "utf8");
    await page.getByTestId("local-import-file").setInputFiles(replacementPath);

    await expect(page.getByText(/Importación completada/)).toBeVisible();
    await expect(page.getByTestId("local-settings-list")).toContainText(
      "Portal importado reemplazo",
    );
    await expect(page.getByTestId("local-settings-list")).not.toContainText(
      "Portal reemplazado",
    );
    await expect(page.getByTestId("nav-wizard")).toHaveAttribute(
      "href",
      /evaluation-imported-replacement/,
    );
    await expect(page.getByTestId("nav-wizard")).not.toHaveAttribute(
      "href",
      new RegExp(oldEvaluationId ?? "missing-id"),
    );

    await page.getByRole("link", { name: "Abrir wizard" }).click();
    await expect(page).toHaveURL(
      /\/evaluacion\/evaluation-imported-replacement\/wizard$/,
    );
    await expect(page.getByText("Portal importado reemplazo")).toBeVisible();
    await expect(page.getByText("Portal reemplazado")).not.toBeVisible();
  });

  test("shows a visible session-only warning when localStorage write fails", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;

      Storage.prototype.setItem = function setItem(key, value) {
        if (key.includes("miura.local-export")) {
          throw new Error("localStorage blocked for test");
        }

        return originalSetItem.call(this, key, value);
      };
    });

    await createDraftEvaluation(page, "Portal privado");

    await expect(page.getByText("Persistencia limitada").first()).toBeVisible();
    await expect(
      page.getByText(/solo en la sesión actual/i).first(),
    ).toBeVisible();
    await expect(page.getByText("Portal privado")).toBeVisible();
  });

  test("keeps the app usable when localStorage access is blocked", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("Blocked by test policy", "SecurityError");
        },
      });
    });

    await createDraftEvaluation(page, "Portal sin storage");

    await expect(page.getByText("Persistencia limitada").first()).toBeVisible();
    await expect(
      page.getByText(/solo en la sesión actual/i).first(),
    ).toBeVisible();
    await expect(page.getByText("Portal sin storage")).toBeVisible();
  });
});
