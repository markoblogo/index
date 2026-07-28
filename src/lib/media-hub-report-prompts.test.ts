import { describe, expect, it } from "vitest";
import { buildCortexMarketReportContextPack } from "@/lib/commodity-intelligence-layer";
import {
  buildMediaHubReportPrompt,
  renderCortexEditorialStructureProfile,
} from "@/lib/media-hub-report-prompts";
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
        hashtags: ["weekly"],
        id: "material-1",
        kind: "weekly_material",
        originalFilename: null,
        originalUrl: "https://example.com/corn",
        receivedAt: new Date("2026-07-06T10:00:00.000Z"),
        sourceDomain: "example.com",
        sourceRegistrationStatus: "material",
        sourceType: "telegram_link",
        summary: "Telegram material says corn export demand improved.",
        telegramFromId: null,
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

  it("uses an active editorial profile as style-only guidance", () => {
    const prompt = buildMediaHubReportPrompt({
      editorialGuidance: {
        active: true,
        benchmarkKind: "weekly",
        reason: "test",
        sampleCount: 6,
        targetSentenceRange: { max: 18, min: 12 },
        targetWordRange: { max: 280, min: 180 },
        version: "profile-test-0001",
      },
      kind: "monthly",
      latestData: [],
      locale: "uk",
      periodEndDate: "2026-07-31",
      periodStartDate: "2026-07-01",
      snapshots: [],
      tenant: "spike",
    });

    expect(prompt).toContain("profile-test-0001");
    expect(prompt).toContain("weekly benchmark as a structural and density reference");
    expect(prompt).toContain("Do not copy benchmark text, transfer facts");
  });

  it("renders v2 structure as a generic shadow-only instruction", () => {
    const instruction = renderCortexEditorialStructureProfile({
      active: true,
      emojiHeadingRate: 1,
      headingCountRange: { max: 5, min: 3 },
      sectionFamilies: ["signals", "logistics", "grains"],
      version: "structure-v2-test",
    });

    expect(instruction).toContain("structure-v2-test");
    expect(instruction).toContain("key signals -> logistics -> grains");
    expect(instruction).toContain("Do not copy benchmark wording");
  });
});
