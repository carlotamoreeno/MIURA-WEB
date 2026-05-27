// @vitest-environment node
import { config as loadDotenv } from "dotenv";
import { describe, expect, test } from "vitest";

import { POST } from "@/app/api/chat/route";
import { MIURA_NO_SOURCES_RESPONSE } from "@/lib/miura/rag/chat-server";

loadDotenv({ path: ".env", quiet: true });

const runIntegration = process.env.RUN_MIURA_CHAT_INTEGRATION === "1";
const describeIfIntegration = runIntegration ? describe : describe.skip;

function createChatRequest(text: string) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "chat-integration",
      trigger: "submit-message",
      messages: [
        {
          id: "user-integration",
          role: "user",
          parts: [
            {
              type: "text",
              text,
            },
          ],
        },
      ],
    }),
  });
}

describeIfIntegration("MIURA chat API integration", () => {
  test("streams an answer with citations for an in-corpus MIURA question", async () => {
    const response = await POST(createChatRequest("¿Qué es PDI en MIURA?"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("data-citations");
    expect(body).toContain('"hasSufficientSources":true');
    expect(body).toMatch(/PDI|Personas|proceso/i);
  }, 60_000);

  test("streams no-sources answer for an out-of-corpus question", async () => {
    const response = await POST(
      createChatRequest("¿Quién ganó el mundial de fútbol de 2010?"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("data-citations");
    expect(body).toContain('"hasSufficientSources":false');
    expect(body).toContain(MIURA_NO_SOURCES_RESPONSE);
  }, 45_000);
});
