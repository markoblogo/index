import type { CortexAgentGovernanceReplayFixture } from "@/lib/cortex-agent-governance-evaluation";

function fixture(input: Pick<CortexAgentGovernanceReplayFixture, "expected" | "id" | "input">): CortexAgentGovernanceReplayFixture {
  return { baseline: { estimatedCost: null, factualSafety: "unknown", latencyMs: null, toolCalls: null }, ...input };
}

function action(id: string, overrides: Partial<CortexAgentGovernanceReplayFixture["input"]> = {}): CortexAgentGovernanceReplayFixture["input"] {
  return {
    actionKind: "external_model_handoff",
    actionPayload: { model: "gpt-test", operation: id, provider: "openai" },
    correlationId: `replay:${id}`,
    evidence: { knownGapCount: 0, protectedEvidenceCount: 0, totalCount: 1 },
    sourceVisibility: "protected",
    taskId: `replay:${id}`,
    ...overrides,
  };
}

/** Twelve saved task-family replays; none contains query text, evidence text or secrets. */
export const cortexAgentGovernanceReplayFixtures: CortexAgentGovernanceReplayFixture[] = [
  fixture({ id: "assistant-exe-complete", input: action("assistant-exe-complete"), expected: { decision: "allow", stop: "continue" } }),
  fixture({ id: "assistant-manual-complete", input: action("assistant-manual-complete"), expected: { decision: "allow", stop: "continue" } }),
  fixture({ id: "assistant-public-complete", input: action("assistant-public-complete", { sourceVisibility: "public" }), expected: { decision: "allow", stop: "continue" } }),
  fixture({ id: "assistant-exe-known-gap", input: action("assistant-exe-known-gap", { evidence: { knownGapCount: 1, protectedEvidenceCount: 1, totalCount: 3 } }), expected: { decision: "require_approval", stop: "request_review" } }),
  fixture({ id: "assistant-manual-known-gap", input: action("assistant-manual-known-gap", { evidence: { knownGapCount: 2, protectedEvidenceCount: 0, totalCount: 2 } }), expected: { decision: "require_approval", stop: "request_review" } }),
  fixture({ id: "assistant-no-evidence", input: action("assistant-no-evidence", { evidence: { knownGapCount: 1, protectedEvidenceCount: 0, totalCount: 0 } }), expected: { decision: "require_approval", stop: "abstain" } }),
  fixture({ id: "public-protected-boundary", input: action("public-protected-boundary", { evidence: { knownGapCount: 0, protectedEvidenceCount: 1, totalCount: 1 }, sourceVisibility: "public" }), expected: { decision: "deny", stop: "abstain" } }),
  fixture({ id: "mediahub-daily-reference", input: action("mediahub-daily-reference", { actionKind: "mediahub_report_generation" }), expected: { decision: "allow", stop: "continue" } }),
  fixture({ id: "mediahub-weekly-gap", input: action("mediahub-weekly-gap", { actionKind: "mediahub_report_generation", evidence: { knownGapCount: 1, protectedEvidenceCount: 1, totalCount: 4 } }), expected: { decision: "require_approval", stop: "request_review" } }),
  fixture({ id: "editorial-rewrite-reference", input: action("editorial-rewrite-reference", { actionKind: "editorial_rewrite" }), expected: { decision: "allow", stop: "continue" } }),
  fixture({ id: "workforce-review-gap", input: action("workforce-review-gap", { actionKind: "workforce_review", evidence: { knownGapCount: 1, protectedEvidenceCount: 2, totalCount: 2 } }), expected: { decision: "require_approval", stop: "request_review" } }),
  fixture({ id: "publication-delivery-no-evidence", input: action("publication-delivery-no-evidence", { actionKind: "publication_delivery", evidence: { knownGapCount: 0, protectedEvidenceCount: 0, totalCount: 0 } }), expected: { decision: "require_approval", stop: "abstain" } }),
];
