"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DatabaseIcon,
  DownloadIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  parseMiuraLocalExportJson,
  serializeMiuraLocalExport,
  type MiuraLocalExport,
} from "@/lib/miura/schemas";
import {
  clearMiuraLocalStore,
  readMiuraLocalStore,
  replaceMiuraLocalExport,
  type MiuraLocalStoreState,
} from "@/lib/miura/session/local-store";
import { clearTemporaryEvaluationSessions } from "@/lib/miura/session/evaluation-session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LocalSettingsMessage = {
  variant: "success" | "error";
  text: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function projectForEvaluation(
  localExport: MiuraLocalExport,
  projectId: string,
) {
  return localExport.projects.find((project) => project.id === projectId);
}

function workspaceForProject(
  localExport: MiuraLocalExport,
  workspaceId?: string,
) {
  return localExport.workspaces.find(
    (workspace) => workspace.id === workspaceId,
  );
}

function downloadTextFile({
  filename,
  content,
}: {
  filename: string;
  content: string;
}) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function LocalSettingsManager() {
  const [storeState, setStoreState] = useState<MiuraLocalStoreState>({
    mode: "persistent",
  });
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<LocalSettingsMessage>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evaluations = useMemo(
    () =>
      [...(storeState.localExport?.evaluations ?? [])].sort(
        (left, right) =>
          Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
      ),
    [storeState.localExport],
  );

  function refreshStoreState() {
    setStoreState(readMiuraLocalStore());
    setLoaded(true);
  }

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      refreshStoreState();
    });

    return () => {
      active = false;
    };
  }, []);

  function handleExport() {
    if (storeState.localExport === undefined) {
      setMessage({
        variant: "error",
        text: "No hay evaluaciones locales para exportar.",
      });
      return;
    }

    const serialized = serializeMiuraLocalExport(storeState.localExport);

    if (!serialized.success) {
      setMessage({
        variant: "error",
        text: serialized.message,
      });
      return;
    }

    downloadTextFile({
      filename: `miura-evaluaciones-${new Date().toISOString().slice(0, 10)}.json`,
      content: serialized.data,
    });
    setMessage({
      variant: "success",
      text: "Exportación JSON generada con datos validados por MIURA.",
    });
  }

  async function handleImportFile(file?: File) {
    if (file === undefined) return;

    const content = await file.text();
    const parsed = parseMiuraLocalExportJson(content);

    if (!parsed.success) {
      setMessage({
        variant: "error",
        text: parsed.message,
      });
      return;
    }

    clearTemporaryEvaluationSessions();
    const nextState = replaceMiuraLocalExport(parsed.data);

    setStoreState(nextState);
    setMessage({
      variant: "success",
      text: `Importación completada: ${parsed.data.evaluations.length} evaluación/es reemplazan los datos locales previos.`,
    });
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = "";
    }
  }

  function handleReset() {
    clearTemporaryEvaluationSessions();
    const nextState = clearMiuraLocalStore();

    setStoreState(nextState);
    setMessage({
      variant: "success",
      text: "Datos locales borrados en este navegador.",
    });
  }

  if (!loaded) {
    return (
      <Alert>
        <DatabaseIcon aria-hidden="true" />
        <AlertTitle>Cargando ajustes locales</AlertTitle>
        <AlertDescription>
          MIURA está comprobando el almacenamiento disponible en este navegador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      {message !== undefined && (
        <Alert
          variant={message.variant === "error" ? "destructive" : "default"}
        >
          <ShieldCheckIcon aria-hidden="true" />
          <AlertTitle>
            {message.variant === "error"
              ? "Revisa la operación"
              : "Operación completada"}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {storeState.warning !== undefined && (
        <Alert className="border-info-border bg-info-bg text-info-foreground">
          <DatabaseIcon aria-hidden="true" />
          <AlertTitle>Persistencia limitada</AlertTitle>
          <AlertDescription>{storeState.warning}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Evaluaciones locales</CardTitle>
                <CardDescription>
                  Datos guardados en este navegador, sin cuenta y sin servidor.
                </CardDescription>
              </div>
              <Badge
                variant={
                  storeState.mode === "session_fallback"
                    ? "destructive"
                    : "secondary"
                }
              >
                {storeState.mode === "session_fallback"
                  ? "Modo sesión"
                  : "localStorage"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {evaluations.length === 0 ? (
              <div
                data-testid="local-settings-empty"
                className="border-border bg-muted/35 rounded-lg border p-4"
              >
                <p className="font-medium">No hay evaluaciones guardadas</p>
                <p className="text-muted-foreground mt-2 leading-6">
                  Crea una evaluación nueva o importa un JSON válido de MIURA
                  para recuperar trabajo previo.
                </p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="local-settings-list">
                {evaluations.map((evaluation) => {
                  const project = projectForEvaluation(
                    storeState.localExport!,
                    evaluation.projectId,
                  );
                  const workspace = workspaceForProject(
                    storeState.localExport!,
                    project?.workspaceId,
                  );

                  return (
                    <div
                      key={evaluation.id}
                      className="border-border rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">{project?.name}</p>
                          <p className="text-muted-foreground text-sm leading-6">
                            {workspace?.name} · {evaluation.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Actualizada: {formatDateTime(evaluation.updatedAt)}
                          </p>
                        </div>
                        <Badge variant="outline">{evaluation.status}</Badge>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/evaluacion/${evaluation.id}/wizard`}>
                            Abrir wizard
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/evaluacion/${evaluation.id}/scorecard`}>
                            Abrir scorecard
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portabilidad JSON</CardTitle>
              <CardDescription>
                Exporta o importa el contenedor local validado por Zod.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                className="w-full justify-start"
                data-testid="local-export-json"
                disabled={storeState.localExport === undefined}
                onClick={handleExport}
              >
                <DownloadIcon />
                Exportar JSON
              </Button>

              <div className="space-y-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  data-testid="local-import-file"
                  aria-label="Importar JSON MIURA"
                  onChange={(event) => {
                    void handleImportFile(event.target.files?.[0]);
                  }}
                />
                <p className="text-muted-foreground text-xs leading-5">
                  Importar reemplaza los datos locales actuales para evitar
                  duplicados y conflictos de identificadores.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Borrado local</CardTitle>
              <CardDescription>
                Elimina evaluaciones guardadas en este navegador.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full justify-start"
                    data-testid="local-reset-open"
                    disabled={
                      storeState.localExport === undefined &&
                      storeState.mode !== "session_fallback"
                    }
                  >
                    <RotateCcwIcon />
                    Borrar datos locales
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Borrar evaluaciones locales
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción elimina los datos de MIURA guardados en este
                      navegador. No afecta a ningún servidor porque el MVP no
                      persiste evaluaciones fuera del navegador.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      data-testid="local-reset-confirm"
                      onClick={handleReset}
                    >
                      Borrar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export { LocalSettingsManager };
