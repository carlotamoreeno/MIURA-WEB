import { expect, test } from "@playwright/test";

test.describe("MIURA evaluation creation", () => {
  test("rejects invalid creation input with visible Spanish errors", async ({
    page,
  }) => {
    await page.goto("/evaluacion/nueva");

    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByLabel(/email|contraseña|password/i)).toHaveCount(0);

    await page.getByLabel("Capacidad mensual").fill("0");
    await page.getByLabel("Coste hora opcional").fill("-1");
    await page.getByLabel("Horizonte temporal").fill("1.5");
    await page.getByRole("button", { name: /Crear evaluación/i }).click();

    await expect(page.locator("#projectName-error")).toHaveText(
      "El nombre del proyecto es obligatorio.",
    );
    await expect(page.locator("#monthlyCapacityHours-error")).toHaveText(
      "La capacidad mensual debe ser mayor que 0.",
    );
    await expect(page.locator("#hourlyCost-error")).toHaveText(
      "El coste hora no puede ser negativo.",
    );
    await expect(
      page.getByText(
        "El horizonte temporal debe ser un número entero de meses.",
      ),
    ).toBeVisible();
  });

  test("creates a draft evaluation and redirects to the wizard", async ({
    page,
  }) => {
    await page.goto("/evaluacion/nueva");

    await page.getByLabel("Proyecto", { exact: true }).fill("Portal operativo");
    await page.getByLabel("Capacidad mensual").fill("900");
    await page.getByLabel("Horizonte temporal").fill("9");
    await page.getByRole("button", { name: /Crear evaluación/i }).click();

    await expect(page).toHaveURL(
      /\/evaluacion\/evaluation-[a-z0-9-]+\/wizard$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Wizard de evaluación" }),
    ).toBeVisible();
    await expect(page.getByText("Portal operativo")).toBeVisible();
    await expect(page.getByText("Guardado local")).toBeVisible();
    await expect(page.getByText("900 h")).toBeVisible();
    await expect(page.getByText("9 meses")).toBeVisible();
  });

  test("loads the reproducible example scorecard", async ({ page }) => {
    await page.goto("/evaluacion/nueva");

    await page.getByRole("button", { name: /Cargar ejemplo/i }).click();

    await expect(page).toHaveURL("/evaluacion/evaluation-demo/scorecard");
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
});
