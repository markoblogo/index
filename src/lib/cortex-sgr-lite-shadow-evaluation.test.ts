import { describe, expect, it } from "vitest";
import { cortexSgrLiteReplayFixtures } from "@/lib/cortex-sgr-lite-replay-fixtures";
import { runCortexSgrLiteShadowEvaluation } from "@/lib/cortex-sgr-lite-shadow-evaluation";

describe("Cortex SGR-lite shadow evaluation", () => {
  it("evaluates twelve offline replay fixtures without persistence", async () => {
    const result = await runCortexSgrLiteShadowEvaluation({
      fixtures: cortexSgrLiteReplayFixtures,
      persist: false,
      runId: "test-run",
    });
    expect(result.summary).toEqual({ failed: 0, passed: 12, total: 12 });
    expect(result.records.every((record) => record.shadowOnly && record.factualSafety.passed && record.stopDecision.correct)).toBe(true);
    expect(result.records[0]?.measurements.sgrLiteToolCalls).toBe(0);
    expect(result.records[0]?.limitations).toContain("No output was routed, published, or delivered while evaluating this fixture.");
  });
});
