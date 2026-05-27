import { handleMiuraAnalyticsRequest } from "@/lib/miura/analytics/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMiuraAnalyticsRequest(request);
}
