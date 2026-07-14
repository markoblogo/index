import { describe, expect, it } from "vitest";
import {
  buildCortexMarketWorkforceLedgerRecord,
  normalizeCortexMarketWorkforceListLimit,
  type CortexMarketWorkforcePacket,
} from "@/lib/cortex-market-workforce-ledger";

const packet: CortexMarketWorkforcePacket = {
  assumed: ["weather impact is not yet confirmed"],
  blockedBy: [],
  candidates: [],
  correlationId: "corr-1",
  derived: ["monitor/index spread needs review"],
  diversityMode: "research",
  humanApproval: { required: true, status: "pending" },
  observed: [],
  outcome: "pending",
  packetType: "market-workforce",
  recommended: ["request fresh basis evidence"],
  roles: ["market-data-broker", "risk-compliance-officer"],
  taskId: "task-1",
  trigger: "monitor-index-comparison",
};

describe("1D3X Cortex market workforce ledger", () => {
  it("creates a stable version id and hash for the same packet", () => {
    const record = buildCortexMarketWorkforceLedgerRecord({ packet, tenantId: "mn7r" });
    const repeated = buildCortexMarketWorkforceLedgerRecord({ packet, tenantId: "mn7r" });

    expect(record.id).toBe(repeated.id);
    expect(record.packHash).toBe(repeated.packHash);
    expect(record.id).toContain("cortex-workforce:mn7r:task-1:");
    expect(record.visibility).toBe("protected");
    expect(record.product).toBe("1D3X Cortex");
  });

  it("clamps internal list limits", () => {
    expect(normalizeCortexMarketWorkforceListLimit(undefined)).toBe(25);
    expect(normalizeCortexMarketWorkforceListLimit(0)).toBe(1);
    expect(normalizeCortexMarketWorkforceListLimit(12.8)).toBe(12);
    expect(normalizeCortexMarketWorkforceListLimit(500)).toBe(100);
  });
});
