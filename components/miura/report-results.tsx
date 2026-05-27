"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  DatabaseIcon,
  DownloadIcon,
  FileTextIcon,
  PrinterIcon,
  ShieldAlertIcon,
} from "lucide-react";

import {
  buildMiuraReportData,
  formatCoefficient,
  formatCurrency,
  formatDateTime,
  formatHours,
  formatPercent,
  formatScore,
  recommendationLabels,
  renderMiuraReportMarkdown,
  reportFileDate,
  type MiuraReportData,
  type MiuraReportMetricRow,
} from "@/lib/miura/domain";
import { useMiuraAnalytics } from "@/lib/miura/analytics/client";
import {
  resolveMiuraEvaluationResult,
  type MiuraEvaluationResultData,
  type MiuraEvaluationResultState,
} from "@/lib/miura/session/evaluation-results";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ReportResultsProps = {
  appVersion: string;
  evaluationId: string;
};

type ReportReadyState = {
  status: "ready";
  data: MiuraEvaluationResultData;
  markdown: string;
  report: MiuraReportData;
};

type ReportState =
  | {
      status: "loading";
    }
  | ReportReadyState
  | Exclude<MiuraEvaluationResultState, { status: "ready" }>;

type ReportMessage = {
  variant: "success" | "error";
  text: string;
};

function downloadMarkdownFile({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  const blob = new Blob([content], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function reportFilename(report: MiuraReportData) {
  return `miura-informe-${report.evaluation.id}-${reportFileDate(report.generatedAt)}.md`;
}

function ResultTile({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="border-border bg-background rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-6">
        {description}
      </p>
    </div>
  );
}

function ReportActions({
  markdown,
  report,
  onMessage,
}: {
  markdown: string;
  report: MiuraReportData;
  onMessage: (message: ReportMessage) => void;
}) {
  const { trackMiuraAnalyticsEvent } = useMiuraAnalytics();

  function trackReportExport(format: "markdown" | "clipboard" | "print") {
    trackMiuraAnalyticsEvent("report_exported", {
      format,
      coverageStatus: report.calculationResult.coverageStatus,
    });
  }

  function trackReportError(errorType: string, nonSensitiveMessage: string) {
    trackMiuraAnalyticsEvent("error_occurred", {
      surface: "report",
      errorType,
      nonSensitiveMessage,
    });
  }

  function handleDownload() {
    try {
      downloadMarkdownFile({
        filename: reportFilename(report),
        content: markdown,
      });
      trackReportExport("markdown");
      onMessage({
        variant: "success",
        text: "Informe Markdown generado con los bloques visibles del diagnóstico MIURA.",
      });
    } catch {
      trackReportError(
        "download_failed",
        "No se ha podido descargar el informe Markdown.",
      );
      onMessage({
        variant: "error",
        text: "No se ha podido descargar el Markdown. Usa copiar Markdown como alternativa.",
      });
    }
  }

  async function handleCopy() {
    if (navigator.clipboard === undefined) {
      trackReportError(
        "clipboard_unavailable",
        "El navegador no permite copiar automáticamente.",
      );
      onMessage({
        variant: "error",
        text: "El navegador no permite copiar automáticamente. Puedes usar la descarga Markdown o imprimir.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      trackReportExport("clipboard");
      onMessage({
        variant: "success",
        text: "Contenido Markdown copiado al portapapeles.",
      });
    } catch {
      trackReportError(
        "clipboard_failed",
        "No se ha podido copiar el informe Markdown.",
      );
      onMessage({
        variant: "error",
        text: "No se ha podido copiar el Markdown. Reintenta la descarga o usa la vista imprimible.",
      });
    }
  }

  function handlePrint() {
    trackReportExport("print");
    window.print();
  }

  return (
    <div
      data-testid="report-actions"
      className="miura-print-hidden flex flex-col gap-2 sm:flex-row sm:flex-wrap"
    >
      <Button
        type="button"
        data-testid="report-download-markdown"
        onClick={handleDownload}
      >
        <DownloadIcon />
        Descargar Markdown
      </Button>
      <Button
        type="button"
        variant="outline"
        data-testid="report-print"
        onClick={handlePrint}
      >
        <PrinterIcon />
        Imprimir / guardar PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        data-testid="report-copy-markdown"
        onClick={() => {
          void handleCopy();
        }}
      >
        <CopyIcon />
        Copiar Markdown
      </Button>
    </div>
  );
}

function ReportMetadata({ report }: { report: MiuraReportData }) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Generado</p>
        <p className="mt-1 font-medium">{formatDateTime(report.generatedAt)}</p>
      </div>
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Versión app</p>
        <p className="mt-1 font-medium">{report.appVersion}</p>
      </div>
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Horizonte</p>
        <p className="mt-1 font-medium">
          {report.evaluation.horizonMonths} meses
        </p>
      </div>
      <div className="border-border bg-muted/35 rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">Metodología</p>
        <p className="mt-1 font-medium">{report.project.methodology}</p>
      </div>
    </div>
  );
}

function ExecutiveSummary({ report }: { report: MiuraReportData }) {
  const { calculationResult, recommendationSet } = report;

  return (
    <section className="space-y-4" aria-labelledby="report-summary-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="report-summary-title" className="text-2xl font-semibold">
            Resumen ejecutivo
          </h2>
          <p className="text-muted-foreground leading-6">
            {report.workspace.name} · {report.project.name} ·{" "}
            {report.evaluation.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              calculationResult.coverageStatus === "partial"
                ? "destructive"
                : "secondary"
            }
          >
            {report.diagnosisLabel}
          </Badge>
          <Badge variant="outline">
            Pilar dominante:{" "}
            {
              report.coverageRows.find(
                (row) => row.pillar === recommendationSet.dominantPillar,
              )?.pillarLabel
            }
          </Badge>
        </div>
      </div>

      {calculationResult.coverageStatus === "partial" && (
        <Alert className="border-info-border bg-info-bg text-info-foreground">
          <AlertCircleIcon aria-hidden="true" />
          <AlertTitle>Diagnóstico parcial</AlertTitle>
          <AlertDescription className="leading-6">
            La recomendación principal es mejorar evidencia antes de defender
            monetización fuerte. El informe conserva índices, escenarios de
            capacidad y trazabilidad de métricas.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <ResultTile
          label="CDI"
          value={formatScore(calculationResult.CDI)}
          description="Código/arquitectura."
        />
        <ResultTile
          label="DDI"
          value={formatScore(calculationResult.DDI)}
          description="Documentación/conocimiento."
        />
        <ResultTile
          label="PDI"
          value={formatScore(calculationResult.PDI)}
          description="Personas/proceso."
        />
        <ResultTile
          label="DS"
          value={formatScore(calculationResult.DS)}
          description="Severidad global MIURA."
        />
      </div>

      <div className="border-border bg-muted/35 rounded-lg border p-4">
        <p className="font-medium">
          Recomendación: {recommendationLabels[recommendationSet.level]}
        </p>
        <p className="text-muted-foreground mt-2 leading-6">
          {recommendationSet.summary}
        </p>
      </div>
    </section>
  );
}

function CoverageSection({ report }: { report: MiuraReportData }) {
  return (
    <section className="space-y-4" aria-labelledby="report-coverage-title">
      <h2 id="report-coverage-title" className="text-2xl font-semibold">
        Cobertura por pilar
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {report.coverageRows.map((row) => (
          <div
            key={row.pillar}
            className="border-border bg-background rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.pillarLabel}</p>
                <p className="text-muted-foreground text-sm">
                  {row.indexId} · {formatScore(row.coverage)}
                </p>
              </div>
              <Badge
                variant={
                  row.statusLabel === "Parcial" ? "destructive" : "secondary"
                }
              >
                {row.statusLabel}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-3 text-sm">
              {formatPercent(row.coverage)} de métricas observables disponibles.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScenariosSection({ report }: { report: MiuraReportData }) {
  const { calculationResult } = report;

  return (
    <section className="space-y-4" aria-labelledby="report-scenarios-title">
      <div className="space-y-1">
        <h2 id="report-scenarios-title" className="text-2xl font-semibold">
          Escenarios de fricción, capacidad y coste
        </h2>
        <p className="text-muted-foreground leading-6">
          La capacidad perdida aparece antes que euros. PWC, principal y
          break-even solo aparecen cuando el motor los devuelve con datos
          válidos.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {report.scenarioRows.map((row) => (
          <div
            key={row.scenario}
            data-testid={`report-scenario-${row.scenario}`}
            className="border-border bg-background rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{row.scenarioLabel}</p>
                <p className="text-muted-foreground text-sm">
                  λ {formatScore(row.lambda)} · CF {formatCoefficient(row.CF)}
                </p>
              </div>
              <Badge
                variant={row.scenario === "central" ? "default" : "outline"}
              >
                Escenario
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-muted-foreground text-xs">
                  Capacidad perdida mensual
                </p>
                <p className="text-xl font-semibold">
                  {formatHours(row.lostHoursMonthly)} h/mes
                </p>
              </div>
              <div className="border-border bg-muted/35 rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">
                  Capacidad perdida total
                </p>
                <p className="mt-1 font-medium">
                  {formatHours(row.lostHoursTotal)} h
                </p>
              </div>
              {row.projectedWasteCost !== undefined && (
                <div className="border-border border-t pt-3">
                  <p className="text-muted-foreground text-xs">
                    Coste proyectado de fricción (PWC)
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatCurrency(row.projectedWasteCost, row.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(calculationResult.principal !== undefined ||
        calculationResult.breakEven !== undefined) && (
        <div
          data-testid="report-economics"
          className="border-border bg-muted/35 rounded-lg border p-4"
        >
          <p className="font-medium">Principal y break-even heurístico</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {calculationResult.principal !== undefined && (
              <div>
                <p className="text-muted-foreground text-xs">
                  Principal de remediación
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatCurrency(
                    calculationResult.principal,
                    report.project.currency,
                  )}
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
        </div>
      )}
    </section>
  );
}

function metricStatusVariant(row: MiuraReportMetricRow) {
  if (row.status === "observed") return "secondary";
  if (row.status === "unavailable") return "outline";
  return "destructive";
}

function MetricsSection({ report }: { report: MiuraReportData }) {
  return (
    <section className="space-y-4" aria-labelledby="report-metrics-title">
      <h2 id="report-metrics-title" className="text-2xl font-semibold">
        Métricas y evidencia
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad de las 12 métricas base</CardTitle>
          <CardDescription>
            Incluye métricas observadas, no disponibles y pendientes para
            conservar cobertura explícita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="report-metric-table">
            <TableHeader>
              <TableRow>
                <TableHead>Pilar</TableHead>
                <TableHead>Métrica</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Lectura</TableHead>
                <TableHead>Normalizado</TableHead>
                <TableHead>Evidencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.metricRows.map((row) => (
                <TableRow key={row.metricId}>
                  <TableCell className="min-w-40 whitespace-normal">
                    {row.pillarLabel}
                  </TableCell>
                  <TableCell className="min-w-56 whitespace-normal">
                    <span className="font-medium">{row.metricId}</span> ·{" "}
                    {row.metricName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={metricStatusVariant(row)}>
                      {row.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-44 whitespace-normal">
                    {row.reading}
                  </TableCell>
                  <TableCell>
                    {row.normalizedValue === undefined
                      ? "-"
                      : formatScore(row.normalizedValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground min-w-64 whitespace-normal">
                    {row.evidence}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function RecommendationsSection({ report }: { report: MiuraReportData }) {
  return (
    <section
      className="grid gap-4 lg:grid-cols-2"
      aria-labelledby="report-recommendations-title"
    >
      <Card>
        <CardHeader>
          <CardTitle id="report-recommendations-title">
            Recomendaciones
          </CardTitle>
          <CardDescription>
            Acciones para convertir el diagnóstico en trabajo gestionable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {report.recommendationSet.actions.map((action, index) => (
              <li key={action} className="flex gap-3">
                <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-muted-foreground leading-6">
                  {action}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeo Scrum/Kanban</CardTitle>
          <CardDescription>
            MIURA complementa eventos y puntos de trabajo existentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {report.recommendationSet.scrumMapping.map((item) => (
              <li
                key={item.event}
                className="border-border rounded-lg border p-3"
              >
                <p className="font-medium">{item.event}</p>
                <p className="text-muted-foreground mt-1 leading-6">
                  {item.action}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function FormulaAndAssumptionsSection({ report }: { report: MiuraReportData }) {
  const warnings = report.calculationResult.warnings;

  return (
    <section className="space-y-4" aria-labelledby="report-formulas-title">
      <h2 id="report-formulas-title" className="text-2xl font-semibold">
        Fórmulas, supuestos y avisos
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fórmulas principales</CardTitle>
            <CardDescription>
              Reglas visibles para que el informe sea trazable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.formulaItems.map((item) => (
              <div key={item.id} className="space-y-1">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground text-sm leading-6">
                  {item.formula}
                </p>
                <p className="text-muted-foreground text-sm leading-6">
                  {item.businessExplanation}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supuestos y avisos</CardTitle>
            <CardDescription>
              Condiciones que evitan falsa precisión metodológica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {report.calculationResult.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-2 leading-6">
                  <CheckCircle2Icon
                    aria-hidden="true"
                    className="text-primary mt-1 size-4 shrink-0"
                  />
                  <span className="text-muted-foreground">{assumption}</span>
                </li>
              ))}
            </ul>
            {warnings.length === 0 ? (
              <p className="text-muted-foreground leading-6">
                No hay avisos adicionales para esta evaluación.
              </p>
            ) : (
              <ul className="space-y-2">
                {warnings.map((warning) => (
                  <li key={warning} className="flex gap-2 leading-6">
                    <AlertCircleIcon
                      aria-hidden="true"
                      className="text-severity-medium mt-1 size-4 shrink-0"
                    />
                    <span className="text-muted-foreground">{warning}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MethodologyDisclaimers({ report }: { report: MiuraReportData }) {
  return (
    <Alert className="border-info-border bg-info-bg text-info-foreground">
      <ShieldAlertIcon aria-hidden="true" />
      <AlertTitle>Disclaimers y privacidad de exportación</AlertTitle>
      <AlertDescription className="space-y-2 leading-6">
        <span className="block">{report.exportWarning}</span>
        <span className="block">{report.disclaimers.preliminary}</span>
        <span className="block">{report.disclaimers.economic}</span>
        <span className="block">{report.disclaimers.coverage}</span>
        <span className="block">{report.disclaimers.localDemo}</span>
      </AlertDescription>
    </Alert>
  );
}

function MissingReport({ evaluationId }: { evaluationId: string }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DatabaseIcon aria-hidden="true" className="text-primary size-4" />
          <CardTitle>Evaluación local no disponible</CardTitle>
        </div>
        <CardDescription className="leading-6">
          No hay datos locales suficientes para generar el informe de{" "}
          {evaluationId}. Puedes crear una evaluación nueva, cargar el ejemplo o
          importar un JSON válido desde ajustes locales.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="w-fit">
          <Link href="/evaluacion/nueva">Crear evaluación</Link>
        </Button>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/ajustes-locales">Ir a ajustes locales</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ReportResults({ appVersion, evaluationId }: ReportResultsProps) {
  const [reportState, setReportState] = useState<ReportState>({
    status: "loading",
  });
  const [message, setMessage] = useState<ReportMessage>();

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      const resultState = resolveMiuraEvaluationResult(evaluationId);

      if (resultState.status !== "ready") {
        setReportState(resultState);
        return;
      }

      const report = buildMiuraReportData({
        ...resultState.data,
        appVersion,
        generatedAt: new Date().toISOString(),
      });
      const markdown = renderMiuraReportMarkdown(report);

      setReportState({
        status: "ready",
        data: resultState.data,
        report,
        markdown,
      });
    });

    return () => {
      active = false;
    };
  }, [appVersion, evaluationId]);

  if (reportState.status === "loading") {
    return (
      <Alert>
        <DatabaseIcon aria-hidden="true" />
        <AlertTitle>Cargando informe local</AlertTitle>
        <AlertDescription>
          MIURA está recuperando la evaluación guardada en este navegador y
          preparando el informe imprimible.
        </AlertDescription>
      </Alert>
    );
  }

  if (reportState.status === "missing") {
    return <MissingReport evaluationId={evaluationId} />;
  }

  if (reportState.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>No se ha podido generar el informe</AlertTitle>
        <AlertDescription>{reportState.message}</AlertDescription>
      </Alert>
    );
  }

  const { markdown, report } = reportState;

  return (
    <div className="space-y-5">
      <div className="miura-print-hidden flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <Alert className="border-info-border bg-info-bg text-info-foreground lg:max-w-2xl">
          <FileTextIcon aria-hidden="true" />
          <AlertTitle>Informe exportable</AlertTitle>
          <AlertDescription className="leading-6">
            Markdown y vista imprimible se generan en el navegador. No se envían
            datos de evaluación a ningún servidor.
          </AlertDescription>
        </Alert>
        <ReportActions
          markdown={markdown}
          report={report}
          onMessage={setMessage}
        />
      </div>

      {message !== undefined && (
        <Alert
          variant={message.variant === "error" ? "destructive" : "default"}
          className="miura-print-hidden"
        >
          {message.variant === "error" ? (
            <AlertCircleIcon aria-hidden="true" />
          ) : (
            <CheckCircle2Icon aria-hidden="true" />
          )}
          <AlertTitle>
            {message.variant === "error"
              ? "Revisa la exportación"
              : "Operación completada"}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <article
        data-testid="report-document"
        className="miura-print-report space-y-8"
      >
        <ReportMetadata report={report} />
        <MethodologyDisclaimers report={report} />
        <ExecutiveSummary report={report} />
        <CoverageSection report={report} />
        <ScenariosSection report={report} />
        <MetricsSection report={report} />
        <RecommendationsSection report={report} />
        <FormulaAndAssumptionsSection report={report} />
      </article>
    </div>
  );
}

export { ReportResults };
