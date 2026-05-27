import { z } from "zod";

import { METRIC_IDS, PILLARS, coverageStatusSchema } from "@/lib/miura/schemas";

const MIURA_ANALYTICS_SESSION_ID_PREFIX = "miura-session-";

const questionLengthBuckets = [
  "1-80",
  "81-240",
  "241-1000",
  "1001-4000",
  "4000+",
] as const;

const latencyBuckets = ["0-2s", "2-6s", "6-15s", "15s+"] as const;

const dsBands = ["monitor", "mitigate", "intervene"] as const;

const reportExportFormats = ["markdown", "clipboard", "print"] as const;

const helpSurfaces = [
  "wizard",
  "glossary",
  "scorecard",
  "report",
  "methodology",
  "scrum_kanban",
] as const;

const noSourcesCategories = [
  "unknown",
  "out_of_domain_or_guardrail",
  "corpus_gap",
] as const;

const errorSurfaces = [
  "app",
  "evaluation",
  "wizard",
  "scorecard",
  "report",
  "chat",
  "local_settings",
  "analytics",
  "api",
] as const;

const sessionIdSchema = z
  .string()
  .trim()
  .regex(
    /^miura-session-[A-Za-z0-9_-]{8,80}$/,
    "El sessionId analítico debe ser anónimo y generado por MIURA.",
  );

const timestampSchema = z.string().refine(
  (value) => {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed);
  },
  {
    message: "El timestamp analítico debe ser una fecha parseable.",
  },
);

const appVersionSchema = z.string().trim().min(1).max(40);
const nonSensitiveMessageSchema = z.string().trim().min(1).max(240);
const durationMsSchema = z
  .number()
  .int()
  .min(0)
  .max(24 * 60 * 60 * 1000);
const horizonMonthsSchema = z.number().int().positive().max(120);
const countSchema = z.number().int().min(0).max(1000);
const unitIntervalSchema = z.number().finite().min(0).max(1);

function baseEventSchema<
  TName extends string,
  TProperties extends z.ZodTypeAny,
>(eventName: TName, properties: TProperties) {
  return z.strictObject({
    eventName: z.literal(eventName),
    sessionId: sessionIdSchema,
    timestamp: timestampSchema,
    properties,
  });
}

const miuraAnalyticsEventSchema = z.discriminatedUnion("eventName", [
  baseEventSchema(
    "app_opened",
    z.strictObject({
      appVersion: appVersionSchema,
    }),
  ),
  baseEventSchema(
    "evaluation_created",
    z.strictObject({
      methodology: z.string().trim().min(1).max(80),
      hasCapacity: z.boolean(),
      hasHourlyCost: z.boolean(),
    }),
  ),
  baseEventSchema(
    "wizard_step_completed",
    z.strictObject({
      pillar: z.enum(PILLARS),
      coverage: unitIntervalSchema,
      durationMs: durationMsSchema,
    }),
  ),
  baseEventSchema(
    "metric_help_opened",
    z.strictObject({
      metricId: z.enum(METRIC_IDS),
      surface: z.enum(helpSurfaces),
    }),
  ),
  baseEventSchema(
    "scorecard_viewed",
    z.strictObject({
      DSBand: z.enum(dsBands),
      dominantPillar: z.enum(PILLARS),
      coverageStatus: coverageStatusSchema,
    }),
  ),
  baseEventSchema(
    "scenario_panel_viewed",
    z.strictObject({
      hasHourlyCost: z.boolean(),
      horizonMonths: horizonMonthsSchema,
    }),
  ),
  baseEventSchema(
    "report_exported",
    z.strictObject({
      format: z.enum(reportExportFormats),
      coverageStatus: coverageStatusSchema,
    }),
  ),
  baseEventSchema(
    "chat_question_sent",
    z.strictObject({
      usesEvaluationContext: z.boolean(),
      questionLengthBucket: z.enum(questionLengthBuckets),
    }),
  ),
  baseEventSchema(
    "chat_answer_completed",
    z.strictObject({
      citationsCount: countSchema,
      latencyBucket: z.enum(latencyBuckets),
      retrievalCount: countSchema,
    }),
  ),
  baseEventSchema(
    "chat_no_sources",
    z.strictObject({
      queryCategoryIfKnown: z.enum(noSourcesCategories),
    }),
  ),
  baseEventSchema(
    "local_data_reset",
    z.strictObject({
      hadEvaluations: z.boolean(),
    }),
  ),
  baseEventSchema(
    "error_occurred",
    z.strictObject({
      surface: z.enum(errorSurfaces),
      errorType: z.string().trim().min(1).max(80),
      nonSensitiveMessage: nonSensitiveMessageSchema,
    }),
  ),
]);

type MiuraAnalyticsEvent = z.infer<typeof miuraAnalyticsEventSchema>;
type MiuraAnalyticsEventName = MiuraAnalyticsEvent["eventName"];
type MiuraAnalyticsEventProperties<TName extends MiuraAnalyticsEventName> =
  Extract<MiuraAnalyticsEvent, { eventName: TName }>["properties"];
type MiuraQuestionLengthBucket = (typeof questionLengthBuckets)[number];
type MiuraLatencyBucket = (typeof latencyBuckets)[number];
type MiuraDsBand = (typeof dsBands)[number];

function parseMiuraAnalyticsEvent(value: unknown) {
  return miuraAnalyticsEventSchema.safeParse(value);
}

function bucketQuestionLength(length: number): MiuraQuestionLengthBucket {
  if (length <= 80) return "1-80";
  if (length <= 240) return "81-240";
  if (length <= 1000) return "241-1000";
  if (length <= 4000) return "1001-4000";

  return "4000+";
}

function bucketLatency(durationMs: number): MiuraLatencyBucket {
  if (durationMs <= 2000) return "0-2s";
  if (durationMs <= 6000) return "2-6s";
  if (durationMs <= 15000) return "6-15s";

  return "15s+";
}

function getDebtSeverityBand(score: number): MiuraDsBand {
  if (score < 0.33) return "monitor";
  if (score < 0.66) return "mitigate";

  return "intervene";
}

export {
  MIURA_ANALYTICS_SESSION_ID_PREFIX,
  bucketLatency,
  bucketQuestionLength,
  getDebtSeverityBand,
  miuraAnalyticsEventSchema,
  parseMiuraAnalyticsEvent,
  type MiuraAnalyticsEvent,
  type MiuraAnalyticsEventName,
  type MiuraAnalyticsEventProperties,
};
