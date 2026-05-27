import { handleMiuraChatRequest } from "@/lib/miura/rag/chat-server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleMiuraChatRequest(request);
}
