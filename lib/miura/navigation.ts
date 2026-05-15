type MiuraRouteKey =
  | "home"
  | "newEvaluation"
  | "wizard"
  | "scorecard"
  | "report"
  | "chat"
  | "methodology"
  | "scrumKanban"
  | "glossary"
  | "localSettings";

type MiuraNavigationItem = {
  key: MiuraRouteKey;
  href: string;
  label: string;
  description: string;
};

type EvaluationProgressState = {
  label: string;
  step: string;
  value: number;
};

const demoEvaluationId = "demo";

const miuraNavigationItems = {
  home: {
    key: "home",
    href: "/",
    label: "Inicio",
    description: "Resumen de MIURA y propuesta de valor.",
  },
  newEvaluation: {
    key: "newEvaluation",
    href: "/evaluacion/nueva",
    label: "Nueva evaluación",
    description: "Entrada inicial para crear una evaluación local.",
  },
  wizard: {
    key: "wizard",
    href: `/evaluacion/${demoEvaluationId}/wizard`,
    label: "Wizard",
    description: "Recorrido por los tres pilares MIURA.",
  },
  scorecard: {
    key: "scorecard",
    href: `/evaluacion/${demoEvaluationId}/scorecard`,
    label: "Scorecard",
    description: "Vista ejecutiva y técnica de resultados.",
  },
  report: {
    key: "report",
    href: `/evaluacion/${demoEvaluationId}/informe`,
    label: "Informe",
    description: "Salida imprimible o exportable.",
  },
  chat: {
    key: "chat",
    href: "/chat",
    label: "Pregunta a MIURA",
    description: "Superficie de consulta RAG con citas.",
  },
  methodology: {
    key: "methodology",
    href: "/metodologia",
    label: "Metodología",
    description: "Explicación de los pilares y reglas de MIURA.",
  },
  scrumKanban: {
    key: "scrumKanban",
    href: "/scrum-kanban",
    label: "Scrum/Kanban",
    description: "Integración de MIURA con eventos y flujo de trabajo.",
  },
  glossary: {
    key: "glossary",
    href: "/glosario",
    label: "Glosario",
    description: "Definiciones breves de siglas y conceptos.",
  },
  localSettings: {
    key: "localSettings",
    href: "/ajustes-locales",
    label: "Ajustes locales",
    description: "Gestión futura de datos locales de la demo.",
  },
} satisfies Record<MiuraRouteKey, MiuraNavigationItem>;

const primaryNavigation = [
  miuraNavigationItems.home,
  miuraNavigationItems.newEvaluation,
  miuraNavigationItems.wizard,
  miuraNavigationItems.scorecard,
  miuraNavigationItems.report,
  miuraNavigationItems.chat,
];

const knowledgeNavigation = [
  miuraNavigationItems.methodology,
  miuraNavigationItems.scrumKanban,
  miuraNavigationItems.glossary,
  miuraNavigationItems.localSettings,
];

const mvpRouteSmokeTargets = [
  {
    key: "home",
    href: "/",
    heading: "Deuda técnica explicada en lenguaje de negocio.",
  },
  {
    key: "newEvaluation",
    href: "/evaluacion/nueva",
    heading: "Crear evaluación MIURA",
  },
  {
    key: "wizard",
    href: `/evaluacion/${demoEvaluationId}/wizard`,
    heading: "Wizard de evaluación",
  },
  {
    key: "scorecard",
    href: `/evaluacion/${demoEvaluationId}/scorecard`,
    heading: "Scorecard MIURA",
  },
  {
    key: "report",
    href: `/evaluacion/${demoEvaluationId}/informe`,
    heading: "Informe exportable",
  },
  { key: "chat", href: "/chat", heading: "Pregunta a MIURA" },
  { key: "methodology", href: "/metodologia", heading: "Metodología MIURA" },
  {
    key: "scrumKanban",
    href: "/scrum-kanban",
    heading: "MIURA en Scrum/Kanban",
  },
  { key: "glossary", href: "/glosario", heading: "Glosario MIURA" },
  {
    key: "localSettings",
    href: "/ajustes-locales",
    heading: "Ajustes locales",
  },
] satisfies Array<{ key: MiuraRouteKey; href: string; heading: string }>;

function isEvaluationRoute(pathname: string, segment: string) {
  return (
    pathname.startsWith("/evaluacion/") && pathname.endsWith(`/${segment}`)
  );
}

function isNavigationItemActive(pathname: string, item: MiuraNavigationItem) {
  if (item.key === "home") return pathname === "/";
  if (item.key === "wizard") return isEvaluationRoute(pathname, "wizard");
  if (item.key === "scorecard") return isEvaluationRoute(pathname, "scorecard");
  if (item.key === "report") return isEvaluationRoute(pathname, "informe");

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function getRouteTitle(pathname: string) {
  const item = [...primaryNavigation, ...knowledgeNavigation].find((route) =>
    isNavigationItemActive(pathname, route),
  );

  return item?.label ?? "MIURA";
}

function getEvaluationProgress(pathname: string): EvaluationProgressState {
  if (pathname === "/evaluacion/nueva") {
    return {
      label: "Contexto de evaluación",
      step: "Paso 1 de 4",
      value: 20,
    };
  }

  if (isEvaluationRoute(pathname, "wizard")) {
    return {
      label: "Métricas por pilar",
      step: "Paso 2 de 4",
      value: 45,
    };
  }

  if (isEvaluationRoute(pathname, "scorecard")) {
    return {
      label: "Lectura de resultados",
      step: "Paso 3 de 4",
      value: 70,
    };
  }

  if (isEvaluationRoute(pathname, "informe")) {
    return {
      label: "Informe y salida",
      step: "Paso 4 de 4",
      value: 90,
    };
  }

  return {
    label: "Mapa de la demo",
    step: "Sin evaluación activa",
    value: 10,
  };
}

export {
  demoEvaluationId,
  getEvaluationProgress,
  getRouteTitle,
  isNavigationItemActive,
  knowledgeNavigation,
  miuraNavigationItems,
  mvpRouteSmokeTargets,
  primaryNavigation,
  type MiuraNavigationItem,
  type MiuraRouteKey,
};
