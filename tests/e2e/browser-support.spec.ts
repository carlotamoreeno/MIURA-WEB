import { expect, test } from "@playwright/test";

const browserSmokeRoutes = [
  {
    href: "/",
    heading: "Deuda técnica explicada en lenguaje de negocio.",
  },
  {
    href: "/evaluacion/nueva",
    heading: "Crear evaluación MIURA",
  },
  {
    href: "/evaluacion/evaluation-demo/wizard",
    heading: "Wizard de evaluación",
  },
  {
    href: "/evaluacion/evaluation-demo/scorecard",
    heading: "Scorecard MIURA",
  },
  {
    href: "/chat",
    heading: "Pregunta a MIURA",
  },
] as const;

test.describe("MIURA browser support smoke", () => {
  for (const route of browserSmokeRoutes) {
    test(`renders ${route.href}`, async ({ page }) => {
      const response = await page.goto(route.href);

      expect(response?.status()).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.getByText("404")).toHaveCount(0);
    });
  }
});
