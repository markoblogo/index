import { describe, expect, it } from "vitest";
import { cortexAgentGovernanceReplayFixtures } from "@/lib/cortex-agent-governance-replay-fixtures";
import { buildCortexEvaluationArtifactPacket, validateCortexEvaluationArtifactPacket } from "@/lib/cortex-evaluation-artifact-packet";

describe("Cortex evaluation artifact packet", () => {
  it("builds a complete five-artifact report-only packet with ledger links", () => {
    const packet = buildCortexEvaluationArtifactPacket({ createdAt: "2026-07-16T12:00:00.000Z", fixture: cortexAgentGovernanceReplayFixtures[0]!, runId: "fixture-run" });
    expect(validateCortexEvaluationArtifactPacket(packet)).toEqual({ errors: [], ok: true });
    expect(packet.trace.toolCalls).toBe(0);
    expect(packet.ledgerLinks).toHaveLength(2);
  });

  it("keeps rejected candidates and rejects a pass without review or rollback notes", () => {
    const packet = buildCortexEvaluationArtifactPacket({ fixture: cortexAgentGovernanceReplayFixtures[5]!, runId: "fixture-run" });
    expect(packet.candidatePlaybook.status).toBe("rejected");
    packet.verifierResult.status = "pass";
    expect(validateCortexEvaluationArtifactPacket(packet).errors).toContain("pass requires named review before promotion consideration");
    packet.verifierResult.review = { reviewedBy: "reviewer", status: "reviewed" };
    packet.verifierResult.rollbackNotes = [];
    expect(validateCortexEvaluationArtifactPacket(packet).errors).toContain("rollback notes are required");
  });
});
