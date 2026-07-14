import { NextResponse } from "next/server";
import { isBearerTokenAuthorized } from "@/lib/cron-auth";
import {
  listCortexMarketWorkforceRecords,
  normalizeCortexMarketWorkforceListLimit,
  persistCortexMarketWorkforcePacket,
  type CortexMarketWorkforcePacket,
} from "@/lib/cortex-market-workforce-ledger";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const records = await listCortexMarketWorkforceRecords({
    correlationId: url.searchParams.get("correlationId"),
    limit: normalizeCortexMarketWorkforceListLimit(parseNumber(url.searchParams.get("limit"))),
    taskId: url.searchParams.get("taskId"),
    tenantId: url.searchParams.get("tenantId"),
  });
  return NextResponse.json({ count: records.length, records });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readBody(request);
  if (!isPacket(body.packet) || typeof body.tenantId !== "string" || body.tenantId.trim().length === 0) {
    return NextResponse.json({ error: "tenantId and a valid market-workforce packet are required" }, { status: 400 });
  }

  const record = await persistCortexMarketWorkforcePacket({
    packet: body.packet,
    tenantId: body.tenantId.trim(),
    visibility: parseVisibility(body.visibility),
  });
  if (!record) return NextResponse.json({ error: "Cortex workforce ledger is not configured" }, { status: 503 });
  return NextResponse.json(record, { status: 201 });
}

function isAuthorized(request: Request) {
  return isBearerTokenAuthorized(request, [
    process.env.CORTEX_INTERNAL_API_SECRET,
    process.env.CRON_SECRET,
  ]);
}

async function readBody(request: Request): Promise<{ packet?: unknown; tenantId?: unknown; visibility?: unknown }> {
  try {
    return await request.json() as { packet?: unknown; tenantId?: unknown; visibility?: unknown };
  } catch {
    return {};
  }
}

function isPacket(value: unknown): value is CortexMarketWorkforcePacket {
  if (!value || typeof value !== "object") return false;
  const packet = value as Partial<CortexMarketWorkforcePacket>;
  return packet.packetType === "market-workforce" &&
    typeof packet.taskId === "string" &&
    typeof packet.correlationId === "string" &&
    (packet.diversityMode === "off" || packet.diversityMode === "research" || packet.diversityMode === "adversarial") &&
    Array.isArray(packet.candidates) &&
    Array.isArray(packet.observed) &&
    Array.isArray(packet.derived) &&
    Array.isArray(packet.assumed) &&
    Array.isArray(packet.recommended) &&
    Array.isArray(packet.blockedBy) &&
    Array.isArray(packet.roles) &&
    Boolean(packet.humanApproval) &&
    typeof packet.trigger === "string";
}

function parseVisibility(value: unknown): CortexVisibility {
  return value === "public" || value === "internal" || value === "secret" || value === "protected"
    ? value
    : "protected";
}

function parseNumber(value: string | null) {
  return value == null ? null : Number(value);
}
