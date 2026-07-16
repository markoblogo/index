import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";

export const CORTEX_AGENT_GOVERNANCE_MODE = "shadow-first" as const;
export const CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS = 1;

export type CortexAgentGovernanceActionKind =
  | "external_model_handoff"
  | "editorial_rewrite"
  | "mediahub_report_generation"
  | "publication_delivery"
  | "workforce_review";

export type CortexAgentGovernanceDecision = "allow" | "deny" | "require_approval";
export type CortexAgentGovernanceStop = "continue" | "abstain" | "request_review";
export type CortexAgentGovernanceVisibility = "public" | "internal" | "protected";

export type CortexAgentGovernanceTelemetry = {
  estimatedCost: number | null;
  latencyMs: number | null;
  tokens: number | null;
  toolCalls: number;
};

export type CortexAgentGovernanceDecisionInput = {
  actionKind: CortexAgentGovernanceActionKind;
  actionPayload: Record<string, unknown>;
  correlationId: string;
  evidence: {
    knownGapCount: number;
    protectedEvidenceCount: number;
    totalCount: number;
  };
  sourceVisibility: CortexAgentGovernanceVisibility;
  taskId: string;
};

export type CortexAgentGovernanceReceipt = {
  actionFingerprint: string;
  actionKind: CortexAgentGovernanceActionKind;
  correlationId: string;
  createdAt: string;
  decision: CortexAgentGovernanceDecision;
  evidence: CortexAgentGovernanceDecisionInput["evidence"];
  id: string;
  mode: "shadow-first";
  product: "1D3X Cortex";
  shortOperationalReason: string;
  sourceVisibility: CortexAgentGovernanceVisibility;
  stop: CortexAgentGovernanceStop;
  taskId: string;
  telemetry: CortexAgentGovernanceTelemetry;
  toolCallLimit: number;
  version: 1;
};

export type CortexAgentGovernanceReceiptLedgerRecord = CortexAgentGovernanceReceipt & {
  shadowOnly: true;
  tenantId: string;
};

export type CortexAgentGovernanceActionTelemetryRecord = {
  actionFingerprint: string;
  completedAt: string;
  id: string;
  outcome: "failed" | "succeeded";
  receiptId: string;
  shadowOnly: true;
  telemetry: CortexAgentGovernanceTelemetry;
};

export type CortexAgentGovernanceApproval = {
  actionFingerprint: string;
  approvalId: string;
  expiresAt: string;
  issuedAt: string;
  scope: "exact-action";
};

export type CortexAgentGovernanceApprovalUse = {
  actionFingerprint: string;
  approvalId: string;
  usedAt: string;
};

export type CortexAgentGovernanceReceiptValidation = { errors: string[]; ok: boolean };

export type CortexAgentGovernanceReceiptFilters = {
  correlationId?: string | null;
  limit?: number | null;
  taskId?: string | null;
  tenantId?: string | null;
};

let receiptStorageReady: Promise<void> | null = null;

/** Deterministic policy proposal. Shadow mode deliberately never enforces it. */
export function buildCortexAgentGovernanceReceipt(input: CortexAgentGovernanceDecisionInput & { createdAt?: string }): CortexAgentGovernanceReceipt {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const actionFingerprint = fingerprintAction({
    actionKind: input.actionKind,
    actionPayload: input.actionPayload,
    sourceVisibility: input.sourceVisibility,
  });
  const policy = decide(input);
  const receipt: CortexAgentGovernanceReceipt = {
    actionFingerprint,
    actionKind: input.actionKind,
    correlationId: compactId(input.correlationId),
    createdAt,
    decision: policy.decision,
    evidence: normalizeEvidence(input.evidence),
    id: `cortex-governance:${compactId(input.taskId)}:${hashValue({ actionFingerprint, createdAt }).slice(0, 20)}`,
    mode: CORTEX_AGENT_GOVERNANCE_MODE,
    product: "1D3X Cortex",
    shortOperationalReason: policy.reason,
    sourceVisibility: input.sourceVisibility,
    stop: policy.stop,
    taskId: compactId(input.taskId),
    telemetry: { estimatedCost: null, latencyMs: null, tokens: null, toolCalls: 0 },
    toolCallLimit: CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS,
    version: 1,
  };
  return receipt;
}

export function validateCortexAgentGovernanceReceipt(value: unknown): CortexAgentGovernanceReceiptValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: ["receipt must be an object"], ok: false };
  const receipt = value as Partial<CortexAgentGovernanceReceipt>;
  for (const key of ["id", "taskId", "correlationId", "actionFingerprint", "shortOperationalReason"] as const) {
    if (typeof receipt[key] !== "string" || receipt[key].trim().length === 0) errors.push(`${key} is required`);
  }
  if (receipt.mode !== CORTEX_AGENT_GOVERNANCE_MODE) errors.push("mode must be shadow-first");
  if (receipt.product !== "1D3X Cortex") errors.push("product must be 1D3X Cortex");
  if (receipt.version !== 1) errors.push("version must be 1");
  if (!isActionKind(receipt.actionKind)) errors.push("actionKind is invalid");
  if (!isDecision(receipt.decision)) errors.push("decision is invalid");
  if (!isStop(receipt.stop)) errors.push("stop is invalid");
  if (!isVisibility(receipt.sourceVisibility)) errors.push("sourceVisibility is invalid");
  if (!isEvidence(receipt.evidence)) errors.push("evidence is invalid");
  if (!isTelemetry(receipt.telemetry)) errors.push("telemetry is invalid");
  if (!Number.isInteger(receipt.toolCallLimit) || (receipt.toolCallLimit ?? 0) < 1 || (receipt.toolCallLimit ?? 0) > CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS) errors.push("toolCallLimit is invalid");
  if ((receipt.telemetry?.toolCalls ?? 0) > (receipt.toolCallLimit ?? 0)) errors.push("toolCalls exceeds toolCallLimit");
  if (typeof receipt.createdAt !== "string" || Number.isNaN(Date.parse(receipt.createdAt))) errors.push("createdAt is invalid");
  if (receipt.sourceVisibility === "public" && (receipt.evidence?.protectedEvidenceCount ?? 0) > 0 && (receipt.decision !== "deny" || receipt.stop !== "abstain")) {
    errors.push("public/protected boundary requires deny and abstain");
  }
  if ((receipt.evidence?.totalCount ?? 0) === 0 && receipt.decision === "allow") errors.push("missing evidence cannot allow a significant action");
  if (receipt.stop === "abstain" && receipt.decision === "allow") errors.push("abstain cannot be an allow decision");
  if (receipt.stop === "request_review" && receipt.decision !== "require_approval") errors.push("request_review requires require_approval");
  return { errors, ok: errors.length === 0 };
}

export function buildCortexAgentGovernanceApproval(input: {
  actionFingerprint: string;
  approvalId: string;
  expiresAt: string;
  issuedAt?: string;
}): CortexAgentGovernanceApproval {
  return {
    actionFingerprint: input.actionFingerprint,
    approvalId: compactId(input.approvalId),
    expiresAt: input.expiresAt,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    scope: "exact-action",
  };
}

export function validateCortexAgentGovernanceApprovalUse(input: {
  actionFingerprint: string;
  approval: CortexAgentGovernanceApproval;
  now?: string;
}): { error?: string; ok: boolean } {
  if (input.approval.scope !== "exact-action") return { error: "approval scope must be exact-action", ok: false };
  if (input.approval.actionFingerprint !== input.actionFingerprint) return { error: "approval fingerprint does not match action", ok: false };
  if (Number.isNaN(Date.parse(input.approval.expiresAt)) || Date.parse(input.approval.expiresAt) <= Date.parse(input.now ?? new Date().toISOString())) {
    return { error: "approval is expired", ok: false };
  }
  return { ok: true };
}

/** In-memory guard used by deterministic tests and future adapter preflight. */
export function createCortexAgentGovernanceApprovalUseGuard() {
  const usedApprovalIds = new Set<string>();
  return {
    consume(input: { actionFingerprint: string; approval: CortexAgentGovernanceApproval; now?: string }) {
      const validation = validateCortexAgentGovernanceApprovalUse(input);
      if (!validation.ok) return { error: validation.error, ok: false, used: false };
      if (usedApprovalIds.has(input.approval.approvalId)) return { error: "approval was already used", ok: false, used: false };
      usedApprovalIds.add(input.approval.approvalId);
      return { ok: true, used: true };
    },
  };
}

/**
 * Durable one-shot claim for a future enforcement adapter. It is intentionally
 * not called by shadow consumers, therefore it cannot alter current routing.
 */
export async function consumeCortexAgentGovernanceApproval(input: {
  actionFingerprint: string;
  approval: CortexAgentGovernanceApproval;
  usedAt?: string;
}): Promise<{ error?: string; ok: boolean; used: boolean }> {
  const validation = validateCortexAgentGovernanceApprovalUse(input);
  if (!validation.ok) return { error: validation.error, ok: false, used: false };
  if (!hasDatabaseUrl()) return { error: "governance approval storage is not configured", ok: false, used: false };
  await ensureReceiptStorage();
  const use: CortexAgentGovernanceApprovalUse = {
    actionFingerprint: input.actionFingerprint,
    approvalId: input.approval.approvalId,
    usedAt: input.usedAt ?? new Date().toISOString(),
  };
  const inserted = await db.$executeRawUnsafe(
    `INSERT INTO "CortexAgentGovernanceApprovalUseLedger" ("approvalId", "actionFingerprint", "useJson", "usedAt") VALUES ($1, $2, $3::jsonb, $4::timestamp) ON CONFLICT ("approvalId") DO NOTHING`,
    use.approvalId,
    use.actionFingerprint,
    JSON.stringify(use),
    use.usedAt,
  );
  return { ok: true, used: inserted === 1 };
}

export async function recordCortexAgentGovernanceShadowReceipt(input: {
  receipt: CortexAgentGovernanceReceipt;
  tenantId: string;
}): Promise<CortexAgentGovernanceReceiptLedgerRecord | null> {
  const validation = validateCortexAgentGovernanceReceipt(input.receipt);
  if (!validation.ok) throw new Error(`Invalid Cortex governance receipt: ${validation.errors.join("; ")}`);
  const record: CortexAgentGovernanceReceiptLedgerRecord = { ...input.receipt, shadowOnly: true, tenantId: compactId(input.tenantId) };
  if (!hasDatabaseUrl()) return null;
  await ensureReceiptStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexAgentGovernanceReceiptLedger" ("id", "tenantId", "taskId", "correlationId", "actionKind", "decision", "actionFingerprint", "receiptJson", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamp) ON CONFLICT ("id") DO NOTHING`,
    record.id, record.tenantId, record.taskId, record.correlationId, record.actionKind, record.decision, record.actionFingerprint, JSON.stringify(record), record.createdAt,
  );
  return record;
}

export async function listCortexAgentGovernanceShadowReceipts(filters: CortexAgentGovernanceReceiptFilters = {}) {
  if (!hasDatabaseUrl()) return [] as CortexAgentGovernanceReceiptLedgerRecord[];
  await ensureReceiptStorage();
  const conditions: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of [["tenantId", filters.tenantId], ["taskId", filters.taskId], ["correlationId", filters.correlationId]] as const) {
    if (!value) continue;
    params.push(value);
    conditions.push(`"${column}" = $${params.length}`);
  }
  params.push(normalizeCortexAgentGovernanceReceiptLimit(filters.limit));
  const rows = await db.$queryRawUnsafe<Array<{ receiptJson: CortexAgentGovernanceReceiptLedgerRecord }>>(
    `SELECT "receiptJson" FROM "CortexAgentGovernanceReceiptLedger" ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY "createdAt" DESC LIMIT $${params.length}`,
    ...params,
  );
  return rows.map((row) => row.receiptJson);
}

export function normalizeCortexAgentGovernanceReceiptLimit(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

export async function recordCortexAgentGovernanceActionTelemetry(input: {
  actionFingerprint: string;
  completedAt?: string;
  outcome: CortexAgentGovernanceActionTelemetryRecord["outcome"];
  receiptId: string;
  telemetry: CortexAgentGovernanceTelemetry;
}) {
  if (!isTelemetry(input.telemetry) || input.telemetry.toolCalls > CORTEX_AGENT_GOVERNANCE_MAX_TOOL_CALLS) throw new Error("Invalid Cortex governance telemetry");
  const completedAt = input.completedAt ?? new Date().toISOString();
  const record: CortexAgentGovernanceActionTelemetryRecord = {
    actionFingerprint: input.actionFingerprint,
    completedAt,
    id: `cortex-governance-telemetry:${input.receiptId}:${hashValue({ completedAt, outcome: input.outcome, telemetry: input.telemetry }).slice(0, 16)}`,
    outcome: input.outcome,
    receiptId: input.receiptId,
    shadowOnly: true,
    telemetry: input.telemetry,
  };
  if (!hasDatabaseUrl()) return null;
  await ensureReceiptStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexAgentGovernanceTelemetryLedger" ("id", "receiptId", "actionFingerprint", "outcome", "telemetryJson", "completedAt") VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamp) ON CONFLICT ("id") DO NOTHING`,
    record.id, record.receiptId, record.actionFingerprint, record.outcome, JSON.stringify(record), record.completedAt,
  );
  return record;
}

function decide(input: CortexAgentGovernanceDecisionInput): { decision: CortexAgentGovernanceDecision; reason: string; stop: CortexAgentGovernanceStop } {
  const evidence = normalizeEvidence(input.evidence);
  if (input.sourceVisibility === "public" && evidence.protectedEvidenceCount > 0) {
    return { decision: "deny", reason: "Public action scope conflicts with protected evidence classification.", stop: "abstain" };
  }
  if (evidence.totalCount === 0) {
    return { decision: "require_approval", reason: "No bounded evidence is available for this significant action.", stop: "abstain" };
  }
  if (evidence.knownGapCount > 0) {
    return { decision: "require_approval", reason: `Bounded context has ${evidence.knownGapCount} known gap(s); review is proposed before action.`, stop: "request_review" };
  }
  return { decision: "allow", reason: "Bounded evidence is available and no known gap requires review in shadow policy.", stop: "continue" };
}

function normalizeEvidence(evidence: CortexAgentGovernanceDecisionInput["evidence"]) {
  return {
    knownGapCount: normalizeCount(evidence.knownGapCount),
    protectedEvidenceCount: normalizeCount(evidence.protectedEvidenceCount),
    totalCount: normalizeCount(evidence.totalCount),
  };
}

function fingerprintAction(value: unknown) {
  return `sha256:${hashValue(value)}`;
}

function compactId(value: string) {
  return value.trim().slice(0, 240);
}

function normalizeCount(value: number) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function isActionKind(value: unknown): value is CortexAgentGovernanceActionKind {
  return value === "external_model_handoff" || value === "editorial_rewrite" || value === "mediahub_report_generation" || value === "publication_delivery" || value === "workforce_review";
}

function isDecision(value: unknown): value is CortexAgentGovernanceDecision {
  return value === "allow" || value === "deny" || value === "require_approval";
}

function isStop(value: unknown): value is CortexAgentGovernanceStop {
  return value === "continue" || value === "abstain" || value === "request_review";
}

function isVisibility(value: unknown): value is CortexAgentGovernanceVisibility {
  return value === "public" || value === "internal" || value === "protected";
}

function isEvidence(value: unknown): value is CortexAgentGovernanceDecisionInput["evidence"] {
  if (!value || typeof value !== "object") return false;
  const evidence = value as Partial<CortexAgentGovernanceDecisionInput["evidence"]>;
  return [evidence.knownGapCount, evidence.protectedEvidenceCount, evidence.totalCount].every((count) => Number.isInteger(count) && (count ?? -1) >= 0);
}

function isTelemetry(value: unknown): value is CortexAgentGovernanceTelemetry {
  if (!value || typeof value !== "object") return false;
  const telemetry = value as Partial<CortexAgentGovernanceTelemetry>;
  return Number.isInteger(telemetry.toolCalls) && (telemetry.toolCalls ?? -1) >= 0 &&
    [telemetry.tokens, telemetry.estimatedCost, telemetry.latencyMs].every((item) => item === null || (typeof item === "number" && Number.isFinite(item) && item >= 0));
}

async function ensureReceiptStorage() {
  receiptStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAgentGovernanceReceiptLedger" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "actionKind" TEXT NOT NULL, "decision" TEXT NOT NULL, "actionFingerprint" TEXT NOT NULL, "receiptJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexAgentGovernanceReceiptLedger_task_idx" ON "CortexAgentGovernanceReceiptLedger"("tenantId", "taskId", "createdAt" DESC)`);
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAgentGovernanceTelemetryLedger" ("id" TEXT NOT NULL PRIMARY KEY, "receiptId" TEXT NOT NULL, "actionFingerprint" TEXT NOT NULL, "outcome" TEXT NOT NULL, "telemetryJson" JSONB NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexAgentGovernanceTelemetryLedger_receipt_idx" ON "CortexAgentGovernanceTelemetryLedger"("receiptId", "completedAt" DESC)`);
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAgentGovernanceApprovalUseLedger" ("approvalId" TEXT NOT NULL PRIMARY KEY, "actionFingerprint" TEXT NOT NULL, "useJson" JSONB NOT NULL, "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  })();
  await receiptStorageReady;
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(sortJson(value))).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortJson(item)]));
}
