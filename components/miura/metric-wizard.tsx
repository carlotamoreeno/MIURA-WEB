"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  SaveIcon,
} from "lucide-react";

import {
  MIURA_PILLARS,
  TOTAL_METRICS,
  buildEvaluationFromMetricWizardInputs,
  buildMetricWizardInputs,
  getMetricsByPillar,
  requiredMetricIdsForPillar,
  summarizeMetricWizardInputs,
  type MetricDefinition,
  type MetricWizardEntryMode,
  type MetricWizardFieldErrors,
  type MetricWizardInput,
  type MetricWizardMetricErrors,
} from "@/lib/miura/domain";
import {
  METRIC_IDS,
  SIMPLE_LEVELS,
  type MetricId,
  type Pillar,
  type SimpleLevel,
} from "@/lib/miura/schemas";
import {
  getTemporaryEvaluationSession,
  updateTemporaryEvaluationSession,
  type TemporaryEvaluationSession,
} from "@/lib/miura/session/evaluation-session";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type MetricWizardProps = {
  evaluationId: string;
};

type MetricInputPatch = Partial<MetricWizardInput>;

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function inputErrorId(
  metricId: MetricId,
  field: keyof MetricWizardFieldErrors,
) {
  return `metric-${metricId}-${field}-error`;
}

function describedBy(
  metricId: MetricId,
  field: keyof MetricWizardFieldErrors,
  errors?: MetricWizardFieldErrors,
) {
  return errors?.[field] === undefined
    ? undefined
    : inputErrorId(metricId, field);
}

function WizardMessage({
  message,
  variant,
}: {
  message?: string;
  variant: "success" | "error";
}) {
  if (message === undefined) return null;

  return (
    <Alert
      variant={variant === "error" ? "destructive" : "default"}
      className={
        variant === "success"
          ? "border-info-border bg-info-bg text-info-foreground"
          : undefined
      }
    >
      {variant === "success" ? (
        <CheckCircle2Icon aria-hidden="true" />
      ) : (
        <AlertCircleIcon aria-hidden="true" />
      )}
      <AlertTitle>
        {variant === "success" ? "Progreso guardado" : "Revisa el wizard"}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function EvidenceFields({
  metric,
  value,
  errors,
  onChange,
}: {
  metric: MetricDefinition;
  value: MetricWizardInput;
  errors?: MetricWizardFieldErrors;
  onChange: (patch: MetricInputPatch) => void;
}) {
  return (
    <FieldGroup className="mt-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={errors?.advancedValue !== undefined}>
          <FieldLabel htmlFor={`metric-${metric.id}-advancedValue`}>
            Valor medido
          </FieldLabel>
          <Input
            id={`metric-${metric.id}-advancedValue`}
            data-testid={`metric-${metric.id}-advancedValue`}
            inputMode="decimal"
            value={value.advancedValue}
            aria-invalid={errors?.advancedValue !== undefined}
            aria-describedby={describedBy(metric.id, "advancedValue", errors)}
            placeholder="Ej. 25"
            onChange={(event) =>
              onChange({ advancedValue: event.target.value })
            }
          />
          <FieldDescription>{metric.advancedInput.unit}</FieldDescription>
          <FieldError id={inputErrorId(metric.id, "advancedValue")}>
            {errors?.advancedValue}
          </FieldError>
        </Field>

        <Field data-invalid={errors?.unit !== undefined}>
          <FieldLabel htmlFor={`metric-${metric.id}-unit`}>Unidad</FieldLabel>
          <Input
            id={`metric-${metric.id}-unit`}
            data-testid={`metric-${metric.id}-unit`}
            value={value.unit}
            aria-invalid={errors?.unit !== undefined}
            aria-describedby={describedBy(metric.id, "unit", errors)}
            placeholder={metric.advancedInput.unit}
            onChange={(event) => onChange({ unit: event.target.value })}
          />
          <FieldDescription>
            Declara la unidad para que el dato sea interpretable.
          </FieldDescription>
          <FieldError id={inputErrorId(metric.id, "unit")}>
            {errors?.unit}
          </FieldError>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={errors?.source !== undefined}>
          <FieldLabel htmlFor={`metric-${metric.id}-source`}>Fuente</FieldLabel>
          <Input
            id={`metric-${metric.id}-source`}
            data-testid={`metric-${metric.id}-source`}
            value={value.source}
            aria-invalid={errors?.source !== undefined}
            aria-describedby={describedBy(metric.id, "source", errors)}
            placeholder={metric.advancedInput.source}
            onChange={(event) => onChange({ source: event.target.value })}
          />
          <FieldDescription>
            Herramienta, revisión o conversación que sostiene el dato.
          </FieldDescription>
          <FieldError id={inputErrorId(metric.id, "source")}>
            {errors?.source}
          </FieldError>
        </Field>

        <Field data-invalid={errors?.timeWindow !== undefined}>
          <FieldLabel htmlFor={`metric-${metric.id}-timeWindow`}>
            Ventana temporal
          </FieldLabel>
          <Input
            id={`metric-${metric.id}-timeWindow`}
            data-testid={`metric-${metric.id}-timeWindow`}
            value={value.timeWindow}
            aria-invalid={errors?.timeWindow !== undefined}
            aria-describedby={describedBy(metric.id, "timeWindow", errors)}
            placeholder={metric.advancedInput.timeWindow}
            onChange={(event) => onChange({ timeWindow: event.target.value })}
          />
          <FieldDescription>
            Periodo observado para evitar lecturas puntuales.
          </FieldDescription>
          <FieldError id={inputErrorId(metric.id, "timeWindow")}>
            {errors?.timeWindow}
          </FieldError>
        </Field>
      </div>

      <Field data-invalid={errors?.evidenceNote !== undefined}>
        <FieldLabel htmlFor={`metric-${metric.id}-evidenceNote`}>
          Nota de evidencia
        </FieldLabel>
        <Textarea
          id={`metric-${metric.id}-evidenceNote`}
          data-testid={`metric-${metric.id}-evidenceNote`}
          value={value.evidenceNote}
          aria-invalid={errors?.evidenceNote !== undefined}
          aria-describedby={describedBy(metric.id, "evidenceNote", errors)}
          placeholder={metric.advancedInput.guidance}
          onChange={(event) => onChange({ evidenceNote: event.target.value })}
        />
        <FieldDescription>{metric.advancedInput.guidance}</FieldDescription>
        <FieldError id={inputErrorId(metric.id, "evidenceNote")}>
          {errors?.evidenceNote}
        </FieldError>
      </Field>
    </FieldGroup>
  );
}

function SimpleLevelPicker({
  metric,
  value,
  errors,
  onChange,
}: {
  metric: MetricDefinition;
  value: MetricWizardInput;
  errors?: MetricWizardFieldErrors;
  onChange: (patch: MetricInputPatch) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Interpretación MIURA</FieldLegend>
      <RadioGroup
        value={value.simpleLevel ?? ""}
        aria-invalid={errors?.simpleLevel !== undefined}
        aria-describedby={describedBy(metric.id, "simpleLevel", errors)}
        className="grid gap-3 md:grid-cols-3"
        onValueChange={(level) =>
          onChange({ simpleLevel: level as SimpleLevel })
        }
      >
        {SIMPLE_LEVELS.map((level) => {
          const rubric = metric.simpleRubric[level];
          const inputId = `metric-${metric.id}-level-${level}`;

          return (
            <label
              key={level}
              htmlFor={inputId}
              className={cn(
                "border-border bg-background hover:border-primary/40 flex min-h-28 cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                value.simpleLevel === level && "border-primary bg-primary/5",
              )}
            >
              <RadioGroupItem
                id={inputId}
                value={level}
                data-testid={inputId}
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  {rubric.label}
                </span>
                <span className="text-muted-foreground block text-sm leading-5">
                  {rubric.description}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <FieldError id={inputErrorId(metric.id, "simpleLevel")}>
        {errors?.simpleLevel}
      </FieldError>
    </FieldSet>
  );
}

function MetricCard({
  metric,
  value,
  errors,
  onChange,
}: {
  metric: MetricDefinition;
  value: MetricWizardInput;
  errors?: MetricWizardFieldErrors;
  onChange: (patch: MetricInputPatch) => void;
}) {
  const mode = value.entryMode;

  return (
    <Card data-testid={`metric-${metric.id}`}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{metric.id}</Badge>
              {metric.riskDirection === "higher_is_better" && (
                <Badge variant="secondary">Protectora</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{metric.name}</CardTitle>
            <CardDescription className="leading-6">
              {metric.description}
            </CardDescription>
          </div>
          <Field orientation="horizontal" className="w-fit">
            <Checkbox
              id={`metric-${metric.id}-unavailable`}
              data-testid={`metric-${metric.id}-unavailable`}
              checked={!value.available}
              onCheckedChange={(checked) =>
                onChange({ available: checked !== true })
              }
            />
            <FieldLabel
              htmlFor={`metric-${metric.id}-unavailable`}
              className="text-sm"
            >
              No disponible
            </FieldLabel>
          </Field>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="border-border bg-muted/35 rounded-lg border p-3 text-sm leading-6 text-muted-foreground">
          {metric.helpText}
        </div>

        {!value.available ? (
          <Alert className="border-info-border bg-info-bg text-info-foreground">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>Métrica excluida de cobertura</AlertTitle>
            <AlertDescription>
              Esta respuesta cuenta como completada, pero no se imputa ningún
              valor y reducirá la cobertura del pilar.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs
            value={mode}
            onValueChange={(nextMode) =>
              onChange({ entryMode: nextMode as MetricWizardEntryMode })
            }
          >
            <TabsList>
              <TabsTrigger
                value="simple"
                data-testid={`metric-${metric.id}-mode-simple`}
              >
                Simple
              </TabsTrigger>
              <TabsTrigger
                value="advanced"
                data-testid={`metric-${metric.id}-mode-advanced`}
              >
                Avanzado
              </TabsTrigger>
            </TabsList>
            <TabsContent value="simple" className="space-y-4 pt-3">
              <SimpleLevelPicker
                metric={metric}
                value={value}
                errors={errors}
                onChange={onChange}
              />
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4 pt-3">
              <SimpleLevelPicker
                metric={metric}
                value={value}
                errors={errors}
                onChange={onChange}
              />
              <EvidenceFields
                metric={metric}
                value={value}
                errors={errors}
                onChange={onChange}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function PillarStepper({
  activePillar,
  onSelectPillar,
  inputs,
}: {
  activePillar: Pillar;
  onSelectPillar: (index: number) => void;
  inputs: readonly MetricWizardInput[];
}) {
  const summary = summarizeMetricWizardInputs(inputs);

  return (
    <nav aria-label="Pilares MIURA" className="grid gap-3 md:grid-cols-3">
      {MIURA_PILLARS.map((pillar, index) => {
        const progress = summary.byPillar.find(
          (item) => item.pillar === pillar.id,
        );
        const active = activePillar === pillar.id;

        return (
          <button
            key={pillar.id}
            type="button"
            data-testid={`wizard-step-${pillar.id}`}
            aria-current={active ? "step" : undefined}
            className={cn(
              "border-border bg-background text-left rounded-lg border p-4 transition-colors hover:border-primary/40",
              active && "border-primary bg-primary/5",
            )}
            onClick={() => onSelectPillar(index)}
          >
            <span className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
              Paso {index + 1}
            </span>
            <span className="mt-1 block text-sm font-semibold">
              {pillar.label}
            </span>
            <span className="text-muted-foreground mt-2 block text-xs">
              {progress?.answered ?? 0}/4 respondidas · cobertura{" "}
              {formatPercent(progress?.coverage ?? 0)}
            </span>
            <Progress
              value={(progress?.completion ?? 0) * 100}
              aria-label={`Progreso de ${pillar.label}`}
              className="mt-3"
            />
          </button>
        );
      })}
    </nav>
  );
}

function WizardProgressPanel({
  inputs,
}: {
  inputs: readonly MetricWizardInput[];
}) {
  const summary = summarizeMetricWizardInputs(inputs);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progreso de métricas</CardTitle>
        <CardDescription>
          Las métricas no disponibles cuentan como respondidas, pero reducen la
          cobertura del pilar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              {summary.totalAnswered}/{TOTAL_METRICS} respondidas
            </span>
            <span className="text-muted-foreground">
              {formatPercent(summary.completion)}
            </span>
          </div>
          <Progress
            value={summary.completion * 100}
            aria-label="Progreso total del wizard"
            data-testid="wizard-total-progress"
          />
        </div>

        <div className="space-y-4">
          {MIURA_PILLARS.map((pillar) => {
            const progress = summary.byPillar.find(
              (item) => item.pillar === pillar.id,
            );

            return (
              <div key={pillar.id} data-testid={`coverage-${pillar.id}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {pillar.shortLabel}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Cobertura {formatPercent(progress?.coverage ?? 0)}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-5">
                  {progress?.incomplete ?? 4} incompletas ·{" "}
                  {progress?.unavailable ?? 0} no disponibles
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentPillarStep({
  pillar,
  inputs,
  metricErrors,
  onChangeMetric,
}: {
  pillar: (typeof MIURA_PILLARS)[number];
  inputs: readonly MetricWizardInput[];
  metricErrors: MetricWizardMetricErrors;
  onChangeMetric: (metricId: MetricId, patch: MetricInputPatch) => void;
}) {
  const inputsById = new Map(inputs.map((input) => [input.metricId, input]));
  const metrics = getMetricsByPillar(pillar.id);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Badge variant="outline">{pillar.indexId}</Badge>
        <h2 className="text-2xl font-semibold tracking-normal">
          {pillar.label}
        </h2>
        <p className="text-muted-foreground max-w-3xl leading-7">
          {pillar.description}
        </p>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => {
          const value = inputsById.get(metric.id);

          if (value === undefined) return null;

          return (
            <MetricCard
              key={metric.id}
              metric={metric}
              value={value}
              errors={metricErrors[metric.id]}
              onChange={(patch) => onChangeMetric(metric.id, patch)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MissingSessionAlert() {
  return (
    <Alert>
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>Borrador temporal no disponible</AlertTitle>
      <AlertDescription>
        Esta versión mantiene la evaluación creada en memoria de sesión. Si
        recargaste la página o abriste el enlace en otra pestaña, crea de nuevo
        el borrador hasta que TASK-015 añada persistencia local.
      </AlertDescription>
    </Alert>
  );
}

function MetricWizard({ evaluationId }: MetricWizardProps) {
  const [session, setSession] = useState<
    TemporaryEvaluationSession | undefined
  >(() => getTemporaryEvaluationSession(evaluationId));
  const [inputs, setInputs] = useState<MetricWizardInput[]>(() =>
    session === undefined ? [] : buildMetricWizardInputs(session.evaluation),
  );
  const [activePillarIndex, setActivePillarIndex] = useState(0);
  const [metricErrors, setMetricErrors] = useState<MetricWizardMetricErrors>(
    {},
  );
  const [message, setMessage] = useState<string>();
  const [messageVariant, setMessageVariant] = useState<"success" | "error">(
    "success",
  );
  const summary = useMemo(() => summarizeMetricWizardInputs(inputs), [inputs]);
  const currentPillar = MIURA_PILLARS[activePillarIndex] ?? MIURA_PILLARS[0];
  const readyForScorecard =
    session?.evaluation.status === "ready_for_scorecard";

  if (session === undefined || currentPillar === undefined) {
    return <MissingSessionAlert />;
  }

  const activeSession = session;

  function setWizardMessage(nextMessage: string, variant: "success" | "error") {
    setMessage(nextMessage);
    setMessageVariant(variant);
  }

  function updateMetricInput(metricId: MetricId, patch: MetricInputPatch) {
    setInputs((currentInputs) =>
      currentInputs.map((input) =>
        input.metricId === metricId ? { ...input, ...patch } : input,
      ),
    );
    setMetricErrors((currentErrors) => {
      if (currentErrors[metricId] === undefined) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[metricId];

      return nextErrors;
    });
    setMessage(undefined);
  }

  function saveProgress(requiredMetricIds: readonly MetricId[]) {
    const result = buildEvaluationFromMetricWizardInputs({
      evaluation: activeSession.evaluation,
      inputs,
      requiredMetricIds,
      now: new Date().toISOString(),
    });

    if (!result.success) {
      setMetricErrors(result.metricErrors);
      setWizardMessage(result.message, "error");
      return undefined;
    }

    const updatedSession = updateTemporaryEvaluationSession(
      result.data.evaluation,
    );

    if (updatedSession === undefined) {
      setWizardMessage(
        "No se ha podido actualizar el borrador temporal. Crea de nuevo la evaluación si la sesión se perdió.",
        "error",
      );
      return undefined;
    }

    setSession(updatedSession);
    setMetricErrors({});

    return updatedSession;
  }

  function handleSaveDraft() {
    const updatedSession = saveProgress([]);

    if (updatedSession === undefined) return;

    setWizardMessage(
      `Borrador guardado con ${updatedSession.evaluation.metricValues.length} métricas registradas en esta sesión.`,
      "success",
    );
  }

  function handleSaveAndContinue() {
    const updatedSession = saveProgress(
      requiredMetricIdsForPillar(currentPillar.id),
    );

    if (updatedSession === undefined) return;

    if (activePillarIndex < MIURA_PILLARS.length - 1) {
      setActivePillarIndex((currentIndex) => currentIndex + 1);
      setWizardMessage(
        `${currentPillar.label} guardado. Continúa con el siguiente pilar.`,
        "success",
      );
      return;
    }

    setWizardMessage(
      `${currentPillar.label} guardado. Revisa el progreso total antes de finalizar.`,
      "success",
    );
  }

  function handleFinishWizard() {
    const updatedSession = saveProgress(METRIC_IDS);

    if (updatedSession === undefined) return;

    setWizardMessage(
      "Wizard completado. La evaluación queda lista para generar la scorecard en la siguiente pantalla.",
      "success",
    );
  }

  return (
    <div className="space-y-6">
      <PillarStepper
        activePillar={currentPillar.id}
        inputs={inputs}
        onSelectPillar={setActivePillarIndex}
      />

      <WizardMessage message={message} variant={messageVariant} />

      {readyForScorecard && (
        <Alert className="border-info-border bg-info-bg text-info-foreground">
          <CheckCircle2Icon aria-hidden="true" />
          <AlertTitle>Evaluación lista para scorecard</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 leading-6 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Las 12 métricas están respondidas o marcadas como no disponibles.
              La scorecard final se implementa en TASK-013/TASK-014.
            </span>
            <Button asChild size="sm" className="w-fit">
              <Link href={`/evaluacion/${evaluationId}/scorecard`}>
                Ver scorecard
                <ArrowRightIcon />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <WizardProgressPanel inputs={inputs} />
          <Card>
            <CardHeader>
              <CardTitle>Siguiente acción</CardTitle>
              <CardDescription className="leading-6">
                {summary.totalIncomplete === 0
                  ? "Finaliza el wizard para dejar la evaluación lista para resultados."
                  : `Completa ${summary.totalIncomplete} métricas restantes o márcalas como no disponibles.`}
              </CardDescription>
            </CardHeader>
          </Card>
        </aside>

        <section className="space-y-6">
          <CurrentPillarStep
            pillar={currentPillar}
            inputs={inputs}
            metricErrors={metricErrors}
            onChangeMetric={updateMetricInput}
          />

          <div className="border-border bg-background flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm leading-6">
              El guardado actualiza solo el borrador temporal de esta sesión. La
              persistencia tras recarga queda para TASK-015.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={activePillarIndex === 0}
                onClick={() =>
                  setActivePillarIndex((currentIndex) =>
                    Math.max(0, currentIndex - 1),
                  )
                }
              >
                <ArrowLeftIcon />
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="wizard-save-draft"
                onClick={handleSaveDraft}
              >
                <SaveIcon />
                Guardar borrador
              </Button>
              <Button
                type="button"
                variant="outline"
                data-testid="wizard-save-continue"
                onClick={handleSaveAndContinue}
              >
                <ArrowRightIcon />
                {activePillarIndex < MIURA_PILLARS.length - 1
                  ? "Guardar y continuar"
                  : "Guardar pilar"}
              </Button>
              <Button
                type="button"
                data-testid="wizard-finish"
                onClick={handleFinishWizard}
              >
                <ClipboardCheckIcon />
                Terminar wizard
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export { MetricWizard };
