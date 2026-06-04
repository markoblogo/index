import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let buildAiBriefTelegramSummaryText: typeof import("@/lib/ai-market-brief").buildAiBriefTelegramSummaryText;
let isAiBriefLocaleCompatible: typeof import("@/lib/ai-market-brief").isAiBriefLocaleCompatible;
let mapConfidenceLabel: typeof import("@/lib/ai-market-brief").mapConfidenceLabel;

const brief = {
  blocks: [
    {
      body: "The market does not show a broad move across all positions.",
      title: "Today's Market Signal",
    },
    {
      body: "GMO soybean is the strongest positive mover. Sunflower seed remains the weakest weekly position.",
      title: "Key Movers",
    },
    {
      body: "Volatility is concentrated in soybean while cereals remain comparatively stable.",
      title: "Risk / Stability Read",
    },
    {
      body: "Watch whether soybean momentum holds and whether sunflower stabilizes in the next cycle.",
      title: "What to Watch Next",
    },
  ],
  cardComments: {},
  confidence: "limited",
  generatedAt: "Jun 2",
  inputDataHash: "abcd1234",
  model: "gpt-4.1-mini",
  observability: {
    estimatedCostUsd: 0.0012,
    fallbackReason: null,
    promptTokens: 120,
    status: "generated",
    totalTokens: 320,
  },
  tradeDate: "2026-06-02",
};

beforeAll(async () => {
  ({ buildAiBriefTelegramSummaryText, isAiBriefLocaleCompatible, mapConfidenceLabel } =
    await import("@/lib/ai-market-brief"));
});

describe("buildAiBriefTelegramSummaryText", () => {
  it("renders a public Ukrainian market-post format without debug metadata", () => {
    const text = buildAiBriefTelegramSummaryText(brief, "uk");

    expect(text).toContain("🌾 AI Market Brief");
    expect(text).toContain("🔎");
    expect(text).toContain("📈");
    expect(text).toContain("⚖️");
    expect(text).toContain("👀");
    expect(text).toContain("Data confidence: обмежена");
    expect(text).not.toContain("Model:");
    expect(text).not.toContain("Tokens:");
    expect(text).not.toContain("Cost:");
  });
});

describe("mapConfidenceLabel", () => {
  it("maps public confidence labels for both locales", () => {
    expect(mapConfidenceLabel("limited", "uk")).toBe(
      "Data confidence: обмежена",
    );
    expect(mapConfidenceLabel("normal", "en")).toBe("normal");
    expect(mapConfidenceLabel("strong", "en")).toBe("strong");
  });
});

describe("isAiBriefLocaleCompatible", () => {
  it("rejects english body text for Ukrainian briefs", () => {
    expect(
      isAiBriefLocaleCompatible(
        {
          ...brief,
          blocks: brief.blocks.map((block) => ({
            ...block,
            body: block.body,
          })),
        },
        "uk",
      ),
    ).toBe(false);
  });

  it("accepts Ukrainian body text for Ukrainian briefs", () => {
    expect(
      isAiBriefLocaleCompatible(
        {
          ...brief,
          blocks: brief.blocks.map((block) => ({
            ...block,
            body: "Ринок не показує широкого руху по всіх позиціях.",
          })),
        },
        "uk",
      ),
    ).toBe(true);
  });
});
