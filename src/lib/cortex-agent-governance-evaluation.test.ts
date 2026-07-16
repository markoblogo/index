import { describe, expect, it } from "vitest";
import { cortexAgentGovernanceReplayFixtures } from "@/lib/cortex-agent-governance-replay-fixtures";
import { runCortexAgentGovernanceEvaluation } from "@/lib/cortex-agent-governance-evaluation";

describe("Cortex agent governance replay evaluation", () => {
  it("evaluates twelve shadow-only saved task families without a live switch", async () => {
    const result = await runCortexAgentGovernanceEvaluation({ fixtures: cortexAgentGovernanceReplayFixtures, persist: false, runId: "test-run" });
    expect(result.summary).toEqual({ failed: 0, passed: 12, total: 12 });
    expect(result.records.every((record) => record.shadowOnly && record.factualSafety.passed && record.decisionCorrect)).toBe(true);
    expect(result.records[0]?.measurements.proposedToolCalls).toBe(0);
    expect(result.records[0]?.limitations).toContain("No public response, protected retrieval, publication or delivery changed during this evaluation.");
  });
});
