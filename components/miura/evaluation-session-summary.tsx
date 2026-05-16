"use client";

import { useMemo } from "react";
import { ClockIcon, DatabaseIcon } from "lucide-react";

import { getTemporaryEvaluationSession } from "@/lib/miura/session/evaluation-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function EvaluationSessionSummary({ evaluationId }: { evaluationId: string }) {
  const session = useMemo(
    () => getTemporaryEvaluationSession(evaluationId),
    [evaluationId],
  );

  if (session === undefined) {
    return (
      <Alert>
        <ClockIcon aria-hidden="true" />
        <AlertTitle>Borrador temporal no disponible</AlertTitle>
        <AlertDescription>
          Esta versión mantiene la evaluación creada en memoria de sesión. Si
          recargaste la página o abriste el enlace en otra pestaña, crea de
          nuevo el borrador hasta que TASK-015 añada persistencia local.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{session.project.name}</CardTitle>
            <CardDescription>
              {session.workspace.name} · {session.project.methodology}
            </CardDescription>
          </div>
          <Badge variant="secondary">Borrador local</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="text-muted-foreground">Evaluación</dt>
            <dd className="font-medium">{session.evaluation.name}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Capacidad mensual</dt>
            <dd className="font-medium">
              {session.project.monthlyCapacityHours} h
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-muted-foreground">Horizonte</dt>
            <dd className="font-medium">
              {session.evaluation.horizonMonths} meses
            </dd>
          </div>
        </dl>
        <div className="border-border bg-muted/35 mt-5 flex items-start gap-3 rounded-lg border p-3 text-sm">
          <DatabaseIcon
            aria-hidden="true"
            className="text-primary mt-0.5 size-4 shrink-0"
          />
          <p className="text-muted-foreground leading-6">
            Este handoff es temporal y no escribe en Supabase ni en APIs. La
            persistencia en navegador, exportación e importación quedan para
            TASK-015.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { EvaluationSessionSummary };
