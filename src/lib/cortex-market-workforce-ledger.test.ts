import { describe, expect, it } from "vitest";
import {
  buildCortexMarketWorkforceLedgerRecord,
  buildCortexMediaHubReportProposalPacket,
  normalizeCortexMarketWorkforceListLimit,
  validateCortexMarketWorkforcePacket,
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

  it("builds a pending SSI/Telegram proposal from the exact report context", () => {
    const proposal = buildCortexMediaHubReportProposalPacket({
      contextPack: {
        createdAt: "2026-07-15T09:00:00.000Z",
        evidence: [{
          extractedAt: "2026-07-15T09:00:00.000Z",
          id: "ssi-evidence-1",
          sourceId: "published-index-values",
          summary: "Wheat CPT Odesa: 210 USD/t.",
          title: "Published wheat index",
          urlOrPath: "https://1d3x.com/",
          visibility: "public",
        }],
        excluded: [],
        knownGaps: ["respondent sample size is unavailable"],
        product: "1D3X Cortex",
        purpose: "market-report",
        query: "spike:daily:2026-07-15",
        sourceIds: ["published-index-values"],
      },
      reportId: "report-1",
      reportKind: "daily",
      tenantId: "spike-ua",
    });

    expect(proposal).toMatchObject({
      humanApproval: { required: true, status: "pending" },
      observed: [expect.objectContaining({ id: "ssi-evidence-1" })],
      taskId: "mediahub-report:report-1",
      trigger: "ssi-telegram-report-proposal",
    });
    expect(validateCortexMarketWorkforcePacket(proposal).ok).toBe(true);
  });
});
