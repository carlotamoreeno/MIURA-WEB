"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  ClipboardCheckIcon,
  PlayCircleIcon,
} from "lucide-react";

import {
  MIURA_METHOD_OPTIONS,
  buildPreloadedMiuraExampleSnapshot,
  createDraftMiuraEvaluation,
  type DraftEvaluationFormField,
  type DraftEvaluationFormInput,
} from "@/lib/miura/domain";
import { useMiuraAnalytics } from "@/lib/miura/analytics/client";
import { setTemporaryEvaluationSession } from "@/lib/miura/session/evaluation-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const initialFormState = {
  workspaceName: "Organización demo MIURA",
  projectName: "",
  projectDescription: "",
  methodology: "Scrum/Kanban",
  monthlyCapacityHours: "840",
  hourlyCost: "",
  horizonMonths: "12",
} satisfies DraftEvaluationFormInput;

function createBrowserIdSeed() {
  if (globalThis.crypto?.randomUUID !== undefined) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function FieldValidationError({
  message,
  id,
}: {
  message?: string;
  id: string;
}) {
  if (message === undefined) {
    return null;
  }

  return <FieldError id={id}>{message}</FieldError>;
}

function NewEvaluationForm() {
  const router = useRouter();
  const { trackMiuraAnalyticsEvent } = useMiuraAnalytics();
  const [formState, setFormState] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<DraftEvaluationFormField, string>>
  >({});
  const [formMessage, setFormMessage] = useState<string>();

  function updateField(field: DraftEvaluationFormField, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFieldErrors((currentErrors) => {
      if (currentErrors[field] === undefined) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];

      return nextErrors;
    });
  }

  function errorId(field: DraftEvaluationFormField) {
    return `${field}-error`;
  }

  function describedBy(field: DraftEvaluationFormField) {
    return fieldErrors[field] === undefined ? undefined : errorId(field);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(undefined);

    const result = createDraftMiuraEvaluation({
      formInput: formState,
      idSeed: createBrowserIdSeed(),
      now: new Date().toISOString(),
    });

    if (!result.success) {
      setFieldErrors(result.fieldErrors);
      setFormMessage(result.message);
      return;
    }

    setTemporaryEvaluationSession(result.data.localExport, "draft");
    trackMiuraAnalyticsEvent("evaluation_created", {
      methodology: result.data.project.methodology,
      hasCapacity: result.data.project.monthlyCapacityHours > 0,
      hasHourlyCost:
        result.data.project.hourlyCost !== undefined &&
        result.data.project.hourlyCost > 0,
    });
    router.push(`/evaluacion/${result.data.evaluation.id}/wizard`);
  }

  function handleLoadExample() {
    const example = buildPreloadedMiuraExampleSnapshot();

    setTemporaryEvaluationSession(example.localExport, "example");
    trackMiuraAnalyticsEvent("evaluation_created", {
      methodology: example.project.methodology,
      hasCapacity: example.project.monthlyCapacityHours > 0,
      hasHourlyCost:
        example.project.hourlyCost !== undefined &&
        example.project.hourlyCost > 0,
    });
    router.push(`/evaluacion/${example.evaluation.id}/scorecard`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Nueva evaluación local</CardTitle>
          <CardDescription>
            Crea un borrador de proyecto en este navegador para pasar al wizard
            de métricas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" noValidate onSubmit={handleSubmit}>
            {formMessage !== undefined && (
              <Alert variant="destructive">
                <AlertCircleIcon aria-hidden="true" />
                <AlertTitle>Datos incompletos</AlertTitle>
                <AlertDescription>{formMessage}</AlertDescription>
              </Alert>
            )}

            <FieldGroup>
              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={fieldErrors.workspaceName !== undefined}>
                  <FieldLabel htmlFor="workspaceName">
                    Organización demo
                  </FieldLabel>
                  <Input
                    id="workspaceName"
                    name="workspaceName"
                    value={formState.workspaceName}
                    aria-invalid={fieldErrors.workspaceName !== undefined}
                    aria-describedby={describedBy("workspaceName")}
                    onChange={(event) =>
                      updateField("workspaceName", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Nombre de la organización local usada en la demo.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("workspaceName")}
                    message={fieldErrors.workspaceName}
                  />
                </Field>

                <Field data-invalid={fieldErrors.projectName !== undefined}>
                  <FieldLabel htmlFor="projectName">Proyecto</FieldLabel>
                  <Input
                    id="projectName"
                    name="projectName"
                    value={formState.projectName}
                    aria-invalid={fieldErrors.projectName !== undefined}
                    aria-describedby={describedBy("projectName")}
                    placeholder="Portal interno, app móvil, plataforma B2B..."
                    onChange={(event) =>
                      updateField("projectName", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Usa un nombre reconocible, sin datos personales.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("projectName")}
                    message={fieldErrors.projectName}
                  />
                </Field>
              </div>

              <Field
                data-invalid={fieldErrors.projectDescription !== undefined}
              >
                <FieldLabel htmlFor="projectDescription">
                  Contexto del proyecto
                </FieldLabel>
                <Textarea
                  id="projectDescription"
                  name="projectDescription"
                  value={formState.projectDescription}
                  aria-invalid={fieldErrors.projectDescription !== undefined}
                  aria-describedby={describedBy("projectDescription")}
                  placeholder="Resumen breve del producto, equipo o flujo evaluado."
                  onChange={(event) =>
                    updateField("projectDescription", event.target.value)
                  }
                />
                <FieldDescription>
                  Opcional. No incluyas información sensible de cliente.
                </FieldDescription>
                <FieldValidationError
                  id={errorId("projectDescription")}
                  message={fieldErrors.projectDescription}
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field data-invalid={fieldErrors.methodology !== undefined}>
                  <FieldLabel htmlFor="methodology">
                    Metodología predominante
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    id="methodology"
                    name="methodology"
                    value={formState.methodology}
                    aria-invalid={fieldErrors.methodology !== undefined}
                    aria-describedby={describedBy("methodology")}
                    onChange={(event) =>
                      updateField("methodology", event.target.value)
                    }
                  >
                    {MIURA_METHOD_OPTIONS.map((methodology) => (
                      <NativeSelectOption key={methodology} value={methodology}>
                        {methodology}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>
                    MIURA complementa el marco de trabajo, no lo sustituye.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("methodology")}
                    message={fieldErrors.methodology}
                  />
                </Field>

                <Field data-invalid={fieldErrors.horizonMonths !== undefined}>
                  <FieldLabel htmlFor="horizonMonths">
                    Horizonte temporal
                  </FieldLabel>
                  <Input
                    id="horizonMonths"
                    name="horizonMonths"
                    inputMode="numeric"
                    value={formState.horizonMonths}
                    aria-invalid={fieldErrors.horizonMonths !== undefined}
                    aria-describedby={describedBy("horizonMonths")}
                    onChange={(event) =>
                      updateField("horizonMonths", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Meses para los escenarios de fricción.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("horizonMonths")}
                    message={fieldErrors.horizonMonths}
                  />
                </Field>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  data-invalid={fieldErrors.monthlyCapacityHours !== undefined}
                >
                  <FieldLabel htmlFor="monthlyCapacityHours">
                    Capacidad mensual
                  </FieldLabel>
                  <Input
                    id="monthlyCapacityHours"
                    name="monthlyCapacityHours"
                    inputMode="decimal"
                    value={formState.monthlyCapacityHours}
                    aria-invalid={
                      fieldErrors.monthlyCapacityHours !== undefined
                    }
                    aria-describedby={describedBy("monthlyCapacityHours")}
                    onChange={(event) =>
                      updateField("monthlyCapacityHours", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Horas disponibles aproximadas del equipo por mes.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("monthlyCapacityHours")}
                    message={fieldErrors.monthlyCapacityHours}
                  />
                </Field>

                <Field data-invalid={fieldErrors.hourlyCost !== undefined}>
                  <FieldLabel htmlFor="hourlyCost">
                    Coste hora opcional
                  </FieldLabel>
                  <Input
                    id="hourlyCost"
                    name="hourlyCost"
                    inputMode="decimal"
                    value={formState.hourlyCost}
                    aria-invalid={fieldErrors.hourlyCost !== undefined}
                    aria-describedby={describedBy("hourlyCost")}
                    placeholder="Ej. 42"
                    onChange={(event) =>
                      updateField("hourlyCost", event.target.value)
                    }
                  />
                  <FieldDescription>
                    Si se deja vacío, la lectura económica queda en horas.
                  </FieldDescription>
                  <FieldValidationError
                    id={errorId("hourlyCost")}
                    message={fieldErrors.hourlyCost}
                  />
                </Field>
              </div>
            </FieldGroup>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" className="sm:w-fit">
                <ClipboardCheckIcon />
                Crear evaluación
                <ArrowRightIcon />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="sm:w-fit"
                onClick={handleLoadExample}
              >
                <PlayCircleIcon />
                Cargar ejemplo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Borrador local</CardTitle>
            <CardDescription>
              La evaluación se mantiene en memoria durante esta sesión hasta que
              se implemente la persistencia local definitiva.
            </CardDescription>
          </CardHeader>
        </Card>
        <Alert className="border-info-border bg-info-bg text-info-foreground">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>Sin cuenta ni servidor</AlertTitle>
          <AlertDescription>
            No se solicita email, contraseña ni login. La persistencia tras
            recargar la página pertenece a la siguiente tarea de datos locales.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export { NewEvaluationForm };
