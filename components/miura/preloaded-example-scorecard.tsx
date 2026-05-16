import { CheckCircle2Icon } from "lucide-react";

import { HelpTooltip } from "@/components/miura/help-tooltip";
import { SeverityIndicator } from "@/components/miura/severity-indicator";
import {
  buildPreloadedMiuraExampleSnapshot,
  getMiuraFormulaHelp,
  type MiuraFormulaHelp,
} from "@/lib/miura/domain";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const recommendationLabels = {
  monitor: "monitorizar",
  mitigate: "mitigar selectivamente",
  intervene: "intervenir",
  improve_evidence: "mejorar evidencia",
} as const;

function formatScore(value: number) {
  return value.toFixed(2);
}

function ScoreValueCard({
  label,
  value,
  help,
}: {
  label: string;
  value: number;
  help: MiuraFormulaHelp;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          <HelpTooltip
            title={help.title}
            description={help.summary}
            ariaLabel={`Ayuda sobre ${label}`}
            side="bottom"
          >
            <span className="text-background/80">{help.formula}</span>
            <span className="text-background/80">
              {help.businessExplanation}
            </span>
          </HelpTooltip>
        </div>
        <CardTitle className="text-2xl">{formatScore(value)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function PreloadedExampleScorecard() {
  const example = buildPreloadedMiuraExampleSnapshot();
  const { scorecard } = example;
  const pillarIndexesHelp = getMiuraFormulaHelp("pillar-indexes");
  const debtSeverityHelp = getMiuraFormulaHelp("debt-severity");

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <ScoreValueCard
          label="CDI"
          value={scorecard.CDI}
          help={pillarIndexesHelp}
        />
        <ScoreValueCard
          label="DDI"
          value={scorecard.DDI}
          help={pillarIndexesHelp}
        />
        <ScoreValueCard
          label="PDI"
          value={scorecard.PDI}
          help={pillarIndexesHelp}
        />
        <ScoreValueCard
          label="DS"
          value={scorecard.DS}
          help={debtSeverityHelp}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Scorecard del ejemplo precargado</CardTitle>
              <CardDescription>
                {example.project.name} · {example.evaluation.name}
              </CardDescription>
            </div>
            <Badge variant="secondary">Fixture reproducible</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <SeverityIndicator
            level="high"
            label="Severidad alta"
            description="DS 0.71 activa una recomendación de intervención con seguimiento explícito."
          />

          <dl className="grid gap-4 text-sm md:grid-cols-3">
            <div className="border-border rounded-lg border p-3">
              <dt className="text-muted-foreground">Código/arquitectura</dt>
              <dd className="mt-1 font-semibold">
                Cobertura {formatScore(scorecard.coverage.codeArchitecture)}
              </dd>
            </div>
            <div className="border-border rounded-lg border p-3">
              <dt className="text-muted-foreground">
                Documentación/conocimiento
              </dt>
              <dd className="mt-1 font-semibold">
                Cobertura{" "}
                {formatScore(scorecard.coverage.documentationKnowledge)}
              </dd>
            </div>
            <div className="border-border rounded-lg border p-3">
              <dt className="text-muted-foreground">Personas/proceso</dt>
              <dd className="mt-1 font-semibold">
                Cobertura {formatScore(scorecard.coverage.peopleProcess)}
              </dd>
            </div>
          </dl>

          <div className="border-border bg-muted/35 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon
                aria-hidden="true"
                className="text-primary mt-0.5 size-4 shrink-0"
              />
              <div className="space-y-1">
                <p className="font-medium">
                  Nivel recomendado:{" "}
                  {recommendationLabels[scorecard.recommendationLevel]}
                </p>
                <p className="text-muted-foreground text-sm leading-6">
                  El ejemplo usa el catálogo aceptado y calcula CDI, DDI, PDI,
                  DS, cobertura y recomendaciones con el motor puro actual.
                  MIURA sigue siendo una lectura preliminar, no una validación
                  industrial.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { PreloadedExampleScorecard };
