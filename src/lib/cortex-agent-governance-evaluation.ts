import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  buildCortexAgentGovernanceReceipt,
  validateCortexAgentGovernanceReceipt,
  type CortexAgentGovernanceDecision,
  type CortexAgentGovernanceDecisionInput,
  type CortexAgentGovernanceStop,
} from "@/lib/cortex-agent-governance-capability";

export type CortexAgentGovernanceReplayFixture = {
  baseline: {
    estimatedCost: number | null;
    factualSafety: "failed" | "passed" | "unknown";
    latencyMs: number | null;
    toolCalls: number | null;
  };
  expected: { decision: CortexAgentGovernanceDecision; stop: CortexAgentGovernanceStop };
  id: string;
  input: CortexAgentGovernanceDecisionInput;
};

export type CortexAgentGovernanceEvaluationRecord = {
  abstentionQuality: "acceptable" | "not_applicable" | "needs_review";
  baseline: CortexAgentGovernanceReplayFixture["baseline"];
  decisionCorrect: boolean;
  factualSafety: { passed: boolean; reasons: string[] };
  fixtureId: string;
  id: string;
  limitations: string[];
  measurements: {
    baselineEstimatedCost: number | null;
    baselineLatencyMs: number | null;
    baselineToolCalls: number | null;
    governanceLatencyMs: number;
    proposedEstimatedCost: null;
    proposedToolCalls: 0;
    unnecessaryToolCalls: null;
  };
  proposed: { decision: CortexAgentGovernanceDecision; stop: CortexAgentGovernanceStop };
  runId: string;
  shadowOnly: true;
};

let storageReady: Promise<void> | null = null;

export async function runCortexAgentGovernanceEvaluation(input: {
  fixtures: CortexAgentGovernanceReplayFixture[];
  persist?: boolean;
  runId?: string;
}) {
  const runId = input.runId ?? `cortex-governance-shadow:${new Date().toISOString().slice(0, 10)}:${hashValue(input.fixtures.map((fixture) => fixture.id)).slice(0, 10)}`;
  const records = input.fixtures.map((fixture) => evaluateCortexAgentGovernanceReplayFixture({ fixture, runId }));
  if (input.persist !== false && hasDatabaseUrl()) {
    await ensureStorage();
    for (const record of records) await persistRecord(record);
  }
  return {
    records,
    runId,
    summary: {
      failed: records.filter((record) => !record.factualSafety.passed || !record.decisionCorrect).length,
      passed: records.filter((record) => record.factualSafety.passed && record.decisionCorrect).length,
      total: records.length,
    },
  };
}

export function evaluateCortexAgentGovernanceReplayFixture(input: {
  fixture: CortexAgentGovernanceReplayFixture;
  runId: string;
}): CortexAgentGovernanceEvaluationRecord {
  const startedAt = performance.now();
  const receipt = buildCortexAgentGovernanceReceipt(input.fixture.input);
  const governanceLatencyMs = Math.round((performance.now() - startedAt) * 1_000) / 1_000;
  const validation = validateCortexAgentGovernanceReceipt(receipt);
  const decisionCorrect = receipt.decision === input.fixture.expected.decision && receipt.stop === input.fixture.expected.stop;
  return {
    abstentionQuality: receipt.stop !== "abstain"
      ? "not_applicable"
      : receipt.decision === "allow" ? "needs_review" : "acceptable",
    baseline: input.fixture.baseline,
    decisionCorrect,
    factualSafety: { passed: validation.ok, reasons: validation.errors },
    fixtureId: input.fixture.id,
    id: `cortex-governance-eval:${input.runId}:${input.fixture.id}:${hashValue(receipt).slice(0, 12)}`,
    limitations: [
      "This is deterministic shadow policy evaluation, not an execution or routing test.",
      "Governance does not call a tool; cost, full-action latency and unnecessary tool calls remain unavailable until real receipts accumulate.",
      "No public response, protected retrieval, publication or delivery changed during this evaluation.",
    ],
    measurements: {
      baselineEstimatedCost: input.fixture.baseline.estimatedCost,
      baselineLatencyMs: input.fixture.baseline.latencyMs,
      baselineToolCalls: input.fixture.baseline.toolCalls,
      governanceLatencyMs,
      proposedEstimatedCost: null,
      proposedToolCalls: 0,
      unnecessaryToolCalls: null,
    },
    proposed: { decision: receipt.decision, stop: receipt.stop },
    runId: input.runId,
    shadowOnly: true,
  };
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexAgentGovernanceEvaluationLedger" ("id" TEXT NOT NULL PRIMARY KEY, "runId" TEXT NOT NULL, "fixtureId" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexAgentGovernanceEvaluationLedger_run_idx" ON "CortexAgentGovernanceEvaluationLedger"("runId", "fixtureId")`);
  })();
  await storageReady;
}

async function persistRecord(record: CortexAgentGovernanceEvaluationRecord) {
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexAgentGovernanceEvaluationLedger" ("id", "runId", "fixtureId", "recordJson") VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT ("id") DO NOTHING`,
    record.id, record.runId, record.fixtureId, JSON.stringify(record),
  );
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
