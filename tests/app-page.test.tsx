import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "@/app/page";

describe("landing placeholder", () => {
  test("renders MIURA positioning and the three pillars", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Deuda técnica explicada en lenguaje de negocio.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Demo sin login")).toBeInTheDocument();

    const pillarHeadings = screen.getAllByRole("heading", { level: 2 });

    expect(pillarHeadings).toHaveLength(3);
    expect(
      screen.getByRole("heading", { name: "Código y arquitectura" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Documentación y conocimiento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Personas y proceso" }),
    ).toBeInTheDocument();
  });
});
