import { describe, expect, it } from "vitest";
import {
  buildContextSourceFamilyFixtures,
  buildContextSourceOperatorSummary,
  CONTEXT_RECURRING_SOURCE_FAMILIES,
} from "./context-recurring-sources";

describe("Context recurring sources", () => {
  it("defines bounded fixtures for current SSI/1D3X recurring source families", () => {
    const fixtures = buildContextSourceFamilyFixtures();

    expect(fixtures).toHaveLength(CONTEXT_RECURRING_SOURCE_FAMILIES.length);
    expect(fixtures.map((fixture) => fixture.id)).toContain("zaner_netags_grain_oilseed");
    expect(fixtures.every((fixture) => fixture.tenantIds.includes("spike-ua"))).toBe(true);
    expect(fixtures.every((fixture) => fixture.tenantIds.includes("1d3x"))).toBe(true);
  });

  it("summarizes source coverage, gaps, ok markdown and review state", () => {
    const summary = buildContextSourceOperatorSummary([
      {
        extractionReceipts: [{
          hasMarkdown: true,
          operatorReviewStatus: "ready",
          status: "ok",
          warnings: [],
        }],
        extractionStatus: "extracted",
        originalUrl: "https://www.zaner.com/3.0/market_information/ht_stream.asp?page=netags",
        receivedAt: new Date("2026-07-28T08:00:00.000Z"),
        sourceDomain: "zaner.com",
        sourceType: "scheduled_html",
        tenantId: "spike-ua",
      },
      {
        extractionReceipts: [{
          hasMarkdown: false,
          operatorReviewStatus: "review",
          status: "thin",
          warnings: ["pdf_text_extraction_delegated_to_pdf_adapter"],
        }],
        extractionStatus: "partial",
        originalUrl: "https://www.zaner.com/hightower/netags.pdf",
        receivedAt: new Date("2026-07-28T08:05:00.000Z"),
        sourceDomain: "zaner.com",
        sourceType: "scheduled_pdf",
        tenantId: "1d3x",
      },
    ]);

    expect(summary.totalExpected).toBe(6);
    expect(summary.readyCount).toBe(1);
    expect(summary.reviewCount).toBe(1);
    expect(summary.missingCount).toBe(4);
    expect(summary.okMarkdownCount).toBe(1);
  });
});
