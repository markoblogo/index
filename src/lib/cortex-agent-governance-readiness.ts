import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { listCortexAgentGovernanceShadowReceipts } from "@/lib/cortex-agent-governance-capability";
import type {
  CortexAgentGovernanceActionTelemetryRecord,
  CortexAgentGovernanceConsumerSurface,
  CortexAgentGovernanceReceiptLedgerRecord,
} from "@/lib/cortex-agent-governance-capability";

const TRACKED_SURFACES: CortexAgentGovernanceConsumerSurface[] = [
  "mn7r-exe-assistant",
  "mn7r-manual-assistant",
  "mn7r-public-assistant",
];
const MINIMUM_RECEIPTS_PER_SURFACE = 30;

export type CortexAgentGovernanceReadinessTrack = {
  consumerSurface: CortexAgentGovernanceConsumerSurface;
  decisions: { allow: number; deny: number; requireApproval: number };
  errors: number;
  latencyMs: { average: number | null; p95: number | null; samples: number };
  privacyBoundaryFailures: number;
  receiptCount: number;
  status: "collecting" | "ready_for_human_review";
  stopping: { abstain: number; continue: number; requestReview: number };
  telemetryCoverage: { cost: number; completed: number; tokens: number };
};

export type CortexAgentGovernanceReadinessSnapshot = {
  createdAt: string;
  id: string;
  mode: "shadow-first";
  promotionEligible: false;
  promotionReason: string;
  product: "1D3X Cortex";
  tenantId: string;
  tracks: CortexAgentGovernanceReadinessTrack[];
  version: 1;
};

type ReceiptRow = { receiptJson: CortexAgentGovernanceReceiptLedgerRecord };
type TelemetryRow = { telemetryJson: CortexAgentGovernanceActionTelemetryRecord };
let storageReady: Promise<void> | null = null;

/** Read-only aggregation of real shadow receipts. It never promotes or enforces. */
export async function recordCortexAgentGovernanceReadinessSnapshot(input: { createdAt?: string; tenantId: string }) {
  if (!hasDatabaseUrl()) return null;
  // The receipt reader owns the base ledger bootstrap; readiness is only a consumer.
  await listCortexAgentGovernanceShadowReceipts({ limit: 1, tenantId: input.tenantId });
  const { receipts, telemetry } = await loadGovernanceData(input.tenantId);
  const snapshot = buildCortexAgentGovernanceReadinessSnapshot({ createdAt: input.createdAt, receipts, telemetry, tenantId: input.tenantId });
  await ensureStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexAgentGovernanceReadinessLedger" ("id", "tenantId", "snapshotJson", "createdAt") VALUES ($1, $2, $3::jsonb, $4::timestamp) ON CONFLICT ("id") DO NOTHING`,
    snapshot.id, snapshot.tenantId, JSON.stringify(snapshot), snapshot.createdAt,
  );
  return snapshot;
}

export function buildCortexAgentGovernanceReadinessSnapshot(input: {
  createdAt?: string;
  receipts: CortexAgentGovernanceReceiptLedgerRecord[];
  telemetry: CortexAgentGovernanceActionTelemetryRecord[];
  tenantId: string;
}): CortexAgentGovernanceReadinessSnapshot {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const telemetryByReceipt = new Map(input.telemetry.map((record) => [record.receiptId, record]));
  const tracks = TRACKED_SURFACES.map((consumerSurface) => buildTrack({
    consumerSurface,
    receipts: input.receipts.filter((receipt) => receipt.consumerSurface === consumerSurface),
    telemetryByReceipt,
  }));
  return {
    createdAt,
    id: `cortex-governance-readiness:${input.tenantId}:${hashValue({ createdAt: createdAt.slice(0, 10), tracks }).slice(0, 20)}`,
    mode: "shadow-first",
    promotionEligible: false,
    promotionReason: "Shadow-only monitor: a separate human-approved promotion gate is required even when readiness criteria are met.",
    product: "1D3X Cortex",
    tenantId: input.tenantId,
    tracks,
    version: 1,
  };
}

function buildTrack(input: {
  consumerSurface: CortexAgentGovernanceConsumerSurface;
  receipts: CortexAgentGovernanceReceiptLedgerRecord[];
  telemetryByReceipt: Map<string, CortexAgentGovernanceActionTelemetryRecord>;
}): CortexAgentGovernanceReadinessTrack {
  const completed = input.receipts.map((receipt) => input.telemetryByReceipt.get(receipt.id)).filter(Boolean) as CortexAgentGovernanceActionTelemetryRecord[];
  const latencyValues = completed.map((record) => record.telemetry.latencyMs).filter((value): value is number => value !== null).sort((left, right) => left - right);
  const costValues = completed.filter((record) => record.telemetry.estimatedCost !== null).length;
  const tokenValues = completed.filter((record) => record.telemetry.tokens !== null).length;
  const privacyBoundaryFailures = input.receipts.filter((receipt) => receipt.sourceVisibility === "public" && receipt.evidence.protectedEvidenceCount > 0 && (receipt.decision !== "deny" || receipt.stop !== "abstain")).length;
  const errors = completed.filter((record) => record.outcome === "failed").length;
  const receiptCount = input.receipts.length;
  const completedCoverage = ratio(completed.length, receiptCount);
  const status = receiptCount >= MINIMUM_RECEIPTS_PER_SURFACE && completedCoverage >= 0.95 && privacyBoundaryFailures === 0 && errors === 0
    ? "ready_for_human_review"
    : "collecting";
  return {
    consumerSurface: input.consumerSurface,
    decisions: {
      allow: count(input.receipts, (receipt) => receipt.decision === "allow"),
      deny: count(input.receipts, (receipt) => receipt.decision === "deny"),
      requireApproval: count(input.receipts, (receipt) => receipt.decision === "require_approval"),
    },
    errors,
    latencyMs: { average: average(latencyValues), p95: percentile(latencyValues, 0.95), samples: latencyValues.length },
    privacyBoundaryFailures,
    receiptCount,
    status,
    stopping: {
      abstain: count(input.receipts, (receipt) => receipt.stop === "abstain"),
      continue: count(input.receipts, (receipt) => receipt.stop === "continue"),
      requestReview: count(input.receipts, (receipt) => receipt.stop === "request_review"),
    },
    telemetryCoverage: { completed: completedCoverage, cost: ratio(costValues, receiptCount), tokens: ratio(tokenValues, receiptCount) },
  };
}

async function loadGovernanceData(tenantId: string) {
  const [receiptRows, telemetryRows] = await Promise.all([
    db.$queryRawUnsafe<ReceiptRow[]>(`SELECT "receiptJson" FROM "CortexAgentGovernanceReceiptLedger" WHERE "tenantId" = $1 ORDER BY "createdAt" DESC LIMIT 1000`, tenantId),
    db.$queryRawUnsafe<TelemetryRow[]>(`SELECT "telemetryJson" FROM "CortexAgentGovernanceTelemetryLedger" ORDER BY "completedAt" DESC LIMIT 2000`),
  ]);
  return { receipts: receiptRows.map((row) => row.receiptJson), telemetry: telemetryRows.map((row) => row.telemetryJson) };
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAgentGovernanceReadinessLedger" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "snapshotJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexAgentGovernanceReadinessLedger_tenant_idx" ON "CortexAgentGovernanceReadinessLedger"("tenantId", "createdAt" DESC)`);
  })();
  await storageReady;
}

function count<T>(items: T[], predicate: (item: T) => boolean) {
  return items.filter(predicate).length;
}

function ratio(value: number, total: number) {
  return total ? Math.round((value / total) * 10_000) / 10_000 : 0;
}

function average(values: number[]) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100 : null;
}

function percentile(values: number[], ratioValue: number) {
  if (!values.length) return null;
  return values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * ratioValue) - 1))] ?? null;
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
