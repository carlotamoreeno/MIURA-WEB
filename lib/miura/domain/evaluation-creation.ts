import { z } from "zod";

import {
  CURRENT_LOCAL_SCHEMA_VERSION,
  miuraLocalExportSchema,
  type Evaluation,
  type MiuraLocalExport,
  type Project,
  type RecommendationLevel,
  type Workspace,
} from "@/lib/miura/schemas";

import { calculateMiuraEvaluation } from "./calculate";
import { sampleMiuraEvaluationId, sampleMiuraLocalExport } from "./fixtures";
import { buildMiuraRecommendationSet } from "./recommendations";

const MIURA_METHOD_OPTIONS = [
  "Scrum",
  "Kanban",
  "Scrum/Kanban",
  "Híbrida",
  "No definida",
] as const;

const DRAFT_EVALUATION_NAME = "Diagnóstico inicial MIURA";

const requiredTextField = (message: string, maxLength = 160) =>
  z.string().trim().min(1, message).max(maxLength);

const optionalTextField = (maxLength = 2000) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

const positiveNumberTextField = ({
  requiredMessage,
  numericMessage,
  positiveMessage,
}: {
  requiredMessage: string;
  numericMessage: string;
  positiveMessage: string;
}) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => Number.isFinite(Number(value)), {
      message: numericMessage,
    })
    .transform(Number)
    .refine((value) => value > 0, {
      message: positiveMessage,
    });

const positiveIntegerTextField = ({
  requiredMessage,
  numericMessage,
  integerMessage,
  positiveMessage,
}: {
  requiredMessage: string;
  numericMessage: string;
  integerMessage: string;
  positiveMessage: string;
}) =>
  positiveNumberTextField({
    requiredMessage,
    numericMessage,
    positiveMessage,
  }).refine((value) => Number.isInteger(value), {
    message: integerMessage,
  });

const optionalNonNegativeNumberTextField = ({
  numericMessage,
  nonNegativeMessage,
}: {
  numericMessage: string;
  nonNegativeMessage: string;
}) =>
  z
    .string()
    .trim()
    .refine((value) => value.length === 0 || Number.isFinite(Number(value)), {
      message: numericMessage,
    })
    .transform((value) => (value.length === 0 ? undefined : Number(value)))
    .refine((value) => value === undefined || value >= 0, {
      message: nonNegativeMessage,
    });

const draftEvaluationFormSchema = z.strictObject({
  workspaceName: requiredTextField(
    "El nombre de la organización demo es obligatorio.",
  ),
  projectName: requiredTextField("El nombre del proyecto es obligatorio."),
  projectDescription: optionalTextField(),
  methodology: requiredTextField("Selecciona la metodología predominante."),
  monthlyCapacityHours: positiveNumberTextField({
    requiredMessage: "La capacidad mensual es obligatoria.",
    numericMessage: "La capacidad mensual debe ser numérica.",
    positiveMessage: "La capacidad mensual debe ser mayor que 0.",
  }),
  hourlyCost: optionalNonNegativeNumberTextField({
    numericMessage: "El coste hora debe ser numérico.",
    nonNegativeMessage: "El coste hora no puede ser negativo.",
  }),
  horizonMonths: positiveIntegerTextField({
    requiredMessage: "El horizonte temporal es obligatorio.",
    numericMessage: "El horizonte temporal debe ser numérico.",
    integerMessage: "El horizonte temporal debe ser un número entero de meses.",
    positiveMessage: "El horizonte temporal debe ser mayor que 0.",
  }),
});

type DraftEvaluationFormInput = z.input<typeof draftEvaluationFormSchema>;
type DraftEvaluationFormValues = z.output<typeof draftEvaluationFormSchema>;
type DraftEvaluationFormField = keyof DraftEvaluationFormInput;

type DraftEvaluationFormValidationFailure = {
  success: false;
  message: string;
  fieldErrors: Partial<Record<DraftEvaluationFormField, string>>;
};

type DraftEvaluationFormValidationSuccess = {
  success: true;
  data: DraftEvaluationFormValues;
};

type DraftEvaluationFormValidationResult =
  | DraftEvaluationFormValidationSuccess
  | DraftEvaluationFormValidationFailure;

type DraftEvaluationCreationInput = {
  formInput: DraftEvaluationFormInput;
  idSeed: string;
  now?: string;
};

type DraftEvaluationCreationSuccess = {
  success: true;
  data: {
    localExport: MiuraLocalExport;
    workspace: Workspace;
    project: Project;
    evaluation: Evaluation;
  };
};

type DraftEvaluationCreationResult =
  | DraftEvaluationCreationSuccess
  | DraftEvaluationFormValidationFailure;

type PreloadedMiuraExampleSnapshot = {
  localExport: MiuraLocalExport;
  workspace: Workspace;
  project: Project;
  evaluation: Evaluation;
  scorecard: {
    CDI: number;
    DDI: number;
    PDI: number;
    DS: number;
    coverage: {
      codeArchitecture: number;
      documentationKnowledge: number;
      peopleProcess: number;
    };
    recommendationLevel: RecommendationLevel;
    dominantPillar: string;
  };
};

function zodErrorToFieldErrors(
  error: z.ZodError,
): DraftEvaluationFormValidationFailure {
  const fieldErrors: Partial<Record<DraftEvaluationFormField, string>> = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field !== "string") return;
    if (!(field in draftEvaluationFormSchema.shape)) return;

    const formField = field as DraftEvaluationFormField;

    fieldErrors[formField] ??= issue.message;
  });

  const firstMessage = Object.values(fieldErrors)[0];

  return {
    success: false,
    message:
      firstMessage ?? "Revisa los datos de la evaluación antes de continuar.",
    fieldErrors,
  };
}

function validateDraftEvaluationFormInput(
  formInput: DraftEvaluationFormInput,
): DraftEvaluationFormValidationResult {
  const parsed = draftEvaluationFormSchema.safeParse(formInput);

  if (!parsed.success) {
    return zodErrorToFieldErrors(parsed.error);
  }

  return {
    success: true,
    data: parsed.data,
  };
}

function normalizeIdSeed(idSeed: string) {
  const normalized = idSeed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  if (normalized.length === 0) {
    throw new Error("La semilla interna de evaluación no es válida.");
  }

  return normalized;
}

function buildInternalId(prefix: string, idSeed: string) {
  return `${prefix}-${normalizeIdSeed(idSeed)}`;
}

function createDraftMiuraEvaluation({
  formInput,
  idSeed,
  now = new Date().toISOString(),
}: DraftEvaluationCreationInput): DraftEvaluationCreationResult {
  const validation = validateDraftEvaluationFormInput(formInput);

  if (!validation.success) {
    return validation;
  }

  const values = validation.data;
  const workspace: Workspace = {
    id: buildInternalId("workspace", idSeed),
    name: values.workspaceName,
    createdAt: now,
    updatedAt: now,
  };
  const project: Project = {
    id: buildInternalId("project", idSeed),
    workspaceId: workspace.id,
    name: values.projectName,
    ...(values.projectDescription === undefined
      ? {}
      : { description: values.projectDescription }),
    methodology: values.methodology,
    monthlyCapacityHours: values.monthlyCapacityHours,
    ...(values.hourlyCost === undefined
      ? {}
      : { hourlyCost: values.hourlyCost }),
    currency: "EUR",
    createdAt: now,
    updatedAt: now,
  };
  const evaluation: Evaluation = {
    id: buildInternalId("evaluation", idSeed),
    projectId: project.id,
    name: DRAFT_EVALUATION_NAME,
    status: "draft",
    horizonMonths: values.horizonMonths,
    metricValues: [],
    createdAt: now,
    updatedAt: now,
  };
  const localExport = miuraLocalExportSchema.parse({
    schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
    exportedAt: now,
    workspaces: [workspace],
    projects: [project],
    evaluations: [evaluation],
  });

  return {
    success: true,
    data: {
      localExport,
      workspace,
      project,
      evaluation,
    },
  };
}

function buildPreloadedMiuraExampleSnapshot(): PreloadedMiuraExampleSnapshot {
  const workspace = sampleMiuraLocalExport.workspaces[0];
  const project = sampleMiuraLocalExport.projects[0];
  const evaluation = sampleMiuraLocalExport.evaluations[0];

  if (
    workspace === undefined ||
    project === undefined ||
    evaluation === undefined
  ) {
    throw new Error(
      "El ejemplo MIURA debe incluir organización, proyecto y evaluación.",
    );
  }

  const calculationResult = calculateMiuraEvaluation({
    project,
    evaluation,
  });
  const recommendationSet = buildMiuraRecommendationSet(calculationResult);
  const hydratedEvaluation: Evaluation = {
    ...evaluation,
    calculationResult,
    recommendationSet,
  };
  const localExport = miuraLocalExportSchema.parse({
    ...sampleMiuraLocalExport,
    evaluations: [hydratedEvaluation],
  });

  return {
    localExport,
    workspace,
    project,
    evaluation: hydratedEvaluation,
    scorecard: {
      CDI: calculationResult.CDI,
      DDI: calculationResult.DDI,
      PDI: calculationResult.PDI,
      DS: calculationResult.DS,
      coverage: {
        codeArchitecture: calculationResult.coverage.code_architecture,
        documentationKnowledge:
          calculationResult.coverage.documentation_knowledge,
        peopleProcess: calculationResult.coverage.people_process,
      },
      recommendationLevel: recommendationSet.level,
      dominantPillar: recommendationSet.dominantPillar,
    },
  };
}

export {
  DRAFT_EVALUATION_NAME,
  MIURA_METHOD_OPTIONS,
  buildPreloadedMiuraExampleSnapshot,
  createDraftMiuraEvaluation,
  draftEvaluationFormSchema,
  sampleMiuraEvaluationId,
  validateDraftEvaluationFormInput,
  type DraftEvaluationCreationResult,
  type DraftEvaluationCreationSuccess,
  type DraftEvaluationFormField,
  type DraftEvaluationFormInput,
  type DraftEvaluationFormValidationFailure,
  type DraftEvaluationFormValidationResult,
  type DraftEvaluationFormValidationSuccess,
  type DraftEvaluationFormValues,
  type PreloadedMiuraExampleSnapshot,
};
