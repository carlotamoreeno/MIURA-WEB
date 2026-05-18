"use client";

import { useEffect, useState } from "react";
import { ClockIcon, DatabaseIcon } from "lucide-react";

import {
  getTemporaryEvaluationSession,
  type TemporaryEvaluationSession,
} from "@/lib/miura/session/evaluation-session";
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
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<
    TemporaryEvaluationSession | undefined
  >();

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      setSession(getTemporaryEvaluationSession(evaluationId));
      setLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [evaluationId]);

  if (!loaded) {
    return (
      <Alert>
        <ClockIcon aria-hidden="true" />
        <AlertTitle>Cargando evaluación local</AlertTitle>
        <AlertDescription>
          MIURA está comprobando si existe un borrador guardado en este
          navegador.
        </AlertDescription>
      </Alert>
    );
  }

  if (session === undefined) {
    return (
      <Alert>
        <ClockIcon aria-hidden="true" />
        <AlertTitle>Evaluación local no disponible</AlertTitle>
        <AlertDescription>
          No se ha encontrado una evaluación guardada con este identificador en
          el navegador. Crea una evaluación nueva, carga el ejemplo o importa un
          JSON válido desde ajustes locales.
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
          <Badge
            variant={
              session.storageMode === "session_fallback"
                ? "destructive"
                : "secondary"
            }
          >
            {session.storageMode === "session_fallback"
              ? "Modo sesión"
              : "Guardado local"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {session.storageWarning !== undefined && (
          <Alert className="border-info-border bg-info-bg text-info-foreground mb-5">
            <DatabaseIcon aria-hidden="true" />
            <AlertTitle>Persistencia limitada</AlertTitle>
            <AlertDescription>{session.storageWarning}</AlertDescription>
          </Alert>
        )}
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
            Esta evaluación se gestiona en el navegador. No se escribe en
            Supabase, no se envía a APIs y no requiere cuenta de usuario.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export { EvaluationSessionSummary };
