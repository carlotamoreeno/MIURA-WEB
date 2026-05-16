import { z } from "zod";

const CURRENT_LOCAL_SCHEMA_VERSION = 1 as const;

const PILLARS = [
  "code_architecture",
  "documentation_knowledge",
  "people_process",
] as const;

const METRIC_IDS = [
  "C1",
  "C2",
  "C3",
  "C4",
  "D1",
  "D2",
  "D3",
  "D4",
  "P1",
  "P2",
  "P3",
  "P4",
] as const;

const EVALUATION_STATUSES = [
  "draft",
  "in_progress",
  "ready_for_scorecard",
  "completed",
  "archived",
  "deleted",
] as const;

const SIMPLE_LEVELS = ["low", "medium", "high"] as const;
const SCENARIOS = ["conservative", "central", "tensioned"] as const;
const RECOMMENDATION_LEVELS = [
  "monitor",
  "mitigate",
  "intervene",
  "improve_evidence",
] as const;

const nonEmptyTextSchema = (message: string, maxLength = 240) =>
  z.string().trim().min(1, message).max(maxLength);

const idSchema = nonEmptyTextSchema("El identificador es obligatorio.", 120);
const optionalTextSchema = (maxLength = 1000) =>
  z.string().trim().min(1).max(maxLength).optional();
const nonNegativeNumberSchema = z.number().finite().nonnegative();
const positiveNumberSchema = z.number().finite().positive();
const positiveIntegerSchema = z.number().int().positive();
const unitIntervalSchema = z.number().finite().min(0).max(1);

const dateTimeStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Debe ser una fecha válida.",
  });

const currencySchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "La moneda debe usar un código ISO de 3 letras.")
  .default("EUR");

const pillarSchema = z.enum(PILLARS);
const metricIdSchema = z.enum(METRIC_IDS);
const evaluationStatusSchema = z.enum(EVALUATION_STATUSES);
const simpleLevelSchema = z.enum(SIMPLE_LEVELS);
const scenarioSchema = z.enum(SCENARIOS);
const recommendationLevelSchema = z.enum(RECOMMENDATION_LEVELS);

const coverageByPillarSchema = z.strictObject({
  code_architecture: unitIntervalSchema,
  documentation_knowledge: unitIntervalSchema,
  people_process: unitIntervalSchema,
});

const uncertaintyRangeSchema = z
  .strictObject({
    low: unitIntervalSchema,
    expected: unitIntervalSchema,
    high: unitIntervalSchema,
  })
  .refine(
    (range) => range.low <= range.expected && range.expected <= range.high,
    {
      message:
        "El rango de incertidumbre debe cumplir bajo <= esperado <= alto.",
    },
  );

const workspaceSchema = z.strictObject({
  id: idSchema,
  name: nonEmptyTextSchema("El nombre de la organización es obligatorio."),
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
});

const projectSchema = z.strictObject({
  id: idSchema,
  workspaceId: idSchema,
  name: nonEmptyTextSchema("El nombre del proyecto es obligatorio."),
  description: optionalTextSchema(2000),
  methodology: nonEmptyTextSchema(
    "La metodología predominante es obligatoria.",
  ),
  teamSize: positiveIntegerSchema.optional(),
  monthlyCapacityHours: positiveNumberSchema,
  hourlyCost: nonNegativeNumberSchema.optional(),
  currency: currencySchema,
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
});

const metricValueSchema = z
  .strictObject({
    id: idSchema,
    evaluationId: idSchema,
    metricId: metricIdSchema,
    simpleLevel: simpleLevelSchema.optional(),
    advancedValue: nonNegativeNumberSchema.optional(),
    unit: optionalTextSchema(48),
    source: optionalTextSchema(300),
    timeWindow: optionalTextSchema(120),
    evidenceNote: optionalTextSchema(2000),
    available: z.boolean(),
    normalizedValue: unitIntervalSchema.optional(),
  })
  .superRefine((metricValue, context) => {
    const hasSimpleInput = metricValue.simpleLevel !== undefined;
    const hasAdvancedValue = metricValue.advancedValue !== undefined;
    const hasAdvancedUnit = metricValue.unit !== undefined;

    if (hasAdvancedValue && !hasAdvancedUnit) {
      context.addIssue({
        code: "custom",
        path: ["unit"],
        message: "El valor avanzado necesita una unidad.",
      });
    }

    if (hasAdvancedUnit && !hasAdvancedValue) {
      context.addIssue({
        code: "custom",
        path: ["advancedValue"],
        message: "La unidad avanzada necesita un valor.",
      });
    }

    if (!metricValue.available) return;

    if (!hasSimpleInput && !(hasAdvancedValue && hasAdvancedUnit)) {
      context.addIssue({
        code: "custom",
        path: ["simpleLevel"],
        message:
          "Una métrica disponible necesita nivel simple o valor avanzado con unidad.",
      });
    }
  });

const pillarResultSchema = z.strictObject({
  pillar: pillarSchema,
  indexValue: unitIntervalSchema,
  coverage: unitIntervalSchema,
  dominantSignals: z.array(z.string().trim().min(1)).default([]),
  uncertaintyRange: uncertaintyRangeSchema.optional(),
});

const scenarioResultSchema = z.strictObject({
  scenario: scenarioSchema,
  lambda: unitIntervalSchema,
  CF: unitIntervalSchema,
  lostHoursMonthly: nonNegativeNumberSchema,
  lostHoursTotal: nonNegativeNumberSchema,
  PWC: nonNegativeNumberSchema.optional(),
  currency: currencySchema,
});

const breakEvenSchema = z.strictObject({
  months: positiveNumberSchema,
  assumptions: z.array(z.string().trim().min(1)).default([]),
});

const calculationResultSchema = z.strictObject({
  evaluationId: idSchema,
  CDI: unitIntervalSchema,
  DDI: unitIntervalSchema,
  PDI: unitIntervalSchema,
  DS: unitIntervalSchema,
  coverage: coverageByPillarSchema,
  pillarResults: z.array(pillarResultSchema).default([]),
  scenarios: z.array(scenarioResultSchema).default([]),
  principal: nonNegativeNumberSchema.optional(),
  breakEven: breakEvenSchema.optional(),
  warnings: z.array(z.string().trim().min(1)).default([]),
});

const scrumMappingSchema = z.strictObject({
  event: nonEmptyTextSchema("El evento o punto de trabajo es obligatorio."),
  action: nonEmptyTextSchema("La acción recomendada es obligatoria.", 1200),
});

const recommendationSetSchema = z.strictObject({
  evaluationId: idSchema,
  level: recommendationLevelSchema,
  summary: nonEmptyTextSchema(
    "El resumen de recomendación es obligatorio.",
    1200,
  ),
  actions: z.array(z.string().trim().min(1)).min(1),
  scrumMapping: z.array(scrumMappingSchema).default([]),
  dominantPillar: pillarSchema,
  disclaimers: z.array(z.string().trim().min(1)).min(1),
});

const evaluationSchema = z.strictObject({
  id: idSchema,
  projectId: idSchema,
  name: nonEmptyTextSchema("El nombre de la evaluación es obligatorio."),
  status: evaluationStatusSchema,
  horizonMonths: positiveIntegerSchema,
  metricValues: z.array(metricValueSchema).default([]),
  calculationResult: calculationResultSchema.optional(),
  recommendationSet: recommendationSetSchema.optional(),
  createdAt: dateTimeStringSchema,
  updatedAt: dateTimeStringSchema,
  completedAt: dateTimeStringSchema.optional(),
});

const miuraLocalExportSchema = z
  .strictObject({
    schemaVersion: z.literal(CURRENT_LOCAL_SCHEMA_VERSION),
    exportedAt: dateTimeStringSchema,
    workspaces: z.array(workspaceSchema),
    projects: z.array(projectSchema),
    evaluations: z.array(evaluationSchema),
  })
  .superRefine((localExport, context) => {
    const workspaceIds = new Set(
      localExport.workspaces.map((workspace) => workspace.id),
    );
    const projectIds = new Set(
      localExport.projects.map((project) => project.id),
    );

    localExport.projects.forEach((project, index) => {
      if (!workspaceIds.has(project.workspaceId)) {
        context.addIssue({
          code: "custom",
          path: ["projects", index, "workspaceId"],
          message: "El proyecto referencia una organización inexistente.",
        });
      }
    });

    localExport.evaluations.forEach((evaluation, evaluationIndex) => {
      if (!projectIds.has(evaluation.projectId)) {
        context.addIssue({
          code: "custom",
          path: ["evaluations", evaluationIndex, "projectId"],
          message: "La evaluación referencia un proyecto inexistente.",
        });
      }

      evaluation.metricValues.forEach((metricValue, metricIndex) => {
        if (metricValue.evaluationId !== evaluation.id) {
          context.addIssue({
            code: "custom",
            path: [
              "evaluations",
              evaluationIndex,
              "metricValues",
              metricIndex,
              "evaluationId",
            ],
            message: "La métrica referencia otra evaluación.",
          });
        }
      });

      if (
        evaluation.calculationResult !== undefined &&
        evaluation.calculationResult.evaluationId !== evaluation.id
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "evaluations",
            evaluationIndex,
            "calculationResult",
            "evaluationId",
          ],
          message: "El resultado de cálculo referencia otra evaluación.",
        });
      }

      if (
        evaluation.recommendationSet !== undefined &&
        evaluation.recommendationSet.evaluationId !== evaluation.id
      ) {
        context.addIssue({
          code: "custom",
          path: [
            "evaluations",
            evaluationIndex,
            "recommendationSet",
            "evaluationId",
          ],
          message: "Las recomendaciones referencian otra evaluación.",
        });
      }
    });
  });

type Pillar = z.infer<typeof pillarSchema>;
type MetricId = z.infer<typeof metricIdSchema>;
type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;
type SimpleLevel = z.infer<typeof simpleLevelSchema>;
type Scenario = z.infer<typeof scenarioSchema>;
type RecommendationLevel = z.infer<typeof recommendationLevelSchema>;
type Workspace = z.infer<typeof workspaceSchema>;
type Project = z.infer<typeof projectSchema>;
type MetricValue = z.infer<typeof metricValueSchema>;
type PillarResult = z.infer<typeof pillarResultSchema>;
type ScenarioResult = z.infer<typeof scenarioResultSchema>;
type CalculationResult = z.infer<typeof calculationResultSchema>;
type RecommendationSet = z.infer<typeof recommendationSetSchema>;
type Evaluation = z.infer<typeof evaluationSchema>;
type MiuraLocalExport = z.infer<typeof miuraLocalExportSchema>;

type LocalSchemaIssue = {
  path: string;
  message: string;
};

type LocalSchemaValidationSuccess<T> = {
  success: true;
  data: T;
};

type LocalSchemaValidationFailure = {
  success: false;
  message: string;
  issues: LocalSchemaIssue[];
};

type LocalSchemaValidationResult<T> =
  | LocalSchemaValidationSuccess<T>
  | LocalSchemaValidationFailure;

function issuePathToText(path: PropertyKey[]) {
  return path.length > 0 ? path.map(String).join(".") : "raíz";
}

function zodErrorToValidationFailure(
  error: z.ZodError,
): LocalSchemaValidationFailure {
  const issues = error.issues.map((issue) => ({
    path: issuePathToText(issue.path),
    message: issue.message,
  }));
  const firstIssue = issues[0];

  return {
    success: false,
    message: firstIssue
      ? `El JSON de MIURA no es válido: ${firstIssue.path}: ${firstIssue.message}`
      : "El JSON de MIURA no es válido.",
    issues,
  };
}

function validationFailure(
  message: string,
  path = "raíz",
): LocalSchemaValidationFailure {
  return {
    success: false,
    message,
    issues: [{ path, message }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSchemaVersion(
  value: unknown,
): LocalSchemaValidationResult<number> {
  if (!isRecord(value)) {
    return validationFailure("El JSON de MIURA debe ser un objeto.");
  }

  const schemaVersion = value.schemaVersion;

  if (typeof schemaVersion !== "number" || !Number.isInteger(schemaVersion)) {
    return validationFailure(
      "El JSON de MIURA necesita un schemaVersion numérico.",
      "schemaVersion",
    );
  }

  return {
    success: true,
    data: schemaVersion,
  };
}

const localExportMigrations: Record<number, (value: unknown) => unknown> = {
  [CURRENT_LOCAL_SCHEMA_VERSION]: (value) => value,
};

function validateMiuraLocalExport(
  value: unknown,
): LocalSchemaValidationResult<MiuraLocalExport> {
  const schemaVersionResult = readSchemaVersion(value);

  if (!schemaVersionResult.success) {
    return schemaVersionResult;
  }

  const migration = localExportMigrations[schemaVersionResult.data];

  if (migration === undefined) {
    return validationFailure(
      `La versión de datos ${schemaVersionResult.data} no está soportada por esta versión de MIURA.`,
      "schemaVersion",
    );
  }

  const parsed = miuraLocalExportSchema.safeParse(migration(value));

  if (!parsed.success) {
    return zodErrorToValidationFailure(parsed.error);
  }

  return {
    success: true,
    data: parsed.data,
  };
}

function parseMiuraLocalExportJson(
  jsonText: string,
): LocalSchemaValidationResult<MiuraLocalExport> {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonText);
  } catch {
    return validationFailure(
      "El contenido no es JSON válido. Revisa el archivo antes de importarlo.",
    );
  }

  return validateMiuraLocalExport(parsedJson);
}

function serializeMiuraLocalExport(
  value: unknown,
): LocalSchemaValidationResult<string> {
  const validationResult = validateMiuraLocalExport(value);

  if (!validationResult.success) {
    return validationResult;
  }

  return {
    success: true,
    data: JSON.stringify(validationResult.data, null, 2),
  };
}

export {
  CURRENT_LOCAL_SCHEMA_VERSION,
  EVALUATION_STATUSES,
  METRIC_IDS,
  PILLARS,
  RECOMMENDATION_LEVELS,
  SCENARIOS,
  SIMPLE_LEVELS,
  calculationResultSchema,
  coverageByPillarSchema,
  evaluationSchema,
  evaluationStatusSchema,
  metricIdSchema,
  metricValueSchema,
  miuraLocalExportSchema,
  parseMiuraLocalExportJson,
  pillarResultSchema,
  pillarSchema,
  projectSchema,
  recommendationLevelSchema,
  recommendationSetSchema,
  scenarioResultSchema,
  scenarioSchema,
  serializeMiuraLocalExport,
  simpleLevelSchema,
  validateMiuraLocalExport,
  workspaceSchema,
  type CalculationResult,
  type Evaluation,
  type EvaluationStatus,
  type LocalSchemaIssue,
  type LocalSchemaValidationFailure,
  type LocalSchemaValidationResult,
  type LocalSchemaValidationSuccess,
  type MetricId,
  type MetricValue,
  type MiuraLocalExport,
  type Pillar,
  type PillarResult,
  type Project,
  type RecommendationLevel,
  type RecommendationSet,
  type Scenario,
  type ScenarioResult,
  type SimpleLevel,
  type Workspace,
};
