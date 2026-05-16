import {
  METRIC_IDS,
  PILLARS,
  type MetricId,
  type Pillar,
  type SimpleLevel,
} from "@/lib/miura/schemas";

type RiskDirection = "higher_is_worse" | "higher_is_better";

type MiuraPillarDefinition = {
  id: Pillar;
  label: string;
  shortLabel: string;
  indexId: "CDI" | "DDI" | "PDI";
  description: string;
};

type SimpleRubricLevelDefinition = {
  value: number;
  label: string;
  description: string;
};

type MetricAdvancedInputGuidance = {
  unit: string;
  source: string;
  timeWindow: string;
  guidance: string;
};

type MetricDefinition = {
  id: MetricId;
  active: true;
  pillar: Pillar;
  name: string;
  description: string;
  riskDirection: RiskDirection;
  helpText: string;
  simpleRubric: Record<SimpleLevel, SimpleRubricLevelDefinition>;
  advancedInput: MetricAdvancedInputGuidance;
  methodologicalCaveat: string;
};

const SIMPLE_RUBRIC_VALUES = {
  low: 0.2,
  medium: 0.5,
  high: 0.8,
} as const satisfies Record<SimpleLevel, number>;

const PROTECTIVE_SIMPLE_RUBRIC_VALUES = {
  low: 0.8,
  medium: 0.5,
  high: 0.2,
} as const satisfies Record<SimpleLevel, number>;

const MIURA_PILLARS = [
  {
    id: "code_architecture",
    label: "Código/arquitectura",
    shortLabel: "Código",
    indexId: "CDI",
    description:
      "Observa señales de mantenibilidad, esfuerzo de remediación, retrabajo e inestabilidad técnica que elevan el coste de cambio.",
  },
  {
    id: "documentation_knowledge",
    label: "Documentación/conocimiento",
    shortLabel: "Documentación",
    indexId: "DDI",
    description:
      "Evalúa si el conocimiento crítico está cubierto, actualizado y puede transferirse sin depender de pocas personas.",
  },
  {
    id: "people_process",
    label: "Personas/proceso",
    shortLabel: "Proceso",
    indexId: "PDI",
    description:
      "Recoge fricción operativa, variabilidad del flujo, urgencias y capacidad real reservada para reducir deuda.",
  },
] as const satisfies readonly MiuraPillarDefinition[];

function buildSimpleRubric(copy: Record<SimpleLevel, string>) {
  return {
    low: {
      value: SIMPLE_RUBRIC_VALUES.low,
      label: "Bajo",
      description: copy.low,
    },
    medium: {
      value: SIMPLE_RUBRIC_VALUES.medium,
      label: "Medio",
      description: copy.medium,
    },
    high: {
      value: SIMPLE_RUBRIC_VALUES.high,
      label: "Alto",
      description: copy.high,
    },
  } satisfies Record<SimpleLevel, SimpleRubricLevelDefinition>;
}

const COMMON_CAVEAT =
  "MIURA usa esta métrica como señal preliminar y no como prueba industrialmente validada; interpreta el resultado junto con fuente, ventana temporal y cobertura.";

const MIURA_METRIC_DEFINITIONS = [
  {
    id: "C1",
    active: true,
    pillar: "code_architecture",
    name: "Esfuerzo de remediación observable",
    description:
      "Estima el esfuerzo visible para corregir problemas técnicos que ya condicionan mantenimiento, evolución o pruebas.",
    riskDirection: "higher_is_worse",
    helpText:
      "Úsala para aproximar el principal técnico: trabajo necesario para reducir deuda detectada en código, arquitectura, pruebas o automatización.",
    simpleRubric: buildSimpleRubric({
      low: "Correcciones acotadas y asumibles dentro de la capacidad habitual del equipo.",
      medium:
        "Remediación relevante que compite con entregables de producto y requiere planificación explícita.",
      high: "Remediación amplia o estructural que puede desplazar roadmap si no se trocea y prioriza.",
    }),
    advancedInput: {
      unit: "horas de remediación estimadas",
      source:
        "Backlog técnico, revisión de arquitectura, SonarQube o estimación del equipo",
      timeWindow: "Diagnóstico actual o próximo trimestre",
      guidance:
        "Registra solo esfuerzo trazable a acciones de reducción de deuda, no mejoras genéricas sin vínculo con coste de cambio.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "C2",
    active: true,
    pillar: "code_architecture",
    name: "Densidad de problemas de mantenibilidad",
    description:
      "Resume la concentración de señales que dificultan comprender, modificar o probar el sistema.",
    riskDirection: "higher_is_worse",
    helpText:
      "Combina problemas como complejidad, duplicación, bajo encapsulamiento, fragilidad de pruebas o issues de mantenibilidad.",
    simpleRubric: buildSimpleRubric({
      low: "Pocas señales relevantes y localizadas; el equipo puede aislarlas con facilidad.",
      medium:
        "Señales repetidas en módulos importantes, aunque todavía gestionables con intervención selectiva.",
      high: "Problemas extendidos o situados en zonas críticas que elevan claramente el coste de cambio.",
    }),
    advancedInput: {
      unit: "issues por KLOC, índice interno o valoración 0-100",
      source:
        "Análisis estático, revisión de pull requests o checklist de mantenibilidad",
      timeWindow: "Último análisis disponible o últimos 3 meses",
      guidance:
        "Declara la herramienta o criterio usado para que la métrica pueda compararse sin depender de un vocabulario propietario.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "C3",
    active: true,
    pillar: "code_architecture",
    name: "Retrabajo o reaperturas",
    description:
      "Mide si los cambios vuelven al flujo por defectos, aclaraciones tardías o soluciones que no resuelven la causa.",
    riskDirection: "higher_is_worse",
    helpText:
      "Una tasa elevada apunta a interés de la deuda: el equipo invierte capacidad en rehacer, estabilizar o corregir trabajo reciente.",
    simpleRubric: buildSimpleRubric({
      low: "Reaperturas puntuales y con causa clara, sin afectar la previsibilidad global.",
      medium:
        "Retrabajo frecuente en algunos módulos o tipos de cambio, con impacto visible en planificación.",
      high: "Reaperturas recurrentes que consumen capacidad y erosionan confianza en entregas.",
    }),
    advancedInput: {
      unit: "% de tickets reabiertos o horas de retrabajo",
      source: "Jira, Azure DevOps, incidencias, postmortems o registro de QA",
      timeWindow: "Últimos 1-3 sprints o últimos 3 meses",
      guidance:
        "Separa defectos funcionales aislados de patrones que sugieren coste de cambio elevado o comprensión insuficiente.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "C4",
    active: true,
    pillar: "code_architecture",
    name: "Churn o inestabilidad en hotspots",
    description:
      "Detecta cambios repetidos en zonas del sistema que concentran valor, defectos o dependencia técnica.",
    riskDirection: "higher_is_worse",
    helpText:
      "Un hotspot muy cambiante puede indicar que decisiones anteriores dificultan evolucionar esa zona con estabilidad.",
    simpleRubric: buildSimpleRubric({
      low: "Los cambios se distribuyen de forma esperable y no se concentran en zonas frágiles.",
      medium:
        "Hay focos de cambio recurrente, pero con ownership y plan de estabilización razonables.",
      high: "Pocos componentes acumulan cambio, defectos o urgencias y bloquean evolución sostenida.",
    }),
    advancedInput: {
      unit: "commits, archivos modificados o hotspots críticos",
      source:
        "Git, analítica de repositorio, incidentes o revisión de arquitectura",
      timeWindow: "Últimos 3-6 meses",
      guidance:
        "Prioriza hotspots con impacto real en entrega o riesgo, no solo ficheros con alta actividad normal.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "D1",
    active: true,
    pillar: "documentation_knowledge",
    name: "Cobertura documental crítica",
    description:
      "Valora si las piezas clave para operar y evolucionar el sistema están documentadas de forma suficiente.",
    riskDirection: "higher_is_better",
    helpText:
      "Es una métrica protectora: mayor cobertura reduce severidad porque facilita comprensión, onboarding y toma de decisiones.",
    simpleRubric: buildSimpleRubric({
      low: "La documentación crítica falta o está dispersa; el equipo depende de explicaciones ad hoc.",
      medium:
        "Existen documentos para áreas principales, pero hay huecos en decisiones, operación o flujos críticos.",
      high: "Los elementos críticos tienen documentación localizable, útil y conectada con el trabajo del equipo.",
    }),
    advancedInput: {
      unit: "% de componentes, flujos o decisiones críticas cubiertas",
      source:
        "Inventario documental, ADRs, runbooks, wiki o revisión del equipo",
      timeWindow: "Revisión actual o último trimestre",
      guidance:
        "Evalúa documentación necesaria para cambiar y operar el sistema, no volumen documental sin uso real.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "D2",
    active: true,
    pillar: "documentation_knowledge",
    name: "Frescura de documentación crítica",
    description:
      "Comprueba si la documentación usada para decidir o ejecutar refleja el estado real del sistema.",
    riskDirection: "higher_is_better",
    helpText:
      "Es una métrica protectora: documentación fresca reduce riesgo de malentendidos, retrabajo y dependencia oral.",
    simpleRubric: buildSimpleRubric({
      low: "La información crítica está obsoleta o contradice el comportamiento actual.",
      medium:
        "Parte de la documentación está al día, pero hay secciones clave que requieren verificación manual.",
      high: "La documentación crítica se revisa con cadencia clara y se actualiza cuando cambian decisiones o flujos.",
    }),
    advancedInput: {
      unit: "% actualizado, días desde última revisión o cadencia cumplida",
      source:
        "Historial de wiki, ADRs, pull requests documentales o revisión del equipo",
      timeWindow: "Últimos 3-6 meses",
      guidance:
        "Registra evidencia de actualización efectiva, no solo fecha de edición sin relación con cambios reales.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "D3",
    active: true,
    pillar: "documentation_knowledge",
    name: "Tiempo de onboarding a productividad",
    description:
      "Estima cuánto tarda una persona nueva o reasignada en contribuir con autonomía razonable.",
    riskDirection: "higher_is_worse",
    helpText:
      "Onboarding lento suele revelar conocimiento tácito, documentación insuficiente o arquitectura difícil de explicar.",
    simpleRubric: buildSimpleRubric({
      low: "Una persona puede aportar con autonomía básica en pocos días o dentro del primer sprint.",
      medium:
        "La incorporación requiere varias semanas y apoyo frecuente de perfiles expertos.",
      high: "La productividad depende de acompañamiento prolongado o conocimiento difícil de transmitir.",
    }),
    advancedInput: {
      unit: "días o semanas hasta productividad",
      source:
        "Historial de incorporaciones, entrevistas internas, planning o retrospectivas",
      timeWindow: "Últimas incorporaciones comparables",
      guidance:
        "Usa rangos prudentes si la evidencia es cualitativa; evita convertir una experiencia aislada en regla general.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "D4",
    active: true,
    pillar: "documentation_knowledge",
    name: "Dependencia de conocimiento tácito",
    description:
      "Valora cuánto depende el proyecto de pocas personas para entender decisiones, riesgos o zonas críticas.",
    riskDirection: "higher_is_worse",
    helpText:
      "Una dependencia alta aumenta riesgo operativo y coste de cambio porque el conocimiento no está distribuido ni documentado.",
    simpleRubric: buildSimpleRubric({
      low: "El conocimiento está repartido y existen referencias suficientes para operar sin una persona concreta.",
      medium:
        "Hay dependencias relevantes, aunque el equipo puede cubrirlas con documentación o rotación controlada.",
      high: "Personas concretas concentran decisiones y contexto crítico; su ausencia bloquearía cambios o soporte.",
    }),
    advancedInput: {
      unit: "bus factor proxy, nº de áreas con único referente o valoración 0-100",
      source:
        "Mapa de ownership, entrevistas, rotación de guardias o retrospectivas",
      timeWindow: "Situación actual o último trimestre",
      guidance:
        "Describe qué conocimiento está concentrado y qué impacto tendría su ausencia en entrega, soporte o evolución.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "P1",
    active: true,
    pillar: "people_process",
    name: "Fricción percibida atribuible a deuda técnica",
    description:
      "Recoge la percepción del equipo sobre cuánto la deuda técnica ralentiza coordinación, entrega o calidad.",
    riskDirection: "higher_is_worse",
    helpText:
      "Sirve para hacer visible fricción que aún no aparece en una herramienta, siempre que se etiquete como evidencia perceptiva.",
    simpleRubric: buildSimpleRubric({
      low: "La deuda rara vez bloquea trabajo o coordinación; los problemas se resuelven dentro del flujo normal.",
      medium:
        "La fricción aparece con frecuencia y obliga a ajustes, aclaraciones o coordinación adicional.",
      high: "La deuda condiciona decisiones diarias, genera interrupciones relevantes y reduce capacidad efectiva.",
    }),
    advancedInput: {
      unit: "escala interna 1-5, % de capacidad percibida o valoración 0-100",
      source: "Retrospectiva, encuesta de equipo, entrevistas o health check",
      timeWindow: "Último sprint, último mes o último trimestre",
      guidance:
        "Acompaña la percepción con ejemplos concretos para no confundir malestar general con deuda técnica observable.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "P2",
    active: true,
    pillar: "people_process",
    name: "Degradación de lead time o cycle time",
    description:
      "Evalúa si el flujo de trabajo se ralentiza por dependencia técnica, retrabajo, esperas o cambios difíciles.",
    riskDirection: "higher_is_worse",
    helpText:
      "Una degradación sostenida del flujo puede indicar interés de deuda: se tarda más en convertir demanda en valor.",
    simpleRubric: buildSimpleRubric({
      low: "El flujo se mantiene estable y las variaciones tienen explicación puntual.",
      medium:
        "Hay degradación o variabilidad apreciable en algunos tipos de trabajo o componentes.",
      high: "El flujo se deteriora de forma sostenida y afecta compromisos, previsibilidad o servicio.",
    }),
    advancedInput: {
      unit: "días de lead/cycle time, percentil o variación %",
      source:
        "Jira, Azure DevOps, tablero Kanban, métricas de flujo o service review",
      timeWindow: "Últimos 3-6 meses o últimas 6-10 iteraciones",
      guidance:
        "Relaciona la degradación con causas atribuibles a deuda técnica antes de usarla como señal MIURA.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "P3",
    active: true,
    pillar: "people_process",
    name: "Trabajo urgente no planificado",
    description:
      "Mide la capacidad absorbida por urgencias, incidencias o interrupciones ligadas a deuda técnica.",
    riskDirection: "higher_is_worse",
    helpText:
      "Cuando las urgencias ocupan capacidad recurrente, el equipo paga interés operativo antes de abordar mejoras sostenibles.",
    simpleRubric: buildSimpleRubric({
      low: "Las urgencias son puntuales y no desplazan compromisos importantes.",
      medium:
        "Las interrupciones compiten con planificación y obligan a reordenar trabajo con frecuencia.",
      high: "La capacidad queda dominada por urgencias o soporte reactivo atribuible a deuda acumulada.",
    }),
    advancedInput: {
      unit: "% de capacidad, horas/mes o nº de incidencias urgentes",
      source: "Backlog, incidentes, guardias, timesheets o revisión de sprint",
      timeWindow: "Últimos 1-3 meses",
      guidance:
        "Incluye solo urgencias razonablemente conectadas con deuda técnica, no cambios de prioridad de negocio sin causa técnica.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
  {
    id: "P4",
    active: true,
    pillar: "people_process",
    name: "Capacidad reservada para reducción de deuda",
    description:
      "Valora si el equipo protege capacidad real para prevenir, reducir o amortizar deuda técnica.",
    riskDirection: "higher_is_better",
    helpText:
      "Es una métrica protectora: mayor capacidad reservada reduce severidad porque crea una vía explícita de amortización.",
    simpleRubric: buildSimpleRubric({
      low: "No hay capacidad protegida o se cancela sistemáticamente ante presión de entrega.",
      medium:
        "Existe reserva parcial o irregular, suficiente para algunas acciones pero frágil ante urgencias.",
      high: "La capacidad de reducción está acordada, visible en planning o flujo, y se ejecuta con seguimiento.",
    }),
    advancedInput: {
      unit: "% de capacidad mensual o horas reservadas",
      source:
        "Planning, políticas de flujo, capacity allocation, backlog técnico o acuerdos de equipo",
      timeWindow: "Último mes, último trimestre o cadencia actual",
      guidance:
        "Registra capacidad realmente ejecutada o protegida, no solo intención declarada sin seguimiento.",
    },
    methodologicalCaveat: COMMON_CAVEAT,
  },
] as const satisfies readonly MetricDefinition[];

const metricDefinitionsById = Object.fromEntries(
  MIURA_METRIC_DEFINITIONS.map((metric) => [metric.id, metric]),
) as Record<MetricId, MetricDefinition>;

function getMetricDefinition(metricId: MetricId) {
  return metricDefinitionsById[metricId];
}

function getMetricsByPillar(pillar: Pillar) {
  return MIURA_METRIC_DEFINITIONS.filter((metric) => metric.pillar === pillar);
}

function normalizeSimpleMetricValue(metricId: MetricId, level: SimpleLevel) {
  const metricDefinition = getMetricDefinition(metricId);

  if (metricDefinition.riskDirection === "higher_is_better") {
    return PROTECTIVE_SIMPLE_RUBRIC_VALUES[level];
  }

  return SIMPLE_RUBRIC_VALUES[level];
}

const metricIdsMatchSchema = MIURA_METRIC_DEFINITIONS.every(
  (metric, index) => metric.id === METRIC_IDS[index],
);

const pillarsMatchSchema = MIURA_PILLARS.every(
  (pillar, index) => pillar.id === PILLARS[index],
);

export {
  MIURA_METRIC_DEFINITIONS,
  MIURA_PILLARS,
  PROTECTIVE_SIMPLE_RUBRIC_VALUES,
  SIMPLE_RUBRIC_VALUES,
  getMetricDefinition,
  getMetricsByPillar,
  metricIdsMatchSchema,
  normalizeSimpleMetricValue,
  pillarsMatchSchema,
  type MetricAdvancedInputGuidance,
  type MetricDefinition,
  type MiuraPillarDefinition,
  type RiskDirection,
  type SimpleRubricLevelDefinition,
};
