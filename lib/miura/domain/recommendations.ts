import {
  PILLARS,
  recommendationSetSchema,
  type CalculationResult,
  type Pillar,
  type RecommendationLevel,
  type RecommendationSet,
} from "@/lib/miura/schemas";

import { MIURA_DS_WEIGHTS } from "./calculate";
import { MIURA_PILLARS } from "./metrics";

type SeverityRecommendationLevel = Exclude<
  RecommendationLevel,
  "improve_evidence"
>;

type PillarRecommendationCopy = {
  summaryFocus: string;
  actionsByLevel: Record<SeverityRecommendationLevel, readonly string[]>;
  evidenceAction: string;
};

type ScrumKanbanWorkPoint =
  | "Product Backlog refinement"
  | "Sprint Planning"
  | "Sprint Review"
  | "Sprint Retrospective"
  | "Release planning"
  | "Kanban replenishment"
  | "Kanban service review";

const PILLAR_DS_WEIGHTS = {
  code_architecture: MIURA_DS_WEIGHTS.CDI,
  documentation_knowledge: MIURA_DS_WEIGHTS.DDI,
  people_process: MIURA_DS_WEIGHTS.PDI,
} as const satisfies Record<Pillar, number>;

const PILLAR_INDEX_FIELD = {
  code_architecture: "CDI",
  documentation_knowledge: "DDI",
  people_process: "PDI",
} as const satisfies Record<Pillar, "CDI" | "DDI" | "PDI">;

const SEVERITY_SUMMARIES = {
  monitor:
    "Severidad baja: mantener observación, proteger la evidencia y evitar que las señales detectadas crezcan sin seguimiento.",
  mitigate:
    "Severidad media: mitigar selectivamente las señales dominantes y convertir deuda visible en trabajo priorizable.",
  intervene:
    "Severidad alta: intervenir con foco ejecutivo, capacidad explícita y seguimiento de reducción de fricción.",
} as const satisfies Record<SeverityRecommendationLevel, string>;

const PILLAR_RECOMMENDATION_COPY = {
  code_architecture: {
    summaryFocus:
      "El foco dominante está en código/arquitectura: coste de cambio, hotspots, remediación y calidad técnica observable.",
    actionsByLevel: {
      monitor: [
        "Mantener una lista corta de hotspots y señales de arquitectura que puedan elevar el coste de cambio.",
        "Reservar revisiones ligeras de tests, mantenibilidad y decisiones técnicas antes de que bloqueen roadmap.",
      ],
      mitigate: [
        "Trocear la remediación en incrementos pequeños vinculados a módulos críticos o hotspots con impacto de negocio.",
        "Reforzar tests, acuerdos de arquitectura y criterios de mantenimiento en las zonas donde el cambio sea más costoso.",
      ],
      intervene: [
        "Lanzar una intervención explícita sobre hotspots, pruebas y decisiones arquitectónicas que estén condicionando entrega.",
        "Separar deuda estructural de mejoras genéricas y asignar capacidad protegida con responsables, evidencia y fecha de revisión.",
      ],
    },
    evidenceAction:
      "Completar evidencia técnica de hotspots, remediación, retrabajo y mantenibilidad antes de defender una intervención fuerte.",
  },
  documentation_knowledge: {
    summaryFocus:
      "El foco dominante está en documentación/conocimiento: cobertura crítica, frescura y dependencia de conocimiento tácito.",
    actionsByLevel: {
      monitor: [
        "Mantener inventario de documentación crítica y revisar que las decisiones clave sigan localizables.",
        "Acordar señales tempranas de obsolescencia documental o dependencia de personas concretas.",
      ],
      mitigate: [
        "Actualizar documentación crítica, ADRs y runbooks vinculados a los flujos que más condicionan entrega o soporte.",
        "Planificar transferencia de conocimiento en pares o sesiones cortas para reducir dependencias de referentes únicos.",
      ],
      intervene: [
        "Priorizar recuperación de conocimiento crítico antes de ampliar alcance funcional en zonas con dependencia alta.",
        "Crear un plan de documentación y transferencia con responsables, cadencia y evidencia de uso real por el equipo.",
      ],
    },
    evidenceAction:
      "Completar evidencia de cobertura documental, frescura, onboarding y concentración de conocimiento antes de cerrar diagnóstico.",
  },
  people_process: {
    summaryFocus:
      "El foco dominante está en personas/proceso: fricción operativa, flujo, urgencias y capacidad protegida para deuda.",
    actionsByLevel: {
      monitor: [
        "Mantener visible la fricción atribuible a deuda y revisar si empieza a afectar lead time, urgencias o foco del equipo.",
        "Proteger una capacidad ligera pero explícita para reducción de deuda y prevención dentro del flujo habitual.",
      ],
      mitigate: [
        "Ajustar políticas de WIP, urgencias y capacidad reservada para que la deuda no compita de forma invisible con producto.",
        "Usar métricas de flujo, interrupciones y retrabajo para seleccionar mejoras de proceso con efecto observable.",
      ],
      intervene: [
        "Reordenar demanda, capacidad y urgencias para recuperar previsibilidad antes de asumir nuevos compromisos relevantes.",
        "Establecer una política ejecutiva de capacidad protegida para deuda, con revisión de cumplimiento y fricción reducida.",
      ],
    },
    evidenceAction:
      "Completar evidencia de fricción, lead time, urgencias y capacidad reservada antes de cuantificar decisiones de proceso.",
  },
} as const satisfies Record<Pillar, PillarRecommendationCopy>;

const SCRUM_KANBAN_WORK_POINTS = [
  "Product Backlog refinement",
  "Sprint Planning",
  "Sprint Review",
  "Sprint Retrospective",
  "Release planning",
  "Kanban replenishment",
  "Kanban service review",
] as const satisfies readonly ScrumKanbanWorkPoint[];

const RECOMMENDATION_DISCLAIMERS = [
  "MIURA es un framework preliminar y no está validado industrialmente.",
  "Las recomendaciones traducen señales de severidad, cobertura y pilar dominante; requieren juicio del equipo y evidencia contextual.",
  "MIURA complementa Scrum/Kanban como mecanismo de transparencia y priorización de deuda técnica.",
] as const;

function assertDebtSeverityInRange(DS: number) {
  if (!Number.isFinite(DS) || DS < 0 || DS > 1) {
    throw new Error("DS debe ser un número finito entre 0 y 1.");
  }
}

function classifyDebtSeverity(DS: number): SeverityRecommendationLevel {
  assertDebtSeverityInRange(DS);

  if (DS < 0.33) {
    return "monitor";
  }

  if (DS < 0.66) {
    return "mitigate";
  }

  return "intervene";
}

function pillarLabel(pillar: Pillar) {
  return (
    MIURA_PILLARS.find((pillarDefinition) => pillarDefinition.id === pillar)
      ?.label ?? pillar
  );
}

function pillarIndexValue(
  calculationResult: CalculationResult,
  pillar: Pillar,
) {
  const explicitPillarResult = calculationResult.pillarResults.find(
    (pillarResult) => pillarResult.pillar === pillar,
  );

  if (explicitPillarResult !== undefined) {
    return explicitPillarResult.indexValue;
  }

  return calculationResult[PILLAR_INDEX_FIELD[pillar]];
}

function findDominantPillar(calculationResult: CalculationResult): Pillar {
  return PILLARS.reduce((dominantPillar, candidatePillar) => {
    const dominantIndexValue = pillarIndexValue(
      calculationResult,
      dominantPillar,
    );
    const candidateIndexValue = pillarIndexValue(
      calculationResult,
      candidatePillar,
    );

    if (candidateIndexValue > dominantIndexValue) {
      return candidatePillar;
    }

    if (candidateIndexValue < dominantIndexValue) {
      return dominantPillar;
    }

    const dominantContribution =
      dominantIndexValue * PILLAR_DS_WEIGHTS[dominantPillar];
    const candidateContribution =
      candidateIndexValue * PILLAR_DS_WEIGHTS[candidatePillar];

    return candidateContribution > dominantContribution
      ? candidatePillar
      : dominantPillar;
  }, PILLARS[0]);
}

function formatPillarList(pillars: readonly Pillar[]) {
  return pillars.map(pillarLabel).join(", ");
}

function hasInsufficientCoverage(calculationResult: CalculationResult) {
  return (
    calculationResult.coverageStatus === "partial" ||
    calculationResult.insufficientCoveragePillars.length > 0
  );
}

function buildRecommendationSummary(
  calculationResult: CalculationResult,
  dominantPillar: Pillar,
  level: RecommendationLevel,
) {
  const pillarCopy = PILLAR_RECOMMENDATION_COPY[dominantPillar];

  if (level === "improve_evidence") {
    const insufficientPillars =
      calculationResult.insufficientCoveragePillars.length > 0
        ? ` Pilares con evidencia insuficiente: ${formatPillarList(calculationResult.insufficientCoveragePillars)}.`
        : "";

    return `Diagnóstico parcial: mejorar evidencia antes de monetizar o elevar decisiones fuertes.${insufficientPillars} ${pillarCopy.summaryFocus}`;
  }

  return `${SEVERITY_SUMMARIES[level]} ${pillarCopy.summaryFocus}`;
}

function buildRecommendationActions(
  dominantPillar: Pillar,
  severityLevel: SeverityRecommendationLevel,
  level: RecommendationLevel,
) {
  const pillarCopy = PILLAR_RECOMMENDATION_COPY[dominantPillar];

  if (level === "improve_evidence") {
    return [
      pillarCopy.evidenceAction,
      "Completar al menos dos métricas observables por cada pilar antes de presentar PWC, principal o break-even como salida fuerte.",
      "Separar datos observados, estimaciones y notas de evidencia para que negocio entienda el grado de incertidumbre.",
    ];
  }

  return [
    ...pillarCopy.actionsByLevel[severityLevel],
    "Explicar la recomendación con DS, cobertura y señales dominantes para evitar decisiones basadas en una única métrica.",
  ];
}

function buildScrumKanbanMapping(
  dominantPillar: Pillar,
  level: RecommendationLevel,
) {
  const pillar = pillarLabel(dominantPillar);
  const evidencePrefix =
    level === "improve_evidence"
      ? "Completar evidencia MIURA y "
      : "Usar la recomendación MIURA para ";

  const severityCue =
    level === "monitor"
      ? "seguimiento ligero"
      : level === "mitigate"
        ? "mitigación selectiva"
        : level === "intervene"
          ? "intervención explícita"
          : "diagnóstico parcial";

  return SCRUM_KANBAN_WORK_POINTS.map((event) => {
    switch (event) {
      case "Product Backlog refinement":
        return {
          event,
          action: `${evidencePrefix}convertir señales de ${pillar} en elementos pequeños, ordenables y con evidencia suficiente en el Product Backlog.`,
        };
      case "Sprint Planning":
        return {
          event,
          action: `Reservar capacidad coherente con ${severityCue} y conectar el trabajo de deuda con el Sprint Goal cuando aporte foco real.`,
        };
      case "Sprint Review":
        return {
          event,
          action:
            "Mostrar a stakeholders qué fricción se redujo, qué evidencia cambió y qué decisión de negocio queda mejor informada.",
        };
      case "Sprint Retrospective":
        return {
          event,
          action:
            "Inspeccionar cómo deuda, herramientas, procesos e interacciones afectaron calidad y efectividad, y elegir la mejora más impactante.",
        };
      case "Release planning":
        return {
          event,
          action:
            "Usar DS, cobertura y capacidad perdida como conversación de roadmap externa a los eventos formales de Scrum.",
        };
      case "Kanban replenishment":
        return {
          event,
          action:
            "Seleccionar opciones de deuda para entrada al sistema según capacidad disponible, riesgo y criterios de preparación explícitos.",
        };
      case "Kanban service review":
        return {
          event,
          action:
            "Revisar lead time, WIP, bloqueos, retrabajo y demanda de fallo para decidir ajustes de servicio basados en datos.",
        };
      default:
        event satisfies never;
        throw new Error(`Punto Scrum/Kanban no soportado: ${event}`);
    }
  });
}

function buildMiuraRecommendationSet(
  calculationResult: CalculationResult,
): RecommendationSet {
  const dominantPillar = findDominantPillar(calculationResult);
  const severityLevel = classifyDebtSeverity(calculationResult.DS);
  const level: RecommendationLevel = hasInsufficientCoverage(calculationResult)
    ? "improve_evidence"
    : severityLevel;
  const recommendationSet = {
    evaluationId: calculationResult.evaluationId,
    level,
    summary: buildRecommendationSummary(
      calculationResult,
      dominantPillar,
      level,
    ),
    actions: buildRecommendationActions(dominantPillar, severityLevel, level),
    scrumMapping: buildScrumKanbanMapping(dominantPillar, level),
    dominantPillar,
    disclaimers: [...RECOMMENDATION_DISCLAIMERS],
  } satisfies RecommendationSet;

  return recommendationSetSchema.parse(recommendationSet);
}

export {
  RECOMMENDATION_DISCLAIMERS,
  SCRUM_KANBAN_WORK_POINTS,
  buildMiuraRecommendationSet,
  classifyDebtSeverity,
  findDominantPillar,
  type ScrumKanbanWorkPoint,
  type SeverityRecommendationLevel,
};
