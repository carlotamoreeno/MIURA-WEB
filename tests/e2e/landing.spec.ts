import { expect, test } from "@playwright/test";

import { mvpRouteSmokeTargets } from "../../lib/miura/navigation";

test.describe("MIURA navigation shell", () => {
  for (const route of mvpRouteSmokeTargets) {
    test(`renders ${route.href} without 404`, async ({ page }) => {
      const response = await page.goto(route.href);

      expect(response?.status()).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.getByText("404")).toHaveCount(0);
      await expect(page.getByTestId(`nav-${route.key}`)).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  }

  test("landing exposes evaluation and chat CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Inicio \| MIURA/);
    await expect(
      page.getByRole("link", { name: /Crear evaluación MIURA/i }),
    ).toHaveAttribute("href", "/evaluacion/nueva");
    await expect(
      page.getByRole("link", { name: /Preguntar a MIURA/i }),
    ).toHaveAttribute("href", "/chat");
    await expect(
      page.getByRole("heading", { name: "Demo sin login" }),
    ).toBeVisible();
    await expect(page.getByText(/no son contabilidad exacta/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Ver glosario de siglas y fórmulas/i }),
    ).toHaveAttribute("href", "/glosario");
  });

  test("mobile sidebar opens and navigates to glossary", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByTestId("sidebar-trigger").click();
    await page.getByRole("link", { name: "Glosario" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Glosario MIURA" }),
    ).toBeVisible();
  });
});
