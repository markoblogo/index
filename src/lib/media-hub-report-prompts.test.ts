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
        extractionReceipts: [],
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

  it("uses only ok structured markdown receipts as prompt evidence", () => {
    const prompt = buildMediaHubReportPrompt({
      kind: "weekly",
      latestData: [],
      locale: "en",
      manualMaterials: [
        {
          assets: [{
            assetType: "extracted_text",
            byteSize: 120,
            confidence: 0.82,
            createdAt: new Date("2026-07-06T10:00:00.000Z"),
            extractedText: "# Corn evidence\n\nUkraine corn CPT Odesa demand improved this week.",
            id: "asset-ok",
            metadata: {
              parser: "markitdown-style",
              shadowOnly: true,
              status: "ok",
            },
            mimeType: "text/markdown",
            pageNumber: null,
            storagePath: null,
            visualSummary: "",
          }],
          extractionReceipts: [{
            adapter: "manual_file",
            extractedAt: new Date("2026-07-06T10:00:00.000Z"),
            freshness: "unknown",
            hasMarkdown: true,
            materialId: "material-ok",
            operatorReviewStatus: "ready",
            runtime: "markitdown",
            status: "ok",
            warnings: [],
          }],
          extractedFacts: null,
          extractedTables: null,
          extractedText: "Ukraine corn demand.",
          extractionStatus: "extracted",
          hashtags: ["weekly"],
          id: "material-ok",
          kind: "weekly_material",
          originalFilename: "corn.md",
          originalUrl: null,
          receivedAt: new Date("2026-07-06T10:00:00.000Z"),
          sourceDomain: null,
          sourceRegistrationStatus: "material",
          sourceType: "telegram_file",
          summary: "Ukraine corn demand.",
          telegramFromId: null,
          tenantId: "spike-ua",
          usedInReportId: null,
        },
        {
          assets: [{
            assetType: "extracted_text",
            byteSize: 120,
            confidence: 0.42,
            createdAt: new Date("2026-07-06T10:00:00.000Z"),
            extractedText: "# Thin evidence\n\nThis should not strengthen the prompt.",
            id: "asset-thin",
            metadata: {
              parser: "markitdown-style",
              shadowOnly: true,
              status: "thin",
            },
            mimeType: "text/markdown",
            pageNumber: null,
            storagePath: null,
            visualSummary: "",
          }],
          extractionReceipts: [{
            adapter: "manual_file",
            extractedAt: new Date("2026-07-06T10:00:00.000Z"),
            freshness: "unknown",
            hasMarkdown: true,
            materialId: "material-thin",
            operatorReviewStatus: "review",
            runtime: "markitdown",
            status: "thin",
            warnings: ["office_binary_parsing_not_enabled"],
          }],
          extractedFacts: null,
          extractedTables: null,
          extractedText: "Thin source metadata.",
          extractionStatus: "partial",
          hashtags: ["weekly"],
          id: "material-thin",
          kind: "weekly_material",
          originalFilename: "thin.docx",
          originalUrl: null,
          receivedAt: new Date("2026-07-06T10:00:00.000Z"),
          sourceDomain: null,
          sourceRegistrationStatus: "material",
          sourceType: "telegram_file",
          summary: "",
          telegramFromId: null,
          tenantId: "spike-ua",
          usedInReportId: null,
        },
      ],
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      snapshots: [],
      tenant: "spike",
    });

    expect(prompt).toContain("Structured markdown evidence from ok extraction receipts");
    expect(prompt).toContain("Ukraine corn CPT Odesa demand improved this week");
    expect(prompt).not.toContain("This should not strengthen the prompt");
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
