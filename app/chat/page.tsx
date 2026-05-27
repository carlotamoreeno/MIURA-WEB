import type { Metadata } from "next";
import { MessageSquareTextIcon } from "lucide-react";

import { ChatPanel } from "@/components/miura/chat-panel";
import { PageIntro } from "@/components/miura/page-structure";

export const metadata: Metadata = {
  title: "Pregunta a MIURA",
};

export default function ChatPage() {
  return (
    <>
      <PageIntro
        eyebrow="Chat RAG"
        title="Pregunta a MIURA"
        description="Consulta el corpus controlado de MIURA, TFG y Scrum/Kanban con respuestas en streaming, citas visibles y control explícito del contexto de evaluación."
      >
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <MessageSquareTextIcon aria-hidden="true" className="size-4" />
          Conversación efímera, sin persistencia de mensajes
        </div>
      </PageIntro>

      <ChatPanel />
    </>
  );
}
