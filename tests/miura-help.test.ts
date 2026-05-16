import { describe, expect, test } from "vitest";

import {
  DEFAULT_CALCULATION_ASSUMPTIONS,
  MINIMUM_ECONOMIC_COVERAGE,
  MIURA_DISCLAIMERS,
  MIURA_DS_WEIGHTS,
  MIURA_FORMULA_HELP,
  MIURA_FRICTION_SCENARIOS,
  MIURA_GLOSSARY_GROUPS,
  MIURA_METRIC_DEFINITIONS,
  REQUIRED_GLOSSARY_TERM_IDS,
  getMiuraFormulaHelp,
  metricGlossaryEntries,
} from "@/lib/miura/domain";

const glossaryEntries = MIURA_GLOSSARY_GROUPS.flatMap((group) => group.entries);

describe("MIURA help and glossary content", () => {
  test("covers required glossary terms for formulas, economics, evidence, and debt concepts", () => {
    const entryIds = new Set(glossaryEntries.map((entry) => entry.id));

    REQUIRED_GLOSSARY_TERM_IDS.forEach((termId) => {
      expect(entryIds.has(termId)).toBe(true);
    });

    expect(glossaryEntries.map((entry) => entry.term).join(" ")).toMatch(
      /CDI|DDI|PDI|DS|CF|PWC|break-even|deuda técnica|cobertura/i,
    );
  });

  test("keeps formula help synchronized with the accepted calculation constants", () => {
    const debtSeverity = getMiuraFormulaHelp("debt-severity");
    const friction = getMiuraFormulaHelp("friction-scenarios");
    const coverage = getMiuraFormulaHelp("coverage-gate");

    expect(debtSeverity.formula).toContain(
      `${MIURA_DS_WEIGHTS.CDI.toFixed(2)}*CDI`,
    );
    expect(debtSeverity.formula).toContain(
      `${MIURA_DS_WEIGHTS.DDI.toFixed(2)}*DDI`,
    );
    expect(debtSeverity.formula).toContain(
      `${MIURA_DS_WEIGHTS.PDI.toFixed(2)}*PDI`,
    );

    MIURA_FRICTION_SCENARIOS.forEach((scenario) => {
      expect(friction.formula).toContain(`λ=${scenario.lambda.toFixed(2)}`);
    });

    expect(coverage.formula).toContain(
      `>= ${MINIMUM_ECONOMIC_COVERAGE.toFixed(2)}`,
    );
    expect(MIURA_FORMULA_HELP).toHaveLength(5);
  });

  test("keeps metric glossary entries aligned with the accepted 12-metric catalog", () => {
    expect(metricGlossaryEntries).toHaveLength(MIURA_METRIC_DEFINITIONS.length);

    MIURA_METRIC_DEFINITIONS.forEach((metric) => {
      const entry = metricGlossaryEntries.find((item) =>
        item.term.startsWith(`${metric.id} ·`),
      );

      expect(entry?.businessExplanation).toBe(metric.helpText);
      expect(metric.methodologicalCaveat).toMatch(/preliminar/i);
      expect(metric.methodologicalCaveat).toMatch(/cobertura/i);
    });
  });

  test("uses the accepted preliminary and non-accounting disclaimers", () => {
    expect(MIURA_DISCLAIMERS.preliminary).toMatch(/preliminar/i);
    expect(MIURA_DISCLAIMERS.preliminary).toMatch(/no está validado/i);
    expect(MIURA_DISCLAIMERS.economic).toMatch(/no son contabilidad exacta/i);

    expect(DEFAULT_CALCULATION_ASSUMPTIONS.join(" ")).toMatch(
      /preliminar|no está validado industrialmente/i,
    );
    expect(DEFAULT_CALCULATION_ASSUMPTIONS.join(" ")).toMatch(
      /no contabilidad exacta/i,
    );
  });
});
