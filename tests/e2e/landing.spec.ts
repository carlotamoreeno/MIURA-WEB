import { expect, test } from "@playwright/test";

test("landing smoke renders the MIURA baseline", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/MIURA Web App/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Deuda técnica explicada en lenguaje de negocio.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Demo sin login")).toBeVisible();
});
