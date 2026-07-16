import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexVisibility } from "@/lib/commodity-intelligence-layer";
import type { CortexMarketWorkforcePacket } from "@/lib/cortex-market-workforce-ledger";

export const CORTEX_SGR_LITE_MAX_ITERATIONS = 8;
export const CORTEX_SGR_LITE_MAX_TOOL_CALLS = 6;

export type CortexSgrLiteNextAction =
  | { kind: "retrieve"; sourceScope: "artifact" | "ecosystem-evidence" | "product-adapter"; targetGap: string }
  | { kind: "compare"; comparisonScope: "candidates" | "monitor-index" | "report-variants"; subjectIds: string[] }
  | { kind: "request_review"; reviewScope: "evidence" | "risk-compliance" | "human-approval"; reason: string }
  | { kind: "finalize"; resultScope: "complete" | "limited"; summary: string }
  | { kind: "abstain"; reason: "evidence_insufficient" | "iteration_limit" | "visibility_boundary"; summary: string };

export type CortexSgrLiteCheckpoint = {
  checkpointId: string;
  correlationId: string;
  createdAt: string;
  currentSituation: string;
  enoughEvidence: boolean;
  evidenceGaps: string[];
  iteration: number;
  nextAction: CortexSgrLiteNextAction;
  operationalRationale: string;
  planStatus: "blocked" | "collecting_evidence" | "ready_for_review" | "stopped";
  product: "1D3X Cortex";
  remainingSteps: string[];
  sourceVisibility: Exclude<CortexVisibility, "secret">;
  sourceStatus: {
    assumedCount: number;
    derivedCount: number;
    observedCount: number;
    recommendedCount: number;
  };
  stopReason?: "evidence_insufficient" | "iteration_limit" | "limited_result" | "review_required" | "visibility_boundary";
  taskId: string;
  telemetry: {
    estimatedCostUsd: number | null;
    latencyMs: number | null;
    model: string | null;
    toolCalls: number | null;
  };
  toolCallLimit: number;
  version: 1;
};

export type CortexSgrLiteCheckpointValidation = { errors: string[]; ok: boolean };

export type CortexSgrLiteCheckpointLedgerRecord = CortexSgrLiteCheckpoint & {
  id: string;
  shadowOnly: true;
  tenantId: string;
};

export type CortexSgrLiteCheckpointFilters = {
  correlationId?: string | null;
  limit?: number | null;
  taskId?: string | null;
  tenantId?: string | null;
};

export type CortexSgrLiteCheckpointInput = Omit<CortexSgrLiteCheckpoint, "checkpointId" | "product" | "version">;

let checkpointStorageReady: Promise<void> | null = null;

export function buildCortexSgrLiteCheckpoint(input: CortexSgrLiteCheckpointInput): CortexSgrLiteCheckpoint {
  const normalized = normalizeCheckpointInput(input);
  const checkpointId = `cortex-sgr-lite:${normalized.taskId}:${hashValue(normalized).slice(0, 20)}`;
  return {
    ...normalized,
    checkpointId,
    product: "1D3X Cortex",
    version: 1,
  };
}

export function buildCortexSgrLiteCheckpointFromWorkforcePacket(input: {
  createdAt?: string;
  iteration?: number;
  packet: CortexMarketWorkforcePacket;
  sourceVisibility?: Exclude<CortexVisibility, "secret">;
}): CortexSgrLiteCheckpoint {
  const evidenceGaps = collectWorkforceGaps(input.packet);
  const observedCount = input.packet.observed.length;
  const enoughEvidence = observedCount > 0 && evidenceGaps.length === 0;
  const nextAction = chooseWorkforceNextAction({ evidenceGaps, packet: input.packet, enoughEvidence });
  const stopReason = nextAction.kind === "abstain"
    ? nextAction.reason
    : nextAction.kind === "finalize" && nextAction.resultScope === "limited"
      ? "limited_result"
      : nextAction.kind === "request_review"
        ? "review_required"
        : undefined;
  return buildCortexSgrLiteCheckpoint({
    correlationId: input.packet.correlationId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    currentSituation: compactText(input.packet.candidates[0]?.hypothesis ?? input.packet.trigger, 500),
    enoughEvidence,
    evidenceGaps,
    iteration: input.iteration ?? 1,
    nextAction,
    operationalRationale: buildWorkforceRationale({ evidenceGaps, observedCount, packet: input.packet, nextAction }),
    planStatus: nextAction.kind === "abstain" || (nextAction.kind === "finalize" && nextAction.resultScope === "limited")
      ? "stopped"
      : evidenceGaps.length > 0
        ? "collecting_evidence"
        : "ready_for_review",
    remainingSteps: buildRemainingSteps(nextAction),
    sourceVisibility: input.sourceVisibility ?? "protected",
    sourceStatus: {
      assumedCount: input.packet.assumed.length,
      derivedCount: input.packet.derived.length,
      observedCount,
      recommendedCount: input.packet.recommended.length,
    },
    stopReason,
    taskId: input.packet.taskId,
    telemetry: { estimatedCostUsd: null, latencyMs: null, model: null, toolCalls: null },
    toolCallLimit: CORTEX_SGR_LITE_MAX_TOOL_CALLS,
  });
}

export function validateCortexSgrLiteCheckpoint(value: unknown): CortexSgrLiteCheckpointValidation {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { errors: ["checkpoint must be an object"], ok: false };
  const checkpoint = value as Partial<CortexSgrLiteCheckpoint>;
  for (const key of ["checkpointId", "taskId", "correlationId", "currentSituation", "operationalRationale"] as const) {
    if (typeof checkpoint[key] !== "string" || checkpoint[key].trim().length === 0) errors.push(`${key} is required`);
  }
  if (checkpoint.product !== "1D3X Cortex") errors.push("product must be 1D3X Cortex");
  if (checkpoint.version !== 1) errors.push("version must be 1");
  if (typeof checkpoint.createdAt !== "string" || Number.isNaN(Date.parse(checkpoint.createdAt))) errors.push("createdAt is invalid");
  if (!Number.isInteger(checkpoint.iteration) || (checkpoint.iteration ?? 0) < 1 || (checkpoint.iteration ?? 0) > CORTEX_SGR_LITE_MAX_ITERATIONS) errors.push("iteration is outside allowed range");
  if (!isPlanStatus(checkpoint.planStatus)) errors.push("planStatus is invalid");
  if (!isVisibility(checkpoint.sourceVisibility)) errors.push("sourceVisibility is invalid");
  if (!isSourceStatus(checkpoint.sourceStatus)) errors.push("sourceStatus is invalid");
  if (!Array.isArray(checkpoint.evidenceGaps) || checkpoint.evidenceGaps.some((gap) => typeof gap !== "string" || gap.trim().length === 0)) errors.push("evidenceGaps is invalid");
  if (!Array.isArray(checkpoint.remainingSteps) || checkpoint.remainingSteps.some((step) => typeof step !== "string" || step.trim().length === 0)) errors.push("remainingSteps is invalid");
  if (typeof checkpoint.enoughEvidence !== "boolean") errors.push("enoughEvidence is invalid");
  if (!isTelemetry(checkpoint.telemetry)) errors.push("telemetry is invalid");
  if (!Number.isInteger(checkpoint.toolCallLimit) || (checkpoint.toolCallLimit ?? 0) < 1 || (checkpoint.toolCallLimit ?? 0) > CORTEX_SGR_LITE_MAX_TOOL_CALLS) {
    errors.push("toolCallLimit is outside allowed range");
  }
  if (checkpoint.telemetry?.toolCalls !== null && checkpoint.telemetry?.toolCalls !== undefined && checkpoint.telemetry.toolCalls > (checkpoint.toolCallLimit ?? 0)) {
    errors.push("toolCalls exceeds toolCallLimit");
  }
  if (!isNextAction(checkpoint.nextAction)) errors.push("nextAction is invalid");
  if (checkpoint.sourceVisibility === "public" && checkpoint.nextAction?.kind === "retrieve" && checkpoint.nextAction.sourceScope === "product-adapter") {
    errors.push("public checkpoint cannot retrieve from a product adapter");
  }
  if (checkpoint.nextAction?.kind === "finalize" && !checkpoint.enoughEvidence && checkpoint.nextAction.resultScope !== "limited") {
    errors.push("finalize requires enoughEvidence or a limited result");
  }
  if (!checkpoint.enoughEvidence && checkpoint.nextAction?.kind === "finalize" && checkpoint.nextAction.resultScope !== "limited") {
    errors.push("insufficient evidence cannot finalize a complete result");
  }
  if (checkpoint.nextAction?.kind === "abstain" && checkpoint.stopReason !== checkpoint.nextAction.reason) {
    errors.push("abstain requires a matching stopReason");
  }
  if (checkpoint.nextAction?.kind === "request_review" && checkpoint.stopReason !== "review_required") {
    errors.push("request_review requires review_required stopReason");
  }
  if (checkpoint.nextAction?.kind === "finalize" && checkpoint.nextAction.resultScope === "limited" && checkpoint.stopReason !== "limited_result") {
    errors.push("limited finalize requires limited_result stopReason");
  }
  if ((checkpoint.iteration ?? 0) === CORTEX_SGR_LITE_MAX_ITERATIONS && checkpoint.nextAction?.kind !== "abstain") {
    errors.push("iteration limit requires abstain");
  }
  return { errors, ok: errors.length === 0 };
}

export function buildCortexSgrLiteCheckpointLedgerRecord(input: {
  checkpoint: CortexSgrLiteCheckpoint;
  tenantId: string;
}): CortexSgrLiteCheckpointLedgerRecord {
  return {
    ...input.checkpoint,
    id: `cortex-sgr-lite-ledger:${input.tenantId}:${input.checkpoint.checkpointId}`,
    shadowOnly: true,
    tenantId: input.tenantId,
  };
}

export async function persistCortexSgrLiteCheckpoint(input: {
  checkpoint: CortexSgrLiteCheckpoint;
  tenantId: string;
}) {
  const validation = validateCortexSgrLiteCheckpoint(input.checkpoint);
  if (!validation.ok) throw new Error(`Invalid Cortex SGR-lite checkpoint: ${validation.errors.join("; ")}`);
  if (!hasDatabaseUrl()) return null;
  const record = buildCortexSgrLiteCheckpointLedgerRecord(input);
  await ensureCheckpointStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexSgrLiteCheckpointLedger" ("id", "tenantId", "taskId", "correlationId", "nextActionKind", "visibility", "checkpointJson", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamp) ON CONFLICT ("id") DO NOTHING`,
    record.id,
    record.tenantId,
    record.taskId,
    record.correlationId,
    record.nextAction.kind,
    record.sourceVisibility,
    JSON.stringify(record),
    record.createdAt,
  );
  return record;
}

export async function listCortexSgrLiteCheckpoints(filters: CortexSgrLiteCheckpointFilters = {}) {
  if (!hasDatabaseUrl()) return [] as CortexSgrLiteCheckpointLedgerRecord[];
  await ensureCheckpointStorage();
  const query = buildCheckpointListQuery(filters);
  const rows = await db.$queryRawUnsafe<Array<{ checkpointJson: CortexSgrLiteCheckpointLedgerRecord }>>(query.sql, ...query.params);
  return rows.map((row) => row.checkpointJson);
}

export function normalizeCortexSgrLiteListLimit(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(value as number)));
}

function chooseWorkforceNextAction(input: {
  evidenceGaps: string[];
  enoughEvidence: boolean;
  packet: CortexMarketWorkforcePacket;
}): CortexSgrLiteNextAction {
  if (input.evidenceGaps.length > 0 && input.packet.observed.length === 0) {
    return { kind: "abstain", reason: "evidence_insufficient", summary: "No observed evidence is available for a bounded next step." };
  }
  if (input.evidenceGaps.length > 0) {
    return { kind: "retrieve", sourceScope: "ecosystem-evidence", targetGap: input.evidenceGaps[0] };
  }
  if (input.packet.candidates.length > 1) {
    return { kind: "compare", comparisonScope: "candidates", subjectIds: input.packet.candidates.map((candidate) => candidate.candidateId).slice(0, 8) };
  }
  if (input.packet.humanApproval.required || input.packet.candidates.some((candidate) => candidate.officerReview === "pending")) {
    return { kind: "request_review", reviewScope: "risk-compliance", reason: "Existing workforce packet requires officer or human review." };
  }
  return {
    kind: "finalize",
    resultScope: input.enoughEvidence ? "complete" : "limited",
    summary: input.enoughEvidence ? "Evidence is sufficient for the bounded task." : "Only a limited, explicitly gap-bound result is available.",
  };
}

function collectWorkforceGaps(packet: CortexMarketWorkforcePacket) {
  return Array.from(new Set([
    ...packet.assumed.filter((item) => /^unresolved gap:/i.test(item)).map((item) => item.replace(/^unresolved gap:\s*/i, "")),
    ...packet.candidates.flatMap((candidate) => candidate.missingData),
  ].map((item) => item.trim()).filter(Boolean))).sort();
}

function buildWorkforceRationale(input: {
  evidenceGaps: string[];
  nextAction: CortexSgrLiteNextAction;
  observedCount: number;
  packet: CortexMarketWorkforcePacket;
}) {
  return compactText(`observed=${input.observedCount}; gaps=${input.evidenceGaps.length}; candidates=${input.packet.candidates.length}; approvalRequired=${input.packet.humanApproval.required}; nextAction=${input.nextAction.kind}`, 500);
}

function buildRemainingSteps(nextAction: CortexSgrLiteNextAction) {
  if (nextAction.kind === "retrieve") return ["Re-check the named evidence gap before comparison or review."];
  if (nextAction.kind === "compare") return ["Compare the listed candidates against the existing evidence and counterevidence."];
  if (nextAction.kind === "request_review") return ["Obtain the required bounded review; do not execute or publish from this checkpoint."];
  return [];
}

function normalizeCheckpointInput(input: CortexSgrLiteCheckpointInput): CortexSgrLiteCheckpointInput {
  return {
    ...input,
    correlationId: input.correlationId.trim(),
    currentSituation: compactText(input.currentSituation, 1_000),
    evidenceGaps: Array.from(new Set(input.evidenceGaps.map((gap) => compactText(gap, 400)).filter(Boolean))).sort(),
    operationalRationale: compactText(input.operationalRationale, 1_000),
    remainingSteps: Array.from(new Set(input.remainingSteps.map((step) => compactText(step, 400)).filter(Boolean))),
    taskId: input.taskId.trim(),
  };
}

async function ensureCheckpointStorage() {
  checkpointStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexSgrLiteCheckpointLedger" ("id" TEXT NOT NULL PRIMARY KEY, "tenantId" TEXT NOT NULL, "taskId" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "nextActionKind" TEXT NOT NULL, "visibility" TEXT NOT NULL, "checkpointJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexSgrLiteCheckpointLedger_tenant_task_idx" ON "CortexSgrLiteCheckpointLedger"("tenantId", "taskId", "createdAt" DESC)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexSgrLiteCheckpointLedger_correlation_idx" ON "CortexSgrLiteCheckpointLedger"("correlationId", "createdAt" DESC)`);
  })();
  await checkpointStorageReady;
}

function buildCheckpointListQuery(filters: CortexSgrLiteCheckpointFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of [["tenantId", filters.tenantId], ["taskId", filters.taskId], ["correlationId", filters.correlationId]] as const) {
    if (!value) continue;
    params.push(value);
    conditions.push(`"${column}" = $${params.length}`);
  }
  params.push(normalizeCortexSgrLiteListLimit(filters.limit));
  return {
    params,
    sql: `SELECT "checkpointJson" FROM "CortexSgrLiteCheckpointLedger" ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY "createdAt" DESC LIMIT $${params.length}`,
  };
}

function isPlanStatus(value: unknown): value is CortexSgrLiteCheckpoint["planStatus"] {
  return value === "blocked" || value === "collecting_evidence" || value === "ready_for_review" || value === "stopped";
}

function isVisibility(value: unknown): value is Exclude<CortexVisibility, "secret"> {
  return value === "public" || value === "internal" || value === "protected";
}

function isTelemetry(value: unknown): value is CortexSgrLiteCheckpoint["telemetry"] {
  if (!value || typeof value !== "object") return false;
  const telemetry = value as Partial<CortexSgrLiteCheckpoint["telemetry"]>;
  return (telemetry.model === null || typeof telemetry.model === "string") &&
    [telemetry.estimatedCostUsd, telemetry.latencyMs, telemetry.toolCalls].every((item) => item === null || (typeof item === "number" && Number.isFinite(item) && item >= 0));
}

function isSourceStatus(value: unknown): value is CortexSgrLiteCheckpoint["sourceStatus"] {
  if (!value || typeof value !== "object") return false;
  const sourceStatus = value as Partial<CortexSgrLiteCheckpoint["sourceStatus"]>;
  return [sourceStatus.observedCount, sourceStatus.derivedCount, sourceStatus.assumedCount, sourceStatus.recommendedCount]
    .every((count) => Number.isInteger(count) && (count ?? -1) >= 0);
}

function isNextAction(value: unknown): value is CortexSgrLiteNextAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Partial<CortexSgrLiteNextAction>;
  if (action.kind === "retrieve") return (action.sourceScope === "artifact" || action.sourceScope === "ecosystem-evidence" || action.sourceScope === "product-adapter") && typeof action.targetGap === "string" && Boolean(action.targetGap.trim());
  if (action.kind === "compare") return (action.comparisonScope === "candidates" || action.comparisonScope === "monitor-index" || action.comparisonScope === "report-variants") && Array.isArray(action.subjectIds) && action.subjectIds.length > 0 && action.subjectIds.every((item) => typeof item === "string" && Boolean(item.trim()));
  if (action.kind === "request_review") return (action.reviewScope === "evidence" || action.reviewScope === "risk-compliance" || action.reviewScope === "human-approval") && typeof action.reason === "string" && Boolean(action.reason.trim());
  if (action.kind === "finalize") return (action.resultScope === "complete" || action.resultScope === "limited") && typeof action.summary === "string" && Boolean(action.summary.trim());
  return action.kind === "abstain" && (action.reason === "evidence_insufficient" || action.reason === "iteration_limit" || action.reason === "visibility_boundary") && typeof action.summary === "string" && Boolean(action.summary.trim());
}

function compactText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(sortJson(value))).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortJson(item)]));
}
