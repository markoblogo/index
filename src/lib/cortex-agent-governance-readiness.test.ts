import { describe, expect, it } from "vitest";
import { buildCortexAgentGovernanceReceipt, type CortexAgentGovernanceActionTelemetryRecord, type CortexAgentGovernanceReceiptLedgerRecord } from "@/lib/cortex-agent-governance-capability";
import { buildCortexAgentGovernanceReadinessSnapshot } from "@/lib/cortex-agent-governance-readiness";

function records(surface: "mn7r-exe-assistant" | "mn7r-manual-assistant" | "mn7r-public-assistant", count: number): CortexAgentGovernanceReceiptLedgerRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    ...buildCortexAgentGovernanceReceipt({
      actionKind: "external_model_handoff",
      actionPayload: { attempt: index, provider: "openai" },
      consumerSurface: surface,
      correlationId: `${surface}:correlation:${index}`,
      createdAt: `2026-07-16T08:${String(index % 60).padStart(2, "0")}:00.000Z`,
      evidence: { knownGapCount: 0, protectedEvidenceCount: surface === "mn7r-public-assistant" ? 0 : 1, totalCount: 2 },
      sourceVisibility: surface === "mn7r-public-assistant" ? "public" : "protected",
      taskId: `${surface}:task:${index}`,
    }),
    shadowOnly: true as const,
    tenantId: "spike-ua",
  }));
}

function telemetry(receipts: CortexAgentGovernanceReceiptLedgerRecord[]): CortexAgentGovernanceActionTelemetryRecord[] {
  return receipts.map((receipt, index) => ({
    actionFingerprint: receipt.actionFingerprint,
    completedAt: receipt.createdAt,
    id: `telemetry:${index}`,
    outcome: "succeeded",
    receiptId: receipt.id,
    shadowOnly: true,
    telemetry: { estimatedCost: null, latencyMs: 100 + index, tokens: 80 + index, toolCalls: 1 },
  }));
}

describe("Cortex agent governance readiness", () => {
  it("keeps promotion false while exposing a human-review-ready shadow track", () => {
    const exe = records("mn7r-exe-assistant", 30);
    const snapshot = buildCortexAgentGovernanceReadinessSnapshot({
      createdAt: "2026-07-16T12:00:00.000Z",
      receipts: exe,
      telemetry: telemetry(exe),
      tenantId: "spike-ua",
    });
    const track = snapshot.tracks.find((item) => item.consumerSurface === "mn7r-exe-assistant");
    expect(track).toMatchObject({ errors: 0, privacyBoundaryFailures: 0, receiptCount: 30, status: "ready_for_human_review" });
    expect(track?.telemetryCoverage).toMatchObject({ completed: 1, tokens: 1, cost: 0 });
    expect(snapshot.promotionEligible).toBe(false);
  });

  it("does not count unlabelled historical receipts toward a consumer surface", () => {
    const historical = records("mn7r-exe-assistant", 1);
    historical[0] = { ...historical[0], consumerSurface: "internal" };
    const snapshot = buildCortexAgentGovernanceReadinessSnapshot({ receipts: historical, telemetry: [], tenantId: "spike-ua" });
    expect(snapshot.tracks.find((item) => item.consumerSurface === "mn7r-exe-assistant")?.receiptCount).toBe(0);
  });
});
