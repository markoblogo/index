import { describe, expect, it } from "vitest";
import {
  buildCortexSgrLiteCheckpoint,
  buildCortexSgrLiteCheckpointFromWorkforcePacket,
  CORTEX_SGR_LITE_MAX_ITERATIONS,
  CORTEX_SGR_LITE_MAX_TOOL_CALLS,
  validateCortexSgrLiteCheckpoint,
  type CortexSgrLiteCheckpointInput,
} from "@/lib/cortex-sgr-lite";
import type { CortexMarketWorkforcePacket } from "@/lib/cortex-market-workforce-ledger";

function input(overrides: Partial<CortexSgrLiteCheckpointInput> = {}): CortexSgrLiteCheckpointInput {
  return {
    correlationId: "correlation-1",
    createdAt: "2026-07-16T08:00:00.000Z",
    currentSituation: "Bounded task state.",
    enoughEvidence: true,
    evidenceGaps: [],
    iteration: 1,
    nextAction: { kind: "finalize", resultScope: "complete", summary: "Evidence is sufficient." },
    operationalRationale: "Validated operational summary.",
    planStatus: "ready_for_review",
    remainingSteps: [],
    sourceStatus: { assumedCount: 0, derivedCount: 1, observedCount: 1, recommendedCount: 0 },
    sourceVisibility: "protected",
    taskId: "task-1",
    telemetry: { estimatedCostUsd: null, latencyMs: null, model: null, toolCalls: null },
    toolCallLimit: CORTEX_SGR_LITE_MAX_TOOL_CALLS,
    ...overrides,
  };
}

function packet(overrides: Partial<CortexMarketWorkforcePacket> = {}): CortexMarketWorkforcePacket {
  return {
    assumed: [],
    blockedBy: [],
    candidates: [{ candidateId: "candidate-1", counterevidence: [], evidence: [], evidenceChecklist: [], hypothesis: "Hypothesis", missingData: [], officerReview: "accepted", probabilityUse: "ranking_hint_only" }],
    correlationId: "workforce-correlation",
    derived: [],
    diversityMode: "off",
    humanApproval: { required: false, status: "not_required" },
    observed: [{ capturedAt: "2026-07-16T08:00:00.000Z", id: "evidence-1", sourceId: "source-1" }],
    outcome: "pending",
    packetType: "market-workforce",
    recommended: [],
    roles: ["analyst"],
    taskId: "workforce-task",
    trigger: "test",
    ...overrides,
  };
}

describe("Cortex SGR-lite checkpoint", () => {
  it("builds a valid bounded checkpoint without hidden reasoning", () => {
    const checkpoint = buildCortexSgrLiteCheckpoint(input());
    expect(validateCortexSgrLiteCheckpoint(checkpoint)).toEqual({ errors: [], ok: true });
    expect(checkpoint.operationalRationale).toContain("Validated operational");
  });

  it("rejects complete finalization without enough evidence", () => {
    const checkpoint = buildCortexSgrLiteCheckpoint(input({ enoughEvidence: false }));
    expect(validateCortexSgrLiteCheckpoint(checkpoint).errors).toContain("finalize requires enoughEvidence or a limited result");
  });

  it("enforces iteration and tool-call limits", () => {
    const checkpoint = buildCortexSgrLiteCheckpoint(input({
      iteration: CORTEX_SGR_LITE_MAX_ITERATIONS,
      nextAction: { kind: "compare", comparisonScope: "candidates", subjectIds: ["candidate-1"] },
      telemetry: { estimatedCostUsd: null, latencyMs: null, model: null, toolCalls: CORTEX_SGR_LITE_MAX_TOOL_CALLS + 1 },
    }));
    expect(validateCortexSgrLiteCheckpoint(checkpoint).errors).toEqual(expect.arrayContaining([
      "toolCalls exceeds toolCallLimit",
      "iteration limit requires abstain",
    ]));
  });

  it("rejects a public checkpoint that reaches into a product adapter", () => {
    const checkpoint = buildCortexSgrLiteCheckpoint(input({
      nextAction: { kind: "retrieve", sourceScope: "product-adapter", targetGap: "protected market observation" },
      sourceVisibility: "public",
    }));
    expect(validateCortexSgrLiteCheckpoint(checkpoint).errors).toContain("public checkpoint cannot retrieve from a product adapter");
  });

  it("maps an unresolved workforce gap to retrieval", () => {
    const checkpoint = buildCortexSgrLiteCheckpointFromWorkforcePacket({ packet: packet({ assumed: ["unresolved gap: source freshness"] }) });
    expect(checkpoint.nextAction).toMatchObject({ kind: "retrieve", targetGap: "source freshness" });
    expect(checkpoint.sourceStatus).toEqual({ assumedCount: 1, derivedCount: 0, observedCount: 1, recommendedCount: 0 });
  });

  it("abstains when a workforce packet has no observed evidence", () => {
    const checkpoint = buildCortexSgrLiteCheckpointFromWorkforcePacket({ packet: packet({ observed: [], assumed: ["unresolved gap: source freshness"] }) });
    expect(checkpoint.nextAction).toMatchObject({ kind: "abstain", reason: "evidence_insufficient" });
    expect(validateCortexSgrLiteCheckpoint(checkpoint)).toEqual({ errors: [], ok: true });
  });
});
