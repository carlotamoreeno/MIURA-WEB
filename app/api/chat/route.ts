import {
  handleMiuraChatOptionsRequest,
  handleMiuraChatRequest,
} from "@/lib/miura/rag/chat-server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleMiuraChatRequest(request);
}

export function OPTIONS(request: Request) {
  return handleMiuraChatOptionsRequest(request);
}
