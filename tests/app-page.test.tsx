import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page";

describe("landing visual system showcase", () => {
  test("renders MIURA positioning, pillars, and accessible severity states", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Deuda técnica explicada en lenguaje de negocio.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo sin login")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sistema visual MIURA" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Código y arquitectura" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Documentación y conocimiento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Personas y proceso" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bajo · Controlado")).toBeInTheDocument();
    expect(screen.getByText("Medio · Priorizar")).toBeInTheDocument();
    expect(screen.getByText("Alto · Intervenir")).toBeInTheDocument();
  });
});
