import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: {
  evaluate: <T>(pageFunction: () => T) => Promise<T>;
}) {
  const viewport = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    windowWidth: window.innerWidth,
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.windowWidth);
}

test.describe("MIURA methodology and Scrum/Kanban content", () => {
  test("methodology page exposes MIURA flow, formulas, links and mobile layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/metodologia");

    await expect(
      page.getByRole("heading", { level: 1, name: "Metodología MIURA" }),
    ).toBeVisible();
    for (const text of [
      "Measurement",
      "Integration",
      "Uncertainty",
      "Recommendation",
      "Agile Alignment",
      "Código/arquitectura",
      "Documentación/conocimiento",
      "Personas/proceso",
      "DS = 0.40*CDI + 0.25*DDI + 0.35*PDI",
      "Monetización fuerte solo si cada pilar tiene cobertura >= 0.50.",
    ]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
    await expect(
      page.getByText(/framework metodológico preliminar/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Crear evaluación/i }).first(),
    ).toHaveAttribute("href", "/evaluacion/nueva");
    await expect(
      page.getByRole("link", { name: /Ver glosario/i }),
    ).toHaveAttribute("href", "/glosario");
    await expect(
      page.getByRole("link", { name: /Preguntar a MIURA/i }),
    ).toHaveAttribute("href", "/chat");
    await expectNoHorizontalOverflow(page);
  });

  test("Scrum/Kanban page exposes required work points, guardrails, links and mobile layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/scrum-kanban");

    await expect(
      page.getByRole("heading", { level: 1, name: "MIURA en Scrum/Kanban" }),
    ).toBeVisible();
    for (const text of [
      "Product Backlog refinement",
      "Sprint Planning",
      "Sprint Review",
      "Sprint Retrospective",
      "Release planning",
      "Kanban replenishment",
      "Kanban service review",
      "actividad continua sobre el Product Backlog",
      "no es un evento Scrum formal",
      "lead time, cycle time, WIP",
      "no sustituye eventos Scrum",
    ]) {
      await expect(page.getByText(text).first()).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: /Crear evaluación/i }).first(),
    ).toHaveAttribute("href", "/evaluacion/nueva");
    await expect(
      page.getByRole("link", { name: /Ver metodología/i }),
    ).toHaveAttribute("href", "/metodologia");
    await expect(
      page.getByRole("link", { name: /Consultar glosario/i }),
    ).toHaveAttribute("href", "/glosario");
    await expectNoHorizontalOverflow(page);
  });
});
