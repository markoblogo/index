import { describe, expect, it } from "vitest";
import { evaluateCortexOperationalFixture, type CortexOperationalEvalFixture } from "@/lib/cortex-operational-evaluation";

const fixture: CortexOperationalEvalFixture = {
  contextPack: {
    createdAt: "2026-07-15T08:00:00.000Z",
    evidence: [{
      extractedAt: "2026-07-15T08:00:00.000Z",
      id: "monitor-offer-1",
      sourceId: "mn7r-market-monitor",
      summary: "Observed CPT offer moved to 210 USD/t.",
      title: "Monitor offer",
      urlOrPath: "mn7r://monitor/offer-1",
      visibility: "protected",
    }],
    excluded: [],
    knownGaps: ["index methodology timestamp is not available"],
    product: "1D3X Cortex",
    purpose: "monitor-index-comparison",
    query: "wheat CPT comparison",
    sourceIds: ["mn7r-market-monitor"],
  },
  expected: { minCandidates: 1, requireApprovalGate: true, requireKnownGaps: true },
  id: "monitor-index-basic",
  packet: {
    assumed: ["unresolved gap: index methodology timestamp is not available"],
    blockedBy: ["officer review required"],
    candidates: [{
      candidateId: "basis-gap",
      confidence: "medium",
      counterevidence: [],
      evidence: [{ capturedAt: "2026-07-15T08:00:00.000Z", id: "monitor-offer-1", sourceId: "mn7r-market-monitor" }],
      evidenceChecklist: ["verify matching basis"],
      hypothesis: "The apparent spread may be a basis mismatch.",
      missingData: ["index methodology timestamp"],
      officerReview: "pending",
      probabilityUse: "ranking_hint_only",
      verbalizedProbability: 0.55,
    }],
    correlationId: "corr-monitor-index-basic",
    derived: ["monitor offer differs from index reference"],
    diversityMode: "research",
    humanApproval: { required: true, status: "pending" },
    observed: [{ capturedAt: "2026-07-15T08:00:00.000Z", id: "monitor-offer-1", sourceId: "mn7r-market-monitor" }],
    outcome: "pending",
    packetType: "market-workforce",
    recommended: ["Review the basis before publishing a comparison."],
    roles: ["market-data-broker", "risk-compliance-officer"],
    taskId: "task-monitor-index-basic",
    trigger: "monitor-index-comparison",
  },
  synthesis: {
    claims: [{ evidenceIds: ["monitor-offer-1"], text: "The monitored offer is 210 USD/t." }],
    knownGaps: ["index methodology timestamp is not available"],
  },
};

describe("Cortex operational evaluation", () => {
  it("accepts cited, approval-gated monitor/index packets", () => {
    expect(evaluateCortexOperationalFixture(fixture)).toEqual({ failures: [], fixtureId: fixture.id, ok: true });
  });

  it("rejects unsupported claims and outcomes without approval", () => {
    const invalid = structuredClone(fixture);
    invalid.synthesis.claims[0].evidenceIds = ["missing-evidence"];
    invalid.packet.outcome = "published";
    const result = evaluateCortexOperationalFixture(invalid);

    expect(result.ok).toBe(false);
    expect(result.failures).toContain("claim cites unavailable evidence: missing-evidence");
    expect(result.failures).toContain("packet: executed or published packets require approved humanApproval");
  });
});
