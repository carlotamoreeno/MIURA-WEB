"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  AlertCircleIcon,
  BookOpenTextIcon,
  CheckCircle2Icon,
  MessageSquareTextIcon,
  RotateCcwIcon,
  SendIcon,
  ShieldCheckIcon,
  SquareIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { DefaultChatTransport, type TextUIPart, type UIMessage } from "ai";

import {
  buildMiuraChatEvaluationContext,
  parseMiuraChatCitationsData,
} from "@/lib/miura/rag/chat-client";
import {
  formatCoverageStatusForChat,
  formatPillarForChat,
  formatRecommendationLevelForChat,
  type MiuraChatCitationsData,
  type MiuraMinimalEvaluationContext,
} from "@/lib/miura/rag/chat-contract";
import {
  getLatestTemporaryEvaluationSession,
  type TemporaryEvaluationSessionSource,
} from "@/lib/miura/session/evaluation-session";
import { resolveMiuraEvaluationResult } from "@/lib/miura/session/evaluation-results";
import { MIURA_LOCAL_STORE_EVENT } from "@/lib/miura/session/local-store";
import { cn } from "@/lib/utils";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type MiuraChatDataParts = {
  citations: MiuraChatCitationsData;
};

type MiuraChatMessageMetadata = {
  model?: string;
  noSources?: boolean;
  usesEvaluationContext?: boolean;
};

type MiuraChatUiMessage = UIMessage<
  MiuraChatMessageMetadata,
  MiuraChatDataParts
>;

type ActiveEvaluationContextState =
  | {
      status: "missing";
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "ready";
      context: MiuraMinimalEvaluationContext;
      label: string;
      source: TemporaryEvaluationSessionSource;
      warning?: string;
    };

const exampleQuestions = [
  "¿Qué es PDI en MIURA?",
  "¿Cómo se calcula DS?",
  "¿Cómo encaja MIURA con Scrum?",
] as const;

const numberFormatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function resolveActiveEvaluationContext(): ActiveEvaluationContextState {
  const latestSession = getLatestTemporaryEvaluationSession();

  if (latestSession === undefined) {
    return {
      status: "missing",
    };
  }

  const resultState = resolveMiuraEvaluationResult(latestSession.evaluation.id);

  if (resultState.status === "error") {
    return {
      status: "error",
      message: resultState.message,
    };
  }

  if (resultState.status === "missing") {
    return {
      status: "missing",
    };
  }

  return {
    status: "ready",
    context: buildMiuraChatEvaluationContext(resultState.data),
    label: resultState.data.project.name,
    source: latestSession.source,
    warning: latestSession.storageWarning,
  };
}

function getMessageText(message: MiuraChatUiMessage) {
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function getCitationDataFromMessage(message: MiuraChatUiMessage) {
  for (const part of message.parts) {
    if (part.type !== "data-citations") continue;

    const citationData = parseMiuraChatCitationsData(part.data);

    if (citationData !== undefined) {
      return citationData;
    }
  }

  return undefined;
}

function getLatestCitationData(messages: MiuraChatUiMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message === undefined || message.role !== "assistant") continue;

    const citationData = getCitationDataFromMessage(message);

    if (citationData !== undefined) {
      return citationData;
    }
  }

  return undefined;
}

function sourceLabel(source: TemporaryEvaluationSessionSource) {
  const labels = {
    draft: "Borrador local",
    example: "Ejemplo precargado",
    local: "Evaluación local",
  } as const satisfies Record<TemporaryEvaluationSessionSource, string>;

  return labels[source];
}

function isSafeHref(href: string | undefined) {
  if (href === undefined) return false;

  try {
    const url = new URL(href);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function SafeMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        a({ href, children }) {
          if (!isSafeHref(href)) {
            return <span>{children}</span>;
          }

          return (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </a>
          );
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
          );
        },
        code({ children, className }) {
          const isBlock = className !== undefined;

          if (isBlock) {
            return (
              <code className="bg-muted block overflow-x-auto rounded-md px-3 py-2 text-xs">
                {children}
              </code>
            );
          }

          return (
            <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CitationLocation({
  citation,
}: {
  citation: MiuraChatCitationsData["citations"][number];
}) {
  const location = [
    citation.section,
    citation.page === null ? undefined : `página ${citation.page}`,
  ]
    .filter(Boolean)
    .join(" · ");

  if (location === "") {
    return null;
  }

  return <span>{location}</span>;
}

function CitationList({
  citationData,
  compact = false,
  testId = "chat-citations",
}: {
  citationData: MiuraChatCitationsData;
  compact?: boolean;
  testId?: string;
}) {
  if (!citationData.hasSufficientSources) {
    return (
      <Alert
        className="border-info-border bg-info-bg text-info-foreground"
        data-testid="chat-no-sources"
      >
        <AlertCircleIcon aria-hidden="true" />
        <AlertTitle>Sin evidencia suficiente</AlertTitle>
        <AlertDescription>
          El RAG no ha encontrado fuentes suficientes en el corpus controlado
          para respaldar una respuesta.
        </AlertDescription>
      </Alert>
    );
  }

  if (citationData.citations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Citas</Badge>
        <span className="text-muted-foreground text-xs">
          {citationData.retrieval.retrievedChunks} de{" "}
          {citationData.retrieval.topK} fragmentos · umbral{" "}
          {numberFormatter.format(citationData.retrieval.matchThreshold)}
        </span>
      </div>

      <div className="space-y-2">
        {citationData.citations.map((citation, index) => {
          const href = citation.url ?? undefined;
          const canLink = isSafeHref(href);

          return (
            <article
              key={citation.id}
              className={cn(
                "border-border bg-background rounded-lg border p-3",
                compact && "p-2.5",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="bg-primary text-primary-foreground mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[0.68rem] font-semibold">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="text-sm leading-snug font-medium wrap-anywhere">
                    {citation.documentTitle}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-5">
                    <CitationLocation citation={citation} />
                    {citation.citationLabel ? (
                      <>
                        {" "}
                        <span aria-hidden="true">·</span>{" "}
                        {citation.citationLabel}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <blockquote className="border-border text-muted-foreground mt-2 border-l-2 pl-3 text-xs leading-5">
                {citation.snippet}
              </blockquote>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline">
                  Afinidad {numberFormatter.format(citation.score)}
                </Badge>
                {canLink ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    Abrir fuente
                  </a>
                ) : (
                  <code className="bg-muted max-w-full rounded px-1.5 py-0.5 wrap-anywhere">
                    {citation.localPath}
                  </code>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: MiuraChatUiMessage }) {
  const isUser = message.role === "user";
  const text = getMessageText(message);
  const citationData = getCitationDataFromMessage(message);

  if (message.role === "system") {
    return null;
  }

  return (
    <article
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
      data-testid={isUser ? "chat-message-user" : "chat-message-assistant"}
    >
      <div
        className={cn(
          "max-w-[min(100%,44rem)] rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "border-border bg-card text-card-foreground",
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={isUser ? "secondary" : "outline"}>
            {isUser ? "Tu pregunta" : "MIURA"}
          </Badge>
          {citationData?.usesEvaluationContext ? (
            <Badge variant="outline">Con resumen de evaluación</Badge>
          ) : null}
        </div>

        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose-none">
            {text === "" ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Spinner aria-label="Respuesta en curso" />
                <span>Preparando respuesta...</span>
              </div>
            ) : (
              <SafeMarkdown content={text} />
            )}
          </div>
        )}

        {!isUser && citationData !== undefined ? (
          <div className="mt-4 border-t pt-4">
            <CitationList citationData={citationData} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function EvaluationContextPanel({
  activeContext,
  useEvaluationContext,
  onUseEvaluationContextChange,
}: {
  activeContext: ActiveEvaluationContextState;
  useEvaluationContext: boolean;
  onUseEvaluationContextChange: (checked: boolean) => void;
}) {
  const hasContext = activeContext.status === "ready";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheckIcon aria-hidden="true" className="size-4" />
          Contexto de evaluación
        </CardTitle>
        <CardDescription>
          Control de privacidad para enviar solo un resumen mínimo al chat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-border bg-muted/35 flex items-start justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-1">
            <label
              htmlFor="chat-context-toggle"
              className="text-sm leading-none font-medium"
            >
              Usar resumen mínimo de mi evaluación
            </label>
            <p
              id="chat-context-description"
              className="text-muted-foreground text-xs leading-5"
            >
              No envía métricas crudas, notas de evidencia ni el JSON completo.
            </p>
          </div>
          <Switch
            id="chat-context-toggle"
            data-testid="chat-context-toggle"
            checked={useEvaluationContext}
            disabled={!hasContext}
            aria-describedby="chat-context-description"
            onCheckedChange={onUseEvaluationContextChange}
          />
        </div>

        {activeContext.status === "missing" ? (
          <Alert data-testid="chat-context-status">
            <BookOpenTextIcon aria-hidden="true" />
            <AlertTitle>Sin evaluación activa</AlertTitle>
            <AlertDescription>
              El chat funciona sin contexto. Crea o carga una evaluación local
              para activar el resumen mínimo.
            </AlertDescription>
          </Alert>
        ) : null}

        {activeContext.status === "error" ? (
          <Alert variant="destructive" data-testid="chat-context-status">
            <AlertCircleIcon aria-hidden="true" />
            <AlertTitle>No se puede preparar el contexto</AlertTitle>
            <AlertDescription>{activeContext.message}</AlertDescription>
          </Alert>
        ) : null}

        {activeContext.status === "ready" ? (
          <div className="space-y-3" data-testid="chat-context-status">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {sourceLabel(activeContext.source)}
              </Badge>
              <Badge variant={useEvaluationContext ? "default" : "outline"}>
                {useEvaluationContext ? "Contexto activo" : "Contexto apagado"}
              </Badge>
            </div>
            <div className="border-border rounded-lg border p-3 text-sm">
              <p className="font-medium wrap-anywhere">{activeContext.label}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {activeContext.context.indices ? (
                  <>
                    <div>
                      <dt className="text-muted-foreground">DS</dt>
                      <dd className="font-semibold">
                        {numberFormatter.format(
                          activeContext.context.indices.DS,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cobertura</dt>
                      <dd className="font-semibold">
                        {activeContext.context.coverageStatus
                          ? formatCoverageStatusForChat(
                              activeContext.context.coverageStatus,
                            )
                          : "No disponible"}
                      </dd>
                    </div>
                  </>
                ) : null}
                {activeContext.context.dominantPillar ? (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Pilar dominante</dt>
                    <dd className="font-semibold">
                      {formatPillarForChat(
                        activeContext.context.dominantPillar,
                      )}
                    </dd>
                  </div>
                ) : null}
                {activeContext.context.recommendationLevel ? (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Recomendación</dt>
                    <dd className="font-semibold">
                      {formatRecommendationLevelForChat(
                        activeContext.context.recommendationLevel,
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {activeContext.warning ? (
              <Alert>
                <AlertCircleIcon aria-hidden="true" />
                <AlertTitle>Persistencia limitada</AlertTitle>
                <AlertDescription>{activeContext.warning}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LatestSourcesPanel({
  citationData,
}: {
  citationData: MiuraChatCitationsData | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenTextIcon aria-hidden="true" className="size-4" />
          Fuentes de la última respuesta
        </CardTitle>
        <CardDescription>
          Fragmentos recuperados desde el corpus controlado MIURA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {citationData === undefined ? (
          <p className="text-muted-foreground text-sm leading-6">
            Las citas aparecerán cuando el asistente responda con base en el
            corpus.
          </p>
        ) : (
          <CitationList
            citationData={citationData}
            compact
            testId="chat-latest-citations"
          />
        )}
      </CardContent>
    </Card>
  );
}

function ChatPanel() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<MiuraChatUiMessage>({
        api: "/api/chat",
      }),
    [],
  );
  const { messages, sendMessage, status, stop, error, regenerate, clearError } =
    useChat<MiuraChatUiMessage>({
      transport,
      experimental_throttle: 80,
    });
  const [input, setInput] = useState("");
  const [useEvaluationContext, setUseEvaluationContext] = useState(false);
  const [activeContext, setActiveContext] =
    useState<ActiveEvaluationContextState>({
      status: "missing",
    });
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";
  const effectiveUseEvaluationContext =
    useEvaluationContext && activeContext.status === "ready";
  const latestCitationData = getLatestCitationData(messages);

  useEffect(() => {
    function syncContext() {
      setActiveContext(resolveActiveEvaluationContext());
    }

    syncContext();
    window.addEventListener(MIURA_LOCAL_STORE_EVENT, syncContext);
    window.addEventListener("storage", syncContext);

    return () => {
      window.removeEventListener(MIURA_LOCAL_STORE_EVENT, syncContext);
      window.removeEventListener("storage", syncContext);
    };
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, status]);

  function buildRequestBody() {
    return {
      useEvaluationContext: effectiveUseEvaluationContext,
      ...(effectiveUseEvaluationContext && activeContext.status === "ready"
        ? {
            evaluationContext: activeContext.context,
          }
        : {}),
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = input.trim();

    if (question === "" || isBusy) {
      return;
    }

    if (error !== undefined) {
      clearError();
    }

    setInput("");

    try {
      await sendMessage(
        {
          text: question,
        },
        {
          body: buildRequestBody(),
        },
      );
    } catch {
      // useChat exposes the controlled error state for rendering.
    }
  }

  async function handleRetry() {
    try {
      await regenerate({
        body: buildRequestBody(),
      });
    } catch {
      // useChat exposes the controlled error state for rendering.
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
      <Card className="min-h-[620px]">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <MessageSquareTextIcon aria-hidden="true" className="size-4" />
                Conversación
              </CardTitle>
              <CardDescription>
                Respuestas en español con fuentes cuando el corpus aporta
                evidencia suficiente.
              </CardDescription>
            </div>
            <Badge
              variant={status === "error" ? "destructive" : "outline"}
              data-testid="chat-status"
            >
              {status === "submitted"
                ? "Buscando fuentes"
                : status === "streaming"
                  ? "Respondiendo"
                  : status === "error"
                    ? "Error"
                    : "Listo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-[520px] flex-col gap-4">
          <ScrollArea className="border-border bg-muted/20 min-h-0 flex-1 rounded-lg border">
            <div className="space-y-4 p-4" aria-live="polite">
              {messages.length === 0 ? (
                <Empty className="min-h-[320px] border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageSquareTextIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Pregunta a MIURA</EmptyTitle>
                    <EmptyDescription>
                      El asistente responde sobre MIURA, deuda técnica, fórmulas
                      y Scrum/Kanban usando el corpus controlado.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <div className="flex flex-wrap justify-center gap-2">
                      {exampleQuestions.map((question) => (
                        <Button
                          key={question}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInput(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </EmptyContent>
                </Empty>
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}

              {isBusy ? (
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Spinner aria-label="Chat en curso" />
                  <span>
                    {status === "submitted"
                      ? "Recuperando evidencia del corpus..."
                      : "Transmitiendo respuesta..."}
                  </span>
                </div>
              ) : null}

              <div ref={scrollAnchorRef} />
            </div>
          </ScrollArea>

          {error !== undefined ? (
            <Alert variant="destructive" data-testid="chat-error">
              <AlertCircleIcon aria-hidden="true" />
              <AlertTitle>No se ha podido completar la respuesta</AlertTitle>
              <AlertDescription>
                Reintenta en unos segundos. La evaluación local no se ha visto
                afectada.
              </AlertDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="chat-retry"
                  onClick={() => void handleRetry()}
                >
                  <RotateCcwIcon aria-hidden="true" />
                  Reintentar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                >
                  Descartar error
                </Button>
              </div>
            </Alert>
          ) : null}

          <form
            className="space-y-3"
            data-testid="chat-form"
            onSubmit={(event) => void handleSubmit(event)}
          >
            <label htmlFor="chat-input" className="text-sm font-medium">
              Pregunta
            </label>
            <Textarea
              id="chat-input"
              data-testid="chat-input"
              value={input}
              disabled={isBusy}
              placeholder="Pregunta sobre CDI, DDI, PDI, DS, deuda técnica o Scrum/Kanban."
              className="min-h-24 resize-y"
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs leading-5">
                Las conversaciones no se guardan. El contexto de evaluación se
                envía solo si activas el switch.
              </p>
              <div className="flex items-center gap-2">
                {isBusy ? (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="chat-stop"
                    onClick={() => void stop()}
                  >
                    <SquareIcon aria-hidden="true" />
                    Detener
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={input.trim() === "" || isBusy}
                  data-testid="chat-submit"
                >
                  {isBusy ? (
                    <Spinner aria-label="Enviando" />
                  ) : (
                    <SendIcon aria-hidden="true" />
                  )}
                  Enviar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="space-y-5">
        <EvaluationContextPanel
          activeContext={activeContext}
          useEvaluationContext={effectiveUseEvaluationContext}
          onUseEvaluationContextChange={setUseEvaluationContext}
        />

        <LatestSourcesPanel citationData={latestCitationData} />

        <Alert className="border-info-border bg-info-bg text-info-foreground">
          <CheckCircle2Icon aria-hidden="true" />
          <AlertTitle>MIURA preliminar</AlertTitle>
          <AlertDescription>
            Las respuestas son apoyo metodológico basado en corpus. No
            sustituyen juicio profesional ni validación industrial.
          </AlertDescription>
        </Alert>
      </aside>
    </section>
  );
}

export { ChatPanel };
