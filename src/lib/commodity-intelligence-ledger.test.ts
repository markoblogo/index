import { describe, expect, it } from "vitest";
import {
  buildCortexContextPackLedgerRecord,
  getCortexPackDominantVisibility,
} from "@/lib/commodity-intelligence-ledger";
import { buildCortexMarketReportContextPack } from "@/lib/commodity-intelligence-layer";

describe("1D3X Cortex ledger", () => {
  it("builds a stable report ledger record from a context pack", () => {
    const pack = buildCortexMarketReportContextPack({
      manualMaterials: [
        {
          extractedText: "Telegram note about corn export demand.",
          id: "material-1",
          kind: "weekly_material",
          originalFilename: null,
          originalUrl: "https://example.com/corn",
          receivedAt: new Date("2026-07-06T10:00:00.000Z"),
          sourceDomain: "example.com",
          sourceType: "telegram_link",
          summary: "Telegram material says corn export demand improved.",
          tenantId: "spike-ua",
        },
      ],
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      reportKind: "weekly",
      snapshots: [],
      tenant: "spike",
    });

    const record = buildCortexContextPackLedgerRecord({
      pack,
      target: {
        entityId: "report-1",
        entityType: "mediahub-report",
        periodEndDate: "2026-07-06",
        periodStartDate: "2026-06-30",
        reportKind: "weekly",
        tenantId: "spike-ua",
      },
    });
    const repeated = buildCortexContextPackLedgerRecord({
      pack,
      target: record.target,
    });

    expect(record.id).toBe("cortex-pack:spike-ua:mediahub-report:report-1");
    expect(record.packHash).toBe(repeated.packHash);
    expect(record.product).toBe("1D3X Cortex");
    expect(record.purpose).toBe("market-report");
    expect(record.target.reportKind).toBe("weekly");
    expect(record.metrics.evidenceCount).toBe(1);
    expect(record.metrics.excludedCount).toBe(0);
    expect(record.metrics.knownGapCount).toBe(2);
    expect(record.sourceIds).toEqual(["mediahub-telegram-materials"]);
    expect(record.visibility).toBe("internal");
  });

  it("reports the most restrictive visibility present in approved evidence", () => {
    expect(getCortexPackDominantVisibility([])).toBe("public");
    expect(getCortexPackDominantVisibility(["public", "internal"])).toBe("internal");
    expect(getCortexPackDominantVisibility(["public", "protected"])).toBe("protected");
    expect(getCortexPackDominantVisibility(["secret", "internal"])).toBe("secret");
  });
});
