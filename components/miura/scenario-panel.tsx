import {
  AlertCircleIcon,
  BarChart3Icon,
  CalculatorIcon,
  Clock3Icon,
  InfoIcon,
  TrendingUpIcon,
} from "lucide-react";

import {
  MIURA_DISCLAIMERS,
  MIURA_PILLARS,
  MINIMUM_ECONOMIC_COVERAGE,
} from "@/lib/miura/domain";
import {
  type CalculationResult,
  type Evaluation,
  type Pillar,
  type Project,
  type Scenario,
  type ScenarioResult,
} from "@/lib/miura/schemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ScenarioPanelProps = {
  calculationResult: CalculationResult;
  project: Project;
  evaluation: Evaluation;
};

const scenarioLabels = {
  conservative: "Conservador",
  central: "Central",
  tensioned: "Tensionado",
} as const satisfies Record<Scenario, string>;

const scenarioDescriptions = {
  conservative: "Lectura prudente para una conversación inicial.",
  central: "Hipótesis base para priorización y seguimiento.",
  tensioned: "Lectura de tensión si la fricción se mantiene.",
} as const satisfies Record<Scenario, string>;

function formatScore(value: number) {
  return value.toFixed(2);
}

function formatCoefficient(value: number) {
  return value.toFixed(4);
}

function formatHours(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function pillarLabel(pillar: Pillar) {
  return (
    MIURA_PILLARS.find((pillarDefinition) => pillarDefinition.id === pillar)
      ?.label ?? pillar
  );
}

function hasPositiveHourlyCost(project: Project) {
  return (
    typeof project.hourlyCost === "number" &&
    Number.isFinite(project.hourlyCost) &&
    project.hourlyCost > 0
  );
}

function canShowScenarioMoney(
  calculationResult: CalculationResult,
  scenario: ScenarioResult,
) {
  return calculationResult.economicOutputAllowed && scenario.PWC !== undefined;
}

function EconomicReadinessAlert({
  calculationResult,
  project,
}: {
  calculationResult: CalculationResult;
  project: Project;
}) {
  if (calculationResult.coverageStatus === "partial") {
    const insufficientPillars = calculationResult.insufficientCoveragePillars
      .map(pillarLabel)
      .join(", ");

    return (
      <Alert className="border-info-border bg-info-bg text-info-foreground">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Monetización bloqueada por cobertura</AlertTitle>
        <AlertDescription className="leading-6">
          Pilares por debajo de cobertura{" "}
          {formatScore(MINIMUM_ECONOMIC_COVERAGE)}: {insufficientPillars}. El
          panel mantiene capacidad perdida en horas, pero bloquea PWC, principal
          y break-even hasta mejorar evidencia.
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasPositiveHourlyCost(project)) {
    return (
      <Alert className="border-info-border bg-info-bg text-info-foreground">
        <Clock3Icon aria-hidden="true" />
        <AlertTitle>Lectura en horas</AlertTitle>
        <AlertDescription className="leading-6">
          No se ha informado un coste hora positivo. MIURA conserva los tres
          escenarios de capacidad perdida y evita mostrar salidas monetarias.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-info-border bg-info-bg text-info-foreground">
      <InfoIcon aria-hidden="true" />
      <AlertTitle>Escenario, no contabilidad exacta</AlertTitle>
      <AlertDescription className="leading-6">
        {MIURA_DISCLAIMERS.economic}
      </AlertDescription>
    </Alert>
  );
}

function ScenarioItem({
  calculationResult,
  scenario,
  horizonMonths,
}: {
  calculationResult: CalculationResult;
  scenario: ScenarioResult;
  horizonMonths: number;
}) {
  const projectedWasteCost = canShowScenarioMoney(calculationResult, scenario)
    ? scenario.PWC
    : undefined;

  return (
    <div
      data-testid={`scenario-card-${scenario.scenario}`}
      className="border-border bg-background rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h4 className="font-medium">{scenarioLabels[scenario.scenario]}</h4>
          <p className="text-muted-foreground text-sm leading-6">
            {scenarioDescriptions[scenario.scenario]}
          </p>
        </div>
        <Badge
          variant={scenario.scenario === "central" ? "default" : "outline"}
        >
          λ {formatScore(scenario.lambda)}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <div>
          <p className="text-muted-foreground text-xs">Capacidad perdida</p>
          <p className="text-2xl font-semibold">
            {formatHours(scenario.lostHoursMonthly)} h/mes
          </p>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="border-border bg-muted/35 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Horizonte total</p>
            <p className="mt-1 font-medium">
              {formatHours(scenario.lostHoursTotal)} h en {horizonMonths} meses
            </p>
          </div>
          <div className="border-border bg-muted/35 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">CF del escenario</p>
            <p className="mt-1 font-medium">{formatCoefficient(scenario.CF)}</p>
          </div>
        </div>
      </div>

      {projectedWasteCost !== undefined && (
        <div className="border-border mt-4 border-t pt-4">
          <p className="text-muted-foreground text-xs">
            Coste proyectado de fricción (PWC)
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatCurrency(projectedWasteCost, scenario.currency)}
          </p>
        </div>
      )}
    </div>
  );
}

function ScenarioInputsSummary({
  calculationResult,
  evaluation,
  project,
}: {
  calculationResult: CalculationResult;
  evaluation: Evaluation;
  project: Project;
}) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Capacidad base</p>
        <p className="mt-1 font-medium">
          {formatHours(project.monthlyCapacityHours)} h/mes
        </p>
      </div>
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Horizonte</p>
        <p className="mt-1 font-medium">{evaluation.horizonMonths} meses</p>
      </div>
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Estado económico</p>
        <p className="mt-1 font-medium">
          {calculationResult.economicOutputAllowed
            ? "Disponible con supuestos"
            : "Solo capacidad"}
        </p>
      </div>
    </div>
  );
}

function PrincipalBreakEven({
  calculationResult,
  project,
}: {
  calculationResult: CalculationResult;
  project: Project;
}) {
  if (
    calculationResult.principal === undefined &&
    calculationResult.breakEven === undefined
  ) {
    return null;
  }

  return (
    <div
      data-testid="scenario-economics"
      className="border-border bg-muted/35 rounded-lg border p-4"
    >
      <div className="flex items-center gap-2">
        <CalculatorIcon aria-hidden="true" className="text-primary size-4" />
        <h4 className="font-medium">Principal y break-even heurístico</h4>
      </div>
      <div className="mt-4 grid gap-3">
        {calculationResult.principal !== undefined && (
          <div>
            <p className="text-muted-foreground text-xs">
              Principal de remediación
            </p>
            <p className="mt-1 text-xl font-semibold">
              {formatCurrency(calculationResult.principal, project.currency)}
            </p>
          </div>
        )}
        {calculationResult.breakEven !== undefined && (
          <div>
            <p className="text-muted-foreground text-xs">
              Break-even heurístico
            </p>
            <p className="mt-1 text-xl font-semibold">
              {formatHours(calculationResult.breakEven.months)} meses
            </p>
          </div>
        )}
      </div>
      <p className="text-muted-foreground mt-4 leading-6">
        Estimación basada en el escenario central y en supuestos explícitos; no
        es contabilidad exacta ni compromiso financiero.
      </p>
      {calculationResult.breakEven !== undefined && (
        <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
          {calculationResult.breakEven.assumptions.map((assumption) => (
            <li key={assumption} className="flex gap-2 leading-6">
              <TrendingUpIcon
                aria-hidden="true"
                className="text-primary mt-1 size-4 shrink-0"
              />
              <span>{assumption}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScenarioPanel({
  calculationResult,
  evaluation,
  project,
}: ScenarioPanelProps) {
  return (
    <Card data-testid="scenario-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3Icon aria-hidden="true" className="text-primary size-4" />
          <CardTitle>Fricción, capacidad y coste</CardTitle>
        </div>
        <CardDescription>
          Escenarios MIURA con capacidad perdida como salida principal y euros
          solo cuando la evidencia permite defenderlos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EconomicReadinessAlert
          calculationResult={calculationResult}
          project={project}
        />
        <ScenarioInputsSummary
          calculationResult={calculationResult}
          evaluation={evaluation}
          project={project}
        />
        <div className="grid gap-3">
          {calculationResult.scenarios.map((scenario) => (
            <ScenarioItem
              key={scenario.scenario}
              calculationResult={calculationResult}
              scenario={scenario}
              horizonMonths={evaluation.horizonMonths}
            />
          ))}
        </div>
        <PrincipalBreakEven
          calculationResult={calculationResult}
          project={project}
        />
      </CardContent>
    </Card>
  );
}

export { ScenarioPanel };
