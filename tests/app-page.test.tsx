import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page";

describe("landing navigation content", () => {
  test("renders MIURA positioning, pillars, and primary CTA links", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Deuda técnica explicada en lenguaje de negocio.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("MIURA MVP 0.1")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Crear evaluación MIURA/i }),
    ).toHaveAttribute("href", "/evaluacion/nueva");
    expect(
      screen.getByRole("link", { name: /Preguntar a MIURA/i }),
    ).toHaveAttribute("href", "/chat");

    expect(
      screen.getByRole("heading", { name: "Código/arquitectura" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Documentación/conocimiento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Personas/proceso" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/framework metodológico preliminar/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no son contabilidad exacta/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver glosario de siglas y fórmulas/i }),
    ).toHaveAttribute("href", "/glosario");
    expect(screen.getAllByText(/Demo sin login/i).length).toBeGreaterThan(0);
  });
});
