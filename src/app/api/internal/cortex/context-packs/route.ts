import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import {
  listCortexContextPackRecords,
  normalizeCortexLedgerListLimit,
  type CortexContextPackLedgerRecord,
} from "@/lib/commodity-intelligence-ledger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const records = await listCortexContextPackRecords({
    entityType: normalizeEntityType(url.searchParams.get("entityType")),
    limit: normalizeCortexLedgerListLimit(parseLimit(url.searchParams.get("limit"))),
    purpose: normalizePurpose(url.searchParams.get("purpose")),
    reportKind: url.searchParams.get("reportKind"),
    tenantId: url.searchParams.get("tenantId"),
  });
  const includePack = url.searchParams.get("includePack") === "1";

  return NextResponse.json({
    count: records.length,
    includePack,
    records: records.map((record) => serializeCortexLedgerRecord(record, { includePack })),
  });
}

function isAuthorized(request: Request) {
  return isBearerTokenAuthorized(request, [
    process.env.CORTEX_INTERNAL_API_SECRET,
    process.env.CRON_SECRET,
  ]);
}

function serializeCortexLedgerRecord(
  record: CortexContextPackLedgerRecord,
  options: { includePack: boolean },
) {
  return {
    createdAt: record.createdAt,
    id: record.id,
    metrics: record.metrics,
    pack: options.includePack ? record.pack : undefined,
    packHash: record.packHash,
    product: record.product,
    purpose: record.purpose,
    query: record.query,
    sourceIds: record.sourceIds,
    target: record.target,
    visibility: record.visibility,
  };
}

function normalizeEntityType(value: string | null) {
  return value === "mediahub-report" ||
    value === "manual-analysis" ||
    value === "monitor-comparison" ||
    value === "execution-context"
    ? value
    : null;
}

function normalizePurpose(value: string | null) {
  return value === "market-report" ||
    value === "monitor-index-comparison" ||
    value === "execution-context" ||
    value === "source-review"
    ? value
    : null;
}

function parseLimit(value: string | null) {
  return value == null ? null : Number(value);
}
