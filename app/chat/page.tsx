import type { Metadata } from "next";
import { MessageSquareTextIcon } from "lucide-react";

import {
  InfoTileGrid,
  MvpNotice,
  PageIntro,
} from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Pregunta a MIURA",
};

const chatStates = [
  {
    title: "Pregunta en español",
    description:
      "La superficie se reserva para dudas sobre MIURA, deuda técnica, métricas, fórmulas y Scrum.",
  },
  {
    title: "Citas visibles",
    description:
      "Las respuestas fundamentadas deberán mostrar fuentes cuando el RAG esté conectado.",
  },
  {
    title: "Contexto controlado",
    description:
      "El uso de resumen de evaluación será opcional y mínimo cuando se implemente el toggle.",
  },
];

export default function ChatPage() {
  return (
    <>
      <PageIntro
        eyebrow="Chat RAG"
        title="Pregunta a MIURA"
        description="La ruta del chatbot queda accesible desde la navegación global. La recuperación en Supabase, LangChain.js, streaming y guardrails se implementan en las tareas RAG."
      >
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <MessageSquareTextIcon aria-hidden="true" className="size-4" />
          Sin conexión a proveedor LLM en esta tarea
        </div>
      </PageIntro>

      <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <InfoTileGrid items={chatStates} />
        <MvpNotice title="No inventar fuentes">
          Cuando el RAG esté activo, si no hay evidencia suficiente en el corpus
          controlado, el chatbot deberá decirlo claramente en lugar de responder
          con autoridad.
        </MvpNotice>
      </section>
    </>
  );
}
