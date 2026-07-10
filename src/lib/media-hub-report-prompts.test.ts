import { describe, expect, it } from "vitest";
import { buildCortexMarketReportContextPack } from "@/lib/commodity-intelligence-layer";
import { buildMediaHubReportPrompt } from "@/lib/media-hub-report-prompts";
import type { MediaHubManualMaterialDigest } from "@/lib/media-hub-manual-materials";

describe("Context report prompts", () => {
  it("includes the approved 1D3X Cortex context pack before OpenAI drafting", () => {
    const manualMaterials: MediaHubManualMaterialDigest[] = [
      {
        assets: [],
        extractedFacts: null,
        extractedTables: null,
        extractedText: "Telegram note about corn export demand.",
        extractionStatus: "completed",
        id: "material-1",
        kind: "weekly_material",
        originalFilename: null,
        originalUrl: "https://example.com/corn",
        receivedAt: new Date("2026-07-06T10:00:00.000Z"),
        sourceDomain: "example.com",
        sourceRegistrationStatus: "material",
        sourceType: "telegram_link",
        summary: "Telegram material says corn export demand improved.",
        tenantId: "spike-ua",
        usedInReportId: null,
      },
    ];
    const cortexContextPack = buildCortexMarketReportContextPack({
      manualMaterials,
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      reportKind: "weekly",
      snapshots: [],
      tenant: "spike",
    });

    const prompt = buildMediaHubReportPrompt({
      cortexContextPack,
      kind: "weekly",
      latestData: [],
      locale: "en",
      manualMaterials,
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      snapshots: [],
      tenant: "spike",
    });

    expect(prompt).toContain("1D3X Cortex approved context pack");
    expect(prompt).toContain("cortex:material:material-1");
    expect(prompt).toContain("mediahub-telegram-materials");
    expect(prompt).toContain("Use the approved Cortex evidence above as the primary context");
  });
});
