import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import MethodologyPage from "@/app/metodologia/page";
import ScrumKanbanPage from "@/app/scrum-kanban/page";
import { MIURA_METRIC_DEFINITIONS } from "@/lib/miura/domain";

describe("MIURA methodology content page", () => {
  test("renders pillars, metrics, formulas, coverage gate and disclaimers", () => {
    render(<MethodologyPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Metodología MIURA",
      }),
    ).toBeInTheDocument();

    for (const flowStep of [
      "Measurement",
      "Integration",
      "Uncertainty",
      "Recommendation",
      "Agile Alignment",
    ]) {
      expect(screen.getByText(flowStep)).toBeInTheDocument();
    }

    for (const pillar of [
      "Código/arquitectura",
      "Documentación/conocimiento",
      "Personas/proceso",
    ]) {
      expect(screen.getByText(pillar)).toBeInTheDocument();
    }

    for (const metric of MIURA_METRIC_DEFINITIONS) {
      expect(screen.getByText(metric.name)).toBeInTheDocument();
    }

    expect(
      screen.getByText("DS = 0.40*CDI + 0.25*DDI + 0.35*PDI"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Monetización fuerte solo si cada pilar tiene cobertura >= 0.50.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/framework metodológico preliminar/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no son contabilidad exacta/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Crear evaluación/i })[0],
    ).toHaveAttribute("href", "/evaluacion/nueva");
    expect(
      screen.getByRole("link", { name: /Preguntar a MIURA/i }),
    ).toHaveAttribute("href", "/chat");
  });
});

describe("MIURA Scrum/Kanban content page", () => {
  test("renders required integration points and replacement guardrail", () => {
    render(<ScrumKanbanPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "MIURA en Scrum/Kanban",
      }),
    ).toBeInTheDocument();

    for (const workPoint of [
      "Product Backlog refinement",
      "Sprint Planning",
      "Sprint Review",
      "Sprint Retrospective",
      "Release planning",
      "Kanban replenishment",
      "Kanban service review",
    ]) {
      expect(screen.getAllByText(workPoint).length).toBeGreaterThan(0);
    }

    expect(
      screen.getByText(/actividad continua sobre el Product Backlog/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no es un evento Scrum formal/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/lead time, cycle time, WIP/i)).toBeInTheDocument();
    expect(screen.getByText(/no sustituye eventos Scrum/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Crear evaluación/i })[0],
    ).toHaveAttribute("href", "/evaluacion/nueva");
    expect(
      screen.getByRole("link", { name: /Ver metodología/i }),
    ).toHaveAttribute("href", "/metodologia");
    expect(
      screen.getByRole("link", { name: /Consultar glosario/i }),
    ).toHaveAttribute("href", "/glosario");
  });
});
