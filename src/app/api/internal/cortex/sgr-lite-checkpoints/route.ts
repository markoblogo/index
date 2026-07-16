import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import {
  listCortexSgrLiteCheckpoints,
  normalizeCortexSgrLiteListLimit,
} from "@/lib/cortex-sgr-lite";

export const dynamic = "force-dynamic";

/** Read-only operational evidence endpoint. Checkpoints are written internally. */
export async function GET(request: Request) {
  if (!isBearerTokenAuthorized(request, [process.env.CORTEX_INTERNAL_API_SECRET, process.env.CRON_SECRET])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const records = await listCortexSgrLiteCheckpoints({
    correlationId: url.searchParams.get("correlationId"),
    limit: normalizeCortexSgrLiteListLimit(parseNumber(url.searchParams.get("limit"))),
    taskId: url.searchParams.get("taskId"),
    tenantId: url.searchParams.get("tenantId"),
  });
  return NextResponse.json({ count: records.length, records, shadowOnly: true });
}

function parseNumber(value: string | null) {
  return value == null ? null : Number(value);
}
