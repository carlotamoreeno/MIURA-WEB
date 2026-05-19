import { describe, expect, test } from "vitest";

import {
  buildMiuraRecommendationSet,
  buildMiuraReportData,
  calculateMiuraEvaluation,
  renderMiuraReportMarkdown,
  sampleMiuraLocalExport,
} from "@/lib/miura/domain";
import type { Evaluation } from "@/lib/miura/schemas";

const sampleWorkspace = sampleMiuraLocalExport.workspaces[0];
const sampleProject = sampleMiuraLocalExport.projects[0];
const sampleEvaluation = sampleMiuraLocalExport.evaluations[0];
const generatedAt = "2026-05-19T10:30:00.000Z";
const appVersion = "0.1.0";

if (
  sampleWorkspace === undefined ||
  sampleProject === undefined ||
  sampleEvaluation === undefined
) {
  throw new Error(
    "The MIURA sample fixture must include one workspace, project and evaluation.",
  );
}

function buildReport(evaluation: Evaluation = sampleEvaluation) {
  const calculationResult = calculateMiuraEvaluation({
    project: sampleProject,
    evaluation,
  });
  const recommendationSet = buildMiuraRecommendationSet(calculationResult);

  return buildMiuraReportData({
    appVersion,
    generatedAt,
    workspace: sampleWorkspace,
    project: sampleProject,
    evaluation,
    calculationResult,
    recommendationSet,
  });
}

function buildPartialEvaluation(): Evaluation {
  return {
    ...sampleEvaluation,
    id: "evaluation-report-partial",
    metricValues: sampleEvaluation.metricValues
      .filter((metricValue) =>
        ["C1", "D1", "D2", "D4", "P1", "P2", "P4"].includes(
          metricValue.metricId,
        ),
      )
      .map((metricValue) => ({
        ...metricValue,
        id: `${metricValue.id}-partial`,
        evaluationId: "evaluation-report-partial",
      })),
  };
}

describe("MIURA report export", () => {
  test("renders deterministic Markdown blocks for the reproducible example", () => {
    process.env.MIURA_FAKE_SECRET_FOR_REPORT_TEST = "super-secret-report-value";

    const report = buildReport();
    const markdown = renderMiuraReportMarkdown(report);

    expect(report.metricRows).toHaveLength(12);
    expect(markdown).toContain(
      "# Informe MIURA - Producto interno de consultoría",
    );
    expect(markdown).toContain("Versión app: 0.1.0");
    expect(markdown).toContain("Generado:");
    expect(markdown).toContain("Estado: Diagnóstico con cobertura suficiente");
    expect(markdown).toContain("Recomendación principal: intervenir.");
    expect(markdown).toContain("Pilar dominante: Personas/proceso.");
    expect(markdown).toContain("| CDI | 0.70 |");
    expect(markdown).toContain("| DDI | 0.60 |");
    expect(markdown).toContain("| PDI | 0.80 |");
    expect(markdown).toContain("| DS | 0.71 |");
    expect(markdown).toContain("Conservador");
    expect(markdown).toContain("Central");
    expect(markdown).toContain("Tensionado");
    expect(markdown).toContain("149,1 h/mes");
    expect(markdown).toContain("Principal de remediación:");
    expect(markdown).toContain("Break-even heurístico: 3,5 meses.");
    expect(markdown).toContain("C1 - Esfuerzo de remediación observable");
    expect(markdown).toContain(
      "P4 - Capacidad reservada para reducción de deuda",
    );
    expect(markdown).toContain("Product Backlog refinement");
    expect(markdown).toContain("MIURA es un framework metodológico preliminar");
    expect(markdown).toContain("puede contener nombres, métricas, notas");
    expect(markdown).not.toContain("super-secret-report-value");

    delete process.env.MIURA_FAKE_SECRET_FOR_REPORT_TEST;
  });

  test("marks partial diagnosis and omits strong monetary outputs", () => {
    const report = buildReport(buildPartialEvaluation());
    const markdown = renderMiuraReportMarkdown(report);

    expect(report.diagnosisLabel).toBe("Diagnóstico parcial");
    expect(report.calculationResult.coverageStatus).toBe("partial");
    expect(report.calculationResult.economicOutputAllowed).toBe(false);
    expect(
      report.scenarioRows.every((row) => row.projectedWasteCost === undefined),
    ).toBe(true);
    expect(markdown).toContain("Estado: Diagnóstico parcial");
    expect(markdown).toContain("Recomendación principal: mejorar evidencia.");
    expect(markdown).toContain(
      "| Código/arquitectura | CDI | 0.25 (25%) | Parcial |",
    );
    expect(markdown).toContain("No disponible");
    expect(markdown).not.toContain("Principal de remediación:");
    expect(markdown).not.toContain("Break-even heurístico:");
  });
});
