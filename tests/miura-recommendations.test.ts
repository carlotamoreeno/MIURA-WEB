import { describe, expect, test } from "vitest";

import {
  buildMiuraRecommendationSet,
  calculateMiuraEvaluation,
  classifyDebtSeverity,
  findDominantPillar,
  sampleMiuraLocalExport,
} from "@/lib/miura/domain";
import {
  recommendationSetSchema,
  type CalculationResult,
  type Pillar,
  type PillarResult,
} from "@/lib/miura/schemas";

const sampleProject = sampleMiuraLocalExport.projects[0];
const sampleEvaluation = sampleMiuraLocalExport.evaluations[0];

if (sampleProject === undefined || sampleEvaluation === undefined) {
  throw new Error(
    "The MIURA sample fixture must include one project and one evaluation.",
  );
}

const baseCalculationResult = calculateMiuraEvaluation({
  evaluation: sampleEvaluation,
  project: sampleProject,
});

function pillarResult(
  pillar: Pillar,
  indexValue: number,
  coverage = 0.75,
): PillarResult {
  return {
    pillar,
    indexValue,
    coverage,
    dominantSignals: [`${pillar} signal`],
  };
}

function calculationResultWithPillarIndexes(
  indexes: Record<Pillar, number>,
  overrides: Partial<CalculationResult> = {},
): CalculationResult {
  return {
    ...baseCalculationResult,
    CDI: indexes.code_architecture,
    DDI: indexes.documentation_knowledge,
    PDI: indexes.people_process,
    pillarResults: [
      pillarResult("code_architecture", indexes.code_architecture),
      pillarResult("documentation_knowledge", indexes.documentation_knowledge),
      pillarResult("people_process", indexes.people_process),
    ],
    ...overrides,
  };
}

function searchableText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

describe("MIURA recommendation engine", () => {
  test("classifies DS boundaries into monitor, mitigate and intervene", () => {
    expect(classifyDebtSeverity(0.32)).toBe("monitor");
    expect(classifyDebtSeverity(0.33)).toBe("mitigate");
    expect(classifyDebtSeverity(0.65)).toBe("mitigate");
    expect(classifyDebtSeverity(0.66)).toBe("intervene");
  });

  test("prioritizes improve_evidence when coverage is partial", () => {
    const partialResult = calculationResultWithPillarIndexes(
      {
        code_architecture: 0.8,
        documentation_knowledge: 0.6,
        people_process: 0.7,
      },
      {
        DS: 0.72,
        coverage: {
          code_architecture: 0.75,
          documentation_knowledge: 0.25,
          people_process: 0.75,
        },
        coverageStatus: "partial",
        economicOutputAllowed: false,
        insufficientCoveragePillars: ["documentation_knowledge"],
      },
    );
    const recommendation = buildMiuraRecommendationSet(partialResult);

    expect(recommendation.level).toBe("improve_evidence");
    expect(recommendation.dominantPillar).toBe("code_architecture");
    expect(searchableText(recommendation.summary)).toMatch(
      /Diagnostico parcial/i,
    );
    expect(searchableText(recommendation.actions[0] ?? "")).toMatch(
      /Completar evidencia tecnica/i,
    );
    expect(recommendation.actions.join(" ")).toMatch(
      /PWC, principal o break-even/i,
    );
    expect(recommendationSetSchema.safeParse(recommendation).success).toBe(
      true,
    );
  });

  test("changes recommendation actions according to the dominant pillar", () => {
    const cases = [
      {
        dominantPillar: "code_architecture",
        indexes: {
          code_architecture: 0.8,
          documentation_knowledge: 0.5,
          people_process: 0.5,
        },
        expectedAction: /hotspots|tests|arquitectura/i,
      },
      {
        dominantPillar: "documentation_knowledge",
        indexes: {
          code_architecture: 0.5,
          documentation_knowledge: 0.8,
          people_process: 0.5,
        },
        expectedAction: /documentacion|ADRs|conocimiento/i,
      },
      {
        dominantPillar: "people_process",
        indexes: {
          code_architecture: 0.5,
          documentation_knowledge: 0.5,
          people_process: 0.8,
        },
        expectedAction: /WIP|urgencias|capacidad/i,
      },
    ] as const;

    cases.forEach(({ dominantPillar, indexes, expectedAction }) => {
      const result = calculationResultWithPillarIndexes(indexes, {
        DS: 0.58,
        coverageStatus: "sufficient",
        insufficientCoveragePillars: [],
      });
      const recommendation = buildMiuraRecommendationSet(result);

      expect(recommendation.level).toBe("mitigate");
      expect(recommendation.dominantPillar).toBe(dominantPillar);
      expect(searchableText(recommendation.actions.join(" "))).toMatch(
        expectedAction,
      );
      expect(recommendationSetSchema.safeParse(recommendation).success).toBe(
        true,
      );
    });
  });

  test("uses deterministic tie-breaking for dominant pillar selection", () => {
    const equalIndexesResult = calculationResultWithPillarIndexes({
      code_architecture: 0.5,
      documentation_knowledge: 0.5,
      people_process: 0.5,
    });
    const zeroIndexesResult = calculationResultWithPillarIndexes({
      code_architecture: 0,
      documentation_knowledge: 0,
      people_process: 0,
    });

    expect(findDominantPillar(equalIndexesResult)).toBe("code_architecture");
    expect(findDominantPillar(zeroIndexesResult)).toBe("code_architecture");
  });

  test("includes the required Scrum/Kanban work points without replacement language", () => {
    const recommendation = buildMiuraRecommendationSet(
      calculationResultWithPillarIndexes(
        {
          code_architecture: 0.7,
          documentation_knowledge: 0.6,
          people_process: 0.6,
        },
        {
          DS: 0.66,
          coverageStatus: "sufficient",
          insufficientCoveragePillars: [],
        },
      ),
    );

    expect(recommendation.scrumMapping.map((mapping) => mapping.event)).toEqual(
      [
        "Product Backlog refinement",
        "Sprint Planning",
        "Sprint Review",
        "Sprint Retrospective",
        "Release planning",
        "Kanban replenishment",
        "Kanban service review",
      ],
    );
    expect(recommendation.level).toBe("intervene");
    expect(recommendationSetSchema.safeParse(recommendation).success).toBe(
      true,
    );
    expect(
      [
        recommendation.summary,
        recommendation.actions.join(" "),
        recommendation.scrumMapping
          .map((mapping) => `${mapping.event} ${mapping.action}`)
          .join(" "),
        recommendation.disclaimers.join(" "),
      ].join(" "),
    ).not.toMatch(/sustitu|reemplaz/i);
  });
});
