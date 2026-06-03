import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  assessWeeklyReportReadiness,
  buildWeeklyTelegramMessages,
  type WeeklyReportManifest,
} from "@/lib/weekly-ai-report";

function buildManifest(overrides: Partial<WeeklyReportManifest> = {}) {
  const activeIndex = getActiveIndexConfig();
  const weeklySummary = activeIndex.commodities.map((commodity, index) => ({
    code: commodity.code,
    latestValue: 200 + index * 3,
    respondents: 6,
    volatility30d: 1.2 + index * 0.1,
    weeklyChangeAbs: index % 2 === 0 ? 1.5 + index : -1.2 - index,
    weeklyChangePct: index % 2 === 0 ? 0.8 : -0.6,
  }));

  return {
    adminNotes: "Logistics, grain export and oilseed processing context.",
    aiBriefReferences: ["2026-05-30"],
    dailyValues: {
      "2026-05-30": weeklySummary.map((item) => ({
        code: item.code,
        respondents: item.respondents,
        value: item.latestValue ?? 0,
      })),
    },
    dataConfidence: "strong",
    fallbackText: ["Clean fallback text."],
    generatedForWeek: "2026-05-30",
    missingDataWarnings: [],
    oneOffSources: [
      {
        createdAt: "2026-05-30T00:00:00.000Z",
        enabled: true,
        id: "src-one",
        language: "uk",
        notes: "Logistics update with grain and oilseed coverage.",
        reportId: "report-1",
        scope: "one_off",
        title: "Weekly logistics note",
        type: "logistics",
        updatedAt: "2026-05-30T00:00:00.000Z",
        url: "https://example.com/logistics",
      },
    ],
    permanentSources: [
      {
        createdAt: "2026-05-30T00:00:00.000Z",
        enabled: true,
        id: "src-perm",
        language: "uk",
        notes: "Export grains and oilseed processing reference.",
        reportId: null,
        scope: "permanent",
        title: "Weekly market reference",
        type: "market_news",
        updatedAt: "2026-05-30T00:00:00.000Z",
        url: "https://example.com/reference",
      },
    ],
    structuredDataPack: "Road logistics, grain export and oilseed processing context.",
    weeklySummary,
    ...overrides,
  } satisfies WeeklyReportManifest;
}

describe("weekly AI report", () => {
  it("accepts a manifest with full coverage and source context", () => {
    const readiness = assessWeeklyReportReadiness(buildManifest());
    expect(readiness.canPublish).toBe(true);
    expect(readiness.missingInputs).toHaveLength(0);
  });

  it("blocks publication when a required commodity is missing", () => {
    const manifest = buildManifest({
      weeklySummary: buildManifest().weeklySummary.slice(0, -1),
    });

    const readiness = assessWeeklyReportReadiness(manifest);
    expect(readiness.canPublish).toBe(false);
    expect(readiness.missingInputs.join(" ")).toMatch(/incomplete/i);
  });

  it("builds three Ukrainian Telegram messages without banned phrases", () => {
    const messages = buildWeeklyTelegramMessages(buildManifest(), "2026-05-30");

    expect(messages).toHaveLength(3);
    for (const message of messages) {
      expect(message).toContain("🇺🇦 <b>SPIKE SPOT INDEX");
      expect(message).toContain("Частина");
      expect(message).not.toMatch(/n\/a/i);
      expect(message).not.toMatch(/source-grounded|datapack|framework|black-box/i);
      expect(message).not.toMatch(/Part I\. Logistics|Part II\. Grains|Part III\. Oilseeds/i);
    }
  });
});
