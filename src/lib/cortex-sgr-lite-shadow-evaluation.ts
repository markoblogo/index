import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  buildCortexSgrLiteCheckpoint,
  validateCortexSgrLiteCheckpoint,
  type CortexSgrLiteCheckpoint,
  type CortexSgrLiteCheckpointInput,
  type CortexSgrLiteNextAction,
} from "@/lib/cortex-sgr-lite";

export type CortexSgrLiteReplayFixture = {
  baseline: {
    estimatedCostUsd: number | null;
    factualSafety: "passed" | "failed" | "unknown";
    latencyMs: number | null;
    outcome: string;
    reviewerDecision: "approved" | "rejected" | "unavailable";
    toolCalls: number | null;
  };
  checkpoint: CortexSgrLiteCheckpointInput;
  expected: {
    nextActionKind: CortexSgrLiteNextAction["kind"];
    stopReason?: CortexSgrLiteCheckpoint["stopReason"];
  };
  id: string;
};

export type CortexSgrLiteShadowEvaluationRecord = {
  baseline: CortexSgrLiteReplayFixture["baseline"];
  checkpoint: Pick<CortexSgrLiteCheckpoint, "checkpointId" | "nextAction" | "stopReason" | "taskId">;
  divergence: string[];
  factualSafety: { passed: boolean; reasons: string[] };
  fixtureId: string;
  id: string;
  limitations: string[];
  measurements: {
    baselineEstimatedCostUsd: number | null;
    baselineLatencyMs: number | null;
    baselineToolCalls: number | null;
    checkpointBuildLatencyMs: number;
    redundantToolCalls: null;
    sgrLiteEstimatedCostUsd: null;
    sgrLiteToolCalls: 0;
    totalAgentLatencyMs: null;
  };
  reviewerDecision: CortexSgrLiteReplayFixture["baseline"]["reviewerDecision"];
  runId: string;
  shadowOnly: true;
  stopDecision: { correct: boolean; expected: CortexSgrLiteReplayFixture["expected"]; proposed: CortexSgrLiteNextAction["kind"] };
};

let storageReady: Promise<void> | null = null;

/**
 * Deterministic shadow evaluator. It validates only the checkpoint layer;
 * it does not call models, tools, delivery channels, or routing paths.
 */
export async function runCortexSgrLiteShadowEvaluation(input: {
  fixtures: CortexSgrLiteReplayFixture[];
  persist?: boolean;
  runId?: string;
}): Promise<{ records: CortexSgrLiteShadowEvaluationRecord[]; runId: string; summary: { failed: number; passed: number; total: number } }> {
  const runId = input.runId ?? `cortex-sgr-lite-shadow:${new Date().toISOString().slice(0, 10)}:${hashValue(input.fixtures.map((fixture) => fixture.id)).slice(0, 10)}`;
  const records = input.fixtures.map((fixture) => evaluateCortexSgrLiteReplayFixture({ fixture, runId }));
  if (input.persist !== false && hasDatabaseUrl()) {
    await ensureStorage();
    for (const record of records) await persistRecord(record);
  }
  return {
    records,
    runId,
    summary: {
      failed: records.filter((record) => !record.factualSafety.passed || !record.stopDecision.correct).length,
      passed: records.filter((record) => record.factualSafety.passed && record.stopDecision.correct).length,
      total: records.length,
    },
  };
}

export function evaluateCortexSgrLiteReplayFixture(input: {
  fixture: CortexSgrLiteReplayFixture;
  runId: string;
}): CortexSgrLiteShadowEvaluationRecord {
  const startedAt = performance.now();
  const checkpoint = buildCortexSgrLiteCheckpoint(input.fixture.checkpoint);
  const checkpointBuildLatencyMs = Math.round((performance.now() - startedAt) * 1_000) / 1_000;
  const validation = validateCortexSgrLiteCheckpoint(checkpoint);
  const divergence: string[] = [];
  if (checkpoint.nextAction.kind !== input.fixture.expected.nextActionKind) divergence.push(`nextAction expected ${input.fixture.expected.nextActionKind}, received ${checkpoint.nextAction.kind}`);
  if (input.fixture.expected.stopReason && checkpoint.stopReason !== input.fixture.expected.stopReason) divergence.push(`stopReason expected ${input.fixture.expected.stopReason}, received ${checkpoint.stopReason ?? "none"}`);

  return {
    baseline: input.fixture.baseline,
    checkpoint: {
      checkpointId: checkpoint.checkpointId,
      nextAction: checkpoint.nextAction,
      stopReason: checkpoint.stopReason,
      taskId: checkpoint.taskId,
    },
    divergence,
    factualSafety: { passed: validation.ok, reasons: validation.errors },
    fixtureId: input.fixture.id,
    id: `cortex-sgr-lite-eval:${input.runId}:${input.fixture.id}:${hashValue(checkpoint).slice(0, 12)}`,
    limitations: [
      "This evaluates deterministic checkpoint policy, not a full model or tool execution.",
      "No tool calls, model cost, total agent latency, or redundant-call count are available from this replay layer.",
      "No output was routed, published, or delivered while evaluating this fixture.",
    ],
    measurements: {
      baselineEstimatedCostUsd: input.fixture.baseline.estimatedCostUsd,
      baselineLatencyMs: input.fixture.baseline.latencyMs,
      baselineToolCalls: input.fixture.baseline.toolCalls,
      checkpointBuildLatencyMs,
      redundantToolCalls: null,
      sgrLiteEstimatedCostUsd: null,
      sgrLiteToolCalls: 0,
      totalAgentLatencyMs: null,
    },
    reviewerDecision: input.fixture.baseline.reviewerDecision,
    runId: input.runId,
    shadowOnly: true,
    stopDecision: {
      correct: divergence.length === 0,
      expected: input.fixture.expected,
      proposed: checkpoint.nextAction.kind,
    },
  };
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexSgrLiteShadowEvaluationLedger" ("id" TEXT NOT NULL PRIMARY KEY, "runId" TEXT NOT NULL, "fixtureId" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexSgrLiteShadowEvaluationLedger_run_idx" ON "CortexSgrLiteShadowEvaluationLedger"("runId", "fixtureId")`);
  })();
  await storageReady;
}

async function persistRecord(record: CortexSgrLiteShadowEvaluationRecord) {
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexSgrLiteShadowEvaluationLedger" ("id", "runId", "fixtureId", "recordJson") VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT ("id") DO NOTHING`,
    record.id,
    record.runId,
    record.fixtureId,
    JSON.stringify(record),
  );
}

function hashValue(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
