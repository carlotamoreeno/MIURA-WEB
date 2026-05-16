import {
  MINIMUM_ECONOMIC_COVERAGE,
  MIURA_DS_WEIGHTS,
  MIURA_FRICTION_SCENARIOS,
} from "./calculate";
import { MIURA_METRIC_DEFINITIONS } from "./metrics";

type HelpCategory = "methodology" | "metric" | "formula" | "economic";

type MiuraHelpEntry = {
  id: string;
  term: string;
  category: HelpCategory;
  shortDefinition: string;
  businessExplanation: string;
  formula?: string;
  example?: string;
  aliases?: readonly string[];
};

type MiuraGlossaryGroup = {
  id: string;
  title: string;
  description: string;
  entries: readonly MiuraHelpEntry[];
};

type FormulaHelpId =
  | "pillar-indexes"
  | "debt-severity"
  | "friction-scenarios"
  | "coverage-gate"
  | "economic-outputs";

type MiuraFormulaHelp = {
  id: FormulaHelpId;
  title: string;
  summary: string;
  formula: string;
  businessExplanation: string;
};

const dsFormula = `DS = ${MIURA_DS_WEIGHTS.CDI.toFixed(2)}*CDI + ${MIURA_DS_WEIGHTS.DDI.toFixed(2)}*DDI + ${MIURA_DS_WEIGHTS.PDI.toFixed(2)}*PDI`;
const scenarioLabels = {
  conservative: "conservador",
  central: "central",
  tensioned: "tensionado",
} as const;
const frictionFormula = MIURA_FRICTION_SCENARIOS.map(
  (scenario) =>
    `${scenarioLabels[scenario.scenario]}: λ=${scenario.lambda.toFixed(2)}`,
).join(" · ");

const MIURA_DISCLAIMERS = {
  preliminary:
    "MIURA es un framework metodológico preliminar y no está validado industrialmente. Úsalo como apoyo para conversar, priorizar y decidir con evidencia, no como certificación automática.",
  economic:
    "Las salidas económicas de MIURA son escenarios proyectados bajo supuestos declarados. No son contabilidad exacta, predicción calibrada ni auditoría financiera.",
  coverage:
    "Si cualquier pilar tiene cobertura inferior al 50%, la app mantiene diagnóstico e índices, pero bloquea PWC, principal y break-even como salida fuerte hasta mejorar evidencia.",
  localDemo:
    "MVP 0.1 funciona sin login. Las evaluaciones pertenecen al navegador del usuario y no deben persistirse en servidor.",
} as const;

const MIURA_FORMULA_HELP = [
  {
    id: "pillar-indexes",
    title: "CDI, DDI y PDI",
    summary:
      "Son los índices de severidad por pilar: código/arquitectura, documentación/conocimiento y personas/proceso.",
    formula:
      "Cada índice es la media de las métricas observadas del pilar, con pesos internos iguales y cobertura separada.",
    businessExplanation:
      "Separar los pilares evita convertir toda deuda técnica en refactorización: también muestra conocimiento frágil y fricción de proceso.",
  },
  {
    id: "debt-severity",
    title: "DS",
    summary:
      "Debt Severity resume la exposición global de la evaluación MIURA en una escala de 0 a 1.",
    formula: dsFormula,
    businessExplanation:
      "DS ayuda a decidir si conviene monitorizar, mitigar selectivamente o intervenir, sin presentar una cifra como verdad absoluta.",
  },
  {
    id: "friction-scenarios",
    title: "CF por escenarios",
    summary:
      "Cost of Friction traduce DS a fricción operativa con tres escenarios prudentes.",
    formula: `CF = λ*DS · ${frictionFormula}`,
    businessExplanation:
      "Los escenarios muestran rango de conversación: conservador, central y tensionado. La capacidad perdida se interpreta antes que euros.",
  },
  {
    id: "coverage-gate",
    title: "Cobertura mínima",
    summary:
      "La cobertura indica cuánta evidencia observable hay por pilar frente a las cuatro métricas base.",
    formula: `Monetización fuerte solo si cada pilar tiene cobertura >= ${MINIMUM_ECONOMIC_COVERAGE.toFixed(2)}.`,
    businessExplanation:
      "Cuando faltan señales, MIURA prefiere pedir mejor evidencia antes de convertir el diagnóstico en coste proyectado.",
  },
  {
    id: "economic-outputs",
    title: "PWC, principal y break-even",
    summary:
      "Son salidas económicas opcionales y condicionadas a datos válidos, cobertura suficiente y supuestos visibles.",
    formula:
      "PWC requiere capacidad, horizonte y coste hora; principal requiere esfuerzo de remediación y coste hora; break-even usa el escenario central.",
    businessExplanation:
      "Estas salidas ayudan a discutir coste de no actuar, pero deben leerse como escenarios heurísticos.",
  },
] as const satisfies readonly MiuraFormulaHelp[];

const coreGlossaryEntries: readonly MiuraHelpEntry[] = [
  {
    id: "technical-debt",
    term: "Deuda técnica",
    category: "methodology",
    shortDefinition:
      "Decisiones o carencias técnicas que aceleran o facilitan algo hoy, pero elevan coste, riesgo o lentitud futura.",
    businessExplanation:
      "MIURA la traduce a riesgo, capacidad perdida, evidencia y próximos pasos para que negocio y técnica puedan priorizar juntos.",
    example:
      "Un módulo crítico difícil de probar puede parecer estable hasta que cada cambio exige retrabajo y coordinación adicional.",
  },
  {
    id: "interest",
    term: "Interés de la deuda",
    category: "methodology",
    shortDefinition:
      "Capacidad que el equipo paga de forma recurrente por convivir con deuda técnica.",
    businessExplanation:
      "Se observa en retrabajo, urgencias, esperas, reaperturas, onboarding lento o degradación del flujo.",
    aliases: ["interés"],
  },
  {
    id: "simple-rubric",
    term: "Rúbrica simple bajo/medio/alto",
    category: "metric",
    shortDefinition:
      "Entrada guiada para valorar cada métrica sin exigir una herramienta técnica concreta.",
    businessExplanation:
      "Bajo, medio y alto permiten avanzar con evidencia cualitativa cuando aún no hay medición madura; las métricas protectoras invierten la lectura.",
    formula:
      "Bajo=0.20, Medio=0.50, Alto=0.80; protectoras invierten la severidad.",
  },
  {
    id: "protective-metric",
    term: "Métrica protectora",
    category: "metric",
    shortDefinition:
      "Métrica donde un valor alto reduce severidad porque protege al equipo o al sistema.",
    businessExplanation:
      "En el MVP son D1, D2 y P4. Mejor documentación o capacidad reservada para deuda reduce exposición.",
    example:
      "Si P4 es alto, hay capacidad real para reducir deuda; por eso su severidad normalizada baja.",
  },
  {
    id: "evidence",
    term: "Evidencia, fuente y ventana temporal",
    category: "metric",
    shortDefinition:
      "Contexto mínimo para que un dato sea interpretable y trazable.",
    businessExplanation:
      "Fuente dice de dónde sale el dato; ventana temporal evita decidir por una foto puntual; nota de evidencia explica el criterio usado.",
  },
  {
    id: "coverage",
    term: "Cobertura",
    category: "formula",
    shortDefinition:
      "Porcentaje de métricas observables disponibles dentro de cada pilar.",
    businessExplanation:
      "Una cobertura baja no invalida el diagnóstico, pero sí reduce confianza y bloquea monetización fuerte.",
    formula: `Cada pilar necesita cobertura >= ${MINIMUM_ECONOMIC_COVERAGE.toFixed(2)} para PWC fuerte.`,
  },
  {
    id: "cdi",
    term: "CDI",
    category: "formula",
    shortDefinition: "Índice de severidad del pilar Código/arquitectura.",
    businessExplanation:
      "Resume señales de mantenibilidad, esfuerzo de remediación, retrabajo e inestabilidad técnica.",
    aliases: ["Code Debt Index"],
  },
  {
    id: "ddi",
    term: "DDI",
    category: "formula",
    shortDefinition:
      "Índice de severidad del pilar Documentación/conocimiento.",
    businessExplanation:
      "Resume cobertura documental, frescura, onboarding y dependencia de conocimiento tácito.",
    aliases: ["Documentation Debt Index"],
  },
  {
    id: "pdi",
    term: "PDI",
    category: "formula",
    shortDefinition: "Índice de severidad del pilar Personas/proceso.",
    businessExplanation:
      "Resume fricción percibida, flujo, urgencias y capacidad protegida para reducir deuda.",
    aliases: ["Process Debt Index"],
  },
  {
    id: "ds",
    term: "DS",
    category: "formula",
    shortDefinition: "Debt Severity: severidad global MIURA en escala 0 a 1.",
    businessExplanation:
      "Combina los tres pilares con pesos explícitos y sirve para orientar monitorización, mitigación o intervención.",
    formula: dsFormula,
  },
  {
    id: "cf",
    term: "CF",
    category: "formula",
    shortDefinition:
      "Cost of Friction: traducción escenarizada de severidad a fricción operativa.",
    businessExplanation:
      "Permite discutir capacidad perdida con tres hipótesis de tensión, antes de hablar de euros.",
    formula: `CF = λ*DS · ${frictionFormula}`,
  },
  {
    id: "pwc",
    term: "PWC",
    category: "economic",
    shortDefinition:
      "Projected Waste Cost: coste proyectado de fricción cuando hay datos válidos suficientes.",
    businessExplanation:
      "Solo aparece como salida fuerte con cobertura suficiente, capacidad, horizonte y coste hora positivo.",
  },
  {
    id: "principal",
    term: "Principal de remediación",
    category: "economic",
    shortDefinition: "Coste estimado de ejecutar la remediación priorizada.",
    businessExplanation:
      "En el MVP se deriva del esfuerzo de C1 cuando existe evidencia avanzada y coste hora.",
  },
  {
    id: "break-even",
    term: "Break-even heurístico",
    category: "economic",
    shortDefinition:
      "Estimación de cuándo la remediación podría compensar la fricción evitada.",
    businessExplanation:
      "Requiere principal y escenario central; siempre debe leerse como aproximación, no como compromiso financiero.",
    aliases: ["punto de equilibrio"],
  },
] as const;

const metricGlossaryEntries: readonly MiuraHelpEntry[] =
  MIURA_METRIC_DEFINITIONS.map((metric) => ({
    id: `metric-${metric.id.toLowerCase()}`,
    term: `${metric.id} · ${metric.name}`,
    category: "metric",
    shortDefinition: metric.description,
    businessExplanation: metric.helpText,
    example: metric.advancedInput.guidance,
    aliases:
      metric.riskDirection === "higher_is_better"
        ? (["métrica protectora"] as const)
        : undefined,
  }));

const MIURA_GLOSSARY_GROUPS: readonly MiuraGlossaryGroup[] = [
  {
    id: "concepts",
    title: "Conceptos base",
    description:
      "Términos que explican la lectura de deuda técnica para negocio y delivery.",
    entries: coreGlossaryEntries.filter(
      (entry) => entry.category === "methodology",
    ),
  },
  {
    id: "metrics",
    title: "Métricas y evidencia",
    description:
      "Ayudas para interpretar el catálogo MIURA, la rúbrica simple y las fuentes.",
    entries: [
      ...coreGlossaryEntries.filter((entry) => entry.category === "metric"),
      ...metricGlossaryEntries,
    ],
  },
  {
    id: "formulas",
    title: "Índices, fórmulas y cobertura",
    description:
      "Explicaciones breves de los cálculos que aparecen en la scorecard técnica.",
    entries: coreGlossaryEntries.filter(
      (entry) => entry.category === "formula",
    ),
  },
  {
    id: "economics",
    title: "Escenarios económicos",
    description:
      "Términos condicionados a cobertura y datos válidos; no son contabilidad exacta.",
    entries: coreGlossaryEntries.filter(
      (entry) => entry.category === "economic",
    ),
  },
] as const;

const REQUIRED_GLOSSARY_TERM_IDS = [
  "cdi",
  "ddi",
  "pdi",
  "ds",
  "cf",
  "pwc",
  "principal",
  "break-even",
  "coverage",
  "technical-debt",
  "interest",
  "simple-rubric",
  "protective-metric",
  "evidence",
] as const;

function getMiuraFormulaHelp(id: FormulaHelpId) {
  const help = MIURA_FORMULA_HELP.find((entry) => entry.id === id);

  if (help === undefined) {
    throw new Error(`No existe ayuda de fórmula MIURA para ${id}.`);
  }

  return help;
}

export {
  getMiuraFormulaHelp,
  MIURA_DISCLAIMERS,
  MIURA_FORMULA_HELP,
  MIURA_GLOSSARY_GROUPS,
  REQUIRED_GLOSSARY_TERM_IDS,
  coreGlossaryEntries,
  metricGlossaryEntries,
  type FormulaHelpId,
  type HelpCategory,
  type MiuraFormulaHelp,
  type MiuraGlossaryGroup,
  type MiuraHelpEntry,
};
