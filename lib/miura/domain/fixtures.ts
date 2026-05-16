import {
  CURRENT_LOCAL_SCHEMA_VERSION,
  type MetricId,
  type MetricValue,
  type MiuraLocalExport,
  type SimpleLevel,
} from "@/lib/miura/schemas";

import { normalizeSimpleMetricValue } from "./metrics";

const sampleMiuraTimestamp = "2026-05-16T10:00:00.000Z";
const sampleMiuraWorkspaceId = "workspace-demo";
const sampleMiuraProjectId = "project-demo";
const sampleMiuraEvaluationId = "evaluation-demo";

const sampleMiuraReducedCaseExpectedResults = {
  CDI: 0.7,
  DDI: 0.6,
  PDI: 0.8,
  DS: 0.71,
  remediationEffortHours: 520,
} as const;

const sampleMiuraReducedCaseObservedMetricIds = [
  "C1",
  "C2",
  "C3",
  "D1",
  "D2",
  "D4",
  "P1",
  "P2",
  "P4",
] as const satisfies readonly MetricId[];

function createSampleMetricValue(
  metricId: MetricId,
  simpleLevel: SimpleLevel,
): MetricValue {
  return {
    id: `metric-value-demo-${metricId.toLowerCase()}`,
    evaluationId: sampleMiuraEvaluationId,
    metricId,
    simpleLevel,
    available: true,
    normalizedValue: normalizeSimpleMetricValue(metricId, simpleLevel),
  };
}

const sampleMiuraMetricValues = [
  {
    ...createSampleMetricValue("C1", "high"),
    advancedValue: sampleMiuraReducedCaseExpectedResults.remediationEffortHours,
    unit: "horas de remediación estimadas",
    source: "Caso ilustrativo reproducible TFG",
    timeWindow: "Diagnóstico actual",
  },
  createSampleMetricValue("C2", "high"),
  createSampleMetricValue("C3", "medium"),
  createSampleMetricValue("D1", "medium"),
  createSampleMetricValue("D2", "medium"),
  createSampleMetricValue("D4", "high"),
  createSampleMetricValue("P1", "high"),
  createSampleMetricValue("P2", "high"),
  createSampleMetricValue("P4", "low"),
] satisfies MetricValue[];

const sampleMiuraLocalExport = {
  schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
  exportedAt: sampleMiuraTimestamp,
  workspaces: [
    {
      id: sampleMiuraWorkspaceId,
      name: "Organización demo MIURA",
      createdAt: sampleMiuraTimestamp,
      updatedAt: sampleMiuraTimestamp,
    },
  ],
  projects: [
    {
      id: sampleMiuraProjectId,
      workspaceId: sampleMiuraWorkspaceId,
      name: "Producto interno de consultoría",
      description:
        "Caso sintético reproducible para explicar severidad, fricción y priorización MIURA sin usar datos reales de cliente.",
      methodology: "Scrum/Kanban",
      teamSize: 6,
      monthlyCapacityHours: 840,
      hourlyCost: 42,
      currency: "EUR",
      createdAt: sampleMiuraTimestamp,
      updatedAt: sampleMiuraTimestamp,
    },
  ],
  evaluations: [
    {
      id: sampleMiuraEvaluationId,
      projectId: sampleMiuraProjectId,
      name: "Caso ilustrativo reducido MIURA",
      status: "ready_for_scorecard",
      horizonMonths: 12,
      metricValues: sampleMiuraMetricValues,
      createdAt: sampleMiuraTimestamp,
      updatedAt: sampleMiuraTimestamp,
    },
  ],
} satisfies MiuraLocalExport;

export {
  sampleMiuraEvaluationId,
  sampleMiuraLocalExport,
  sampleMiuraMetricValues,
  sampleMiuraProjectId,
  sampleMiuraReducedCaseExpectedResults,
  sampleMiuraReducedCaseObservedMetricIds,
  sampleMiuraTimestamp,
  sampleMiuraWorkspaceId,
};
