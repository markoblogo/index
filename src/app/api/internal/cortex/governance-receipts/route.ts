import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import {
  listCortexAgentGovernanceShadowReceipts,
  normalizeCortexAgentGovernanceReceiptLimit,
} from "@/lib/cortex-agent-governance-capability";

export const dynamic = "force-dynamic";

/** Internal read-only access to shadow governance receipts. */
export async function GET(request: Request) {
  if (!isBearerTokenAuthorized(request, [process.env.CORTEX_INTERNAL_API_SECRET, process.env.CRON_SECRET])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const receipts = await listCortexAgentGovernanceShadowReceipts({
    correlationId: url.searchParams.get("correlationId"),
    limit: normalizeCortexAgentGovernanceReceiptLimit(parseNumber(url.searchParams.get("limit"))),
    taskId: url.searchParams.get("taskId"),
    tenantId: url.searchParams.get("tenantId"),
  });
  return NextResponse.json({ count: receipts.length, mode: "shadow-first", receipts, shadowOnly: true });
}

function parseNumber(value: string | null) {
  return value == null ? null : Number(value);
}
