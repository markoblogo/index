import { CORTEX_SGR_LITE_MAX_ITERATIONS, CORTEX_SGR_LITE_MAX_TOOL_CALLS, type CortexSgrLiteCheckpointInput } from "@/lib/cortex-sgr-lite";
import type { CortexSgrLiteReplayFixture } from "@/lib/cortex-sgr-lite-shadow-evaluation";

const capturedAt = "2026-07-16T08:00:00.000Z";

function checkpoint(input: Partial<CortexSgrLiteCheckpointInput> & Pick<CortexSgrLiteCheckpointInput, "taskId" | "correlationId" | "nextAction">): CortexSgrLiteCheckpointInput {
  const { correlationId, nextAction, taskId, ...overrides } = input;
  const stopped = nextAction.kind === "abstain" || (nextAction.kind === "finalize" && nextAction.resultScope === "limited");
  return {
    correlationId,
    createdAt: capturedAt,
    currentSituation: "Saved replay task for SGR-lite checkpoint evaluation.",
    enoughEvidence: false,
    evidenceGaps: [],
    iteration: 1,
    nextAction,
    operationalRationale: "Operational state only; no hidden reasoning is stored.",
    planStatus: stopped ? "stopped" : "collecting_evidence",
    remainingSteps: nextAction.kind === "retrieve" ? ["Retrieve the named bounded evidence gap."] : [],
    sourceStatus: { assumedCount: 0, derivedCount: 0, observedCount: 1, recommendedCount: 0 },
    sourceVisibility: "protected",
    stopReason: undefined,
    taskId,
    telemetry: { estimatedCostUsd: null, latencyMs: null, model: null, toolCalls: null },
    toolCallLimit: CORTEX_SGR_LITE_MAX_TOOL_CALLS,
    ...overrides,
  };
}

function fixture(id: string, checkpointInput: CortexSgrLiteCheckpointInput, expected: CortexSgrLiteReplayFixture["expected"]): CortexSgrLiteReplayFixture {
  return {
    baseline: { estimatedCostUsd: null, factualSafety: "unknown", latencyMs: null, outcome: "saved replay reference", reviewerDecision: "unavailable", toolCalls: null },
    checkpoint: checkpointInput,
    expected,
    id,
  };
}

/** Saved policy replays from existing Cortex task families. They are offline-only. */
export const cortexSgrLiteReplayFixtures: CortexSgrLiteReplayFixture[] = [
  fixture("mediahub-daily-missing-source", checkpoint({
    correlationId: "mediahub-daily:missing-source", taskId: "mediahub-daily:missing-source",
    evidenceGaps: ["benchmark source freshness"],
    nextAction: { kind: "retrieve", sourceScope: "ecosystem-evidence", targetGap: "benchmark source freshness" },
  }), { nextActionKind: "retrieve" }),
  fixture("mediahub-weekly-stale-context", checkpoint({
    correlationId: "mediahub-weekly:stale-context", taskId: "mediahub-weekly:stale-context",
    evidenceGaps: ["weekly source timestamp"],
    nextAction: { kind: "retrieve", sourceScope: "artifact", targetGap: "weekly source timestamp" },
  }), { nextActionKind: "retrieve" }),
  fixture("mediahub-monthly-review", checkpoint({
    correlationId: "mediahub-monthly:review", taskId: "mediahub-monthly:review",
    nextAction: { kind: "request_review", reviewScope: "human-approval", reason: "Monthly synthesis requires editor approval." },
    planStatus: "ready_for_review", stopReason: "review_required",
  }), { nextActionKind: "request_review", stopReason: "review_required" }),
  fixture("ssi-input-divergence", checkpoint({
    correlationId: "ssi:input-divergence", taskId: "ssi:input-divergence", enoughEvidence: true,
    nextAction: { kind: "compare", comparisonScope: "candidates", subjectIds: ["respondent-a", "respondent-b"] },
    planStatus: "ready_for_review",
  }), { nextActionKind: "compare" }),
  fixture("ssi-telegram-missing-index", checkpoint({
    correlationId: "ssi:telegram-missing-index", taskId: "ssi:telegram-missing-index", evidenceGaps: ["previous index snapshot"],
    nextAction: { kind: "abstain", reason: "evidence_insufficient", summary: "No verified previous snapshot is available." },
    sourceStatus: { assumedCount: 1, derivedCount: 0, observedCount: 0, recommendedCount: 0 },
    stopReason: "evidence_insufficient",
  }), { nextActionKind: "abstain", stopReason: "evidence_insufficient" }),
  fixture("mn7r-basis-gap", checkpoint({
    correlationId: "mn7r:basis-gap", taskId: "mn7r:basis-gap", evidenceGaps: ["basis observation timestamp"],
    nextAction: { kind: "retrieve", sourceScope: "product-adapter", targetGap: "basis observation timestamp" },
  }), { nextActionKind: "retrieve" }),
  fixture("mn7r-multi-hypothesis", checkpoint({
    correlationId: "mn7r:multi-hypothesis", taskId: "mn7r:multi-hypothesis", enoughEvidence: true,
    nextAction: { kind: "compare", comparisonScope: "monitor-index", subjectIds: ["hypothesis-1", "hypothesis-2", "hypothesis-3"] },
    planStatus: "ready_for_review",
  }), { nextActionKind: "compare" }),
  fixture("mn7r-risk-review", checkpoint({
    correlationId: "mn7r:risk-review", taskId: "mn7r:risk-review",
    nextAction: { kind: "request_review", reviewScope: "risk-compliance", reason: "Counterevidence must be reviewed." },
    planStatus: "ready_for_review", stopReason: "review_required",
  }), { nextActionKind: "request_review", stopReason: "review_required" }),
  fixture("public-evidence-complete", checkpoint({
    correlationId: "public:complete", taskId: "public:complete", enoughEvidence: true, sourceVisibility: "public",
    nextAction: { kind: "finalize", resultScope: "complete", summary: "Cited public evidence is sufficient for the bounded synthesis." },
    planStatus: "ready_for_review",
  }), { nextActionKind: "finalize" }),
  fixture("limited-analysis", checkpoint({
    correlationId: "analysis:limited", taskId: "analysis:limited", evidenceGaps: ["cross-market confirmation"],
    nextAction: { kind: "finalize", resultScope: "limited", summary: "Limited synthesis retains its explicit evidence gap." },
    stopReason: "limited_result",
  }), { nextActionKind: "finalize", stopReason: "limited_result" }),
  fixture("iteration-limit", checkpoint({
    correlationId: "policy:iteration-limit", taskId: "policy:iteration-limit", iteration: CORTEX_SGR_LITE_MAX_ITERATIONS,
    nextAction: { kind: "abstain", reason: "iteration_limit", summary: "The bounded checkpoint iteration limit was reached." },
    stopReason: "iteration_limit",
  }), { nextActionKind: "abstain", stopReason: "iteration_limit" }),
  fixture("protected-boundary", checkpoint({
    correlationId: "policy:visibility-boundary", taskId: "policy:visibility-boundary",
    nextAction: { kind: "abstain", reason: "visibility_boundary", summary: "The requested scope exceeds the available visibility boundary." },
    stopReason: "visibility_boundary",
  }), { nextActionKind: "abstain", stopReason: "visibility_boundary" }),
];
