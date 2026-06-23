import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/index-platform", () => ({
  getActiveIndexConfig: () => ({
    commodities: [
      {
        category: "all-seasons",
        code: "CORN",
        dbCode: "CORN",
        group: "export",
        id: "corn",
        sortOrder: 1,
      },
      {
        category: "seasonal-export",
        code: "SOY NON-GMO CPT",
        dbCode: "SOYBEAN_NON_GMO_EXPORT",
        group: "export",
        id: "non-gmo-soybean-export",
        sortOrder: 8,
      },
      {
        category: "processors",
        code: "SUN",
        dbCode: "SUNFLOWER",
        group: "processing",
        id: "sunflower",
        sortOrder: 6,
        vatIncluded: true,
      },
    ],
    id: "spike-ua",
  }),
}));

import {
  __mediaHubDailyReportTestHooks,
  build1d3xDailyReportView,
  buildSsiDailyReportView,
  renderDailyNewsTelegramSection,
  renderSsiDailyIndexTelegramSection,
  renderSsiDailyNewsTelegramSection,
} from "@/lib/media-hub-daily-report";
import {
  build1d3xDailyReportPrompt,
  buildSsiDailyReportPrompt,
} from "@/lib/media-hub-report-prompts";
import type { PublicHistoryItem, PublicLatestItem } from "@/lib/public-api-data";

const {
  buildSsiDailyIndexFacts,
  getPreviousPublishedBusinessDay,
  getPreviousWeekFriday,
  groupSsiIndicesForDailyReport,
} = __mediaHubDailyReportTestHooks;

function latest(overrides: Partial<PublicLatestItem>): PublicLatestItem {
  return {
    basis: "CPT Odesa, Ukraine (export)",
    changeAbs: 0,
    changePct: 0,
    commodityCode: "CORN",
    commodityId: "corn",
    commodityNameEn: "Corn",
    commodityNameUk: "Кукурудза",
    date: "2026-06-19",
    respondents: 1,
    valueUsdPerMt: 216.5,
    ...overrides,
  };
}

function history(overrides: Partial<PublicHistoryItem>): PublicHistoryItem {
  return {
    ...latest({}),
    status: "published",
    valueUsdPerMt: 220,
    ...overrides,
  };
}

describe("media hub daily report formatting", () => {
  it("groups SSI indices into all season, seasonal and processing with stable order", () => {
    const facts = buildSsiDailyIndexFacts([
      latest({
        basis: "CPT parity Odesa, Ukraine (processing)",
        commodityCode: "SUN",
        commodityId: "sunflower",
        commodityNameUk: "Соняшник",
      }),
      latest({
        commodityCode: "SOY NON-GMO CPT",
        commodityId: "non-gmo-soybean-export",
        commodityNameUk: "Соя не ГМО CPT Port",
      }),
      latest({ commodityCode: "UNKNOWN", commodityNameUk: "Новий індекс" }),
    ], [], "2026-06-19", "uk");
    const groups = groupSsiIndicesForDailyReport(facts);

    expect(groups.map((group) => group.id)).toEqual(["all_season", "seasonal", "processing"]);
    expect(groups.find((group) => group.id === "all_season")?.items.map((item) => item.name))
      .toContain("Новий індекс");
    expect(groups.find((group) => group.id === "seasonal")?.items[0].name)
      .toBe("Соя не ГМО CPT Port");
    expect(groups.find((group) => group.id === "processing")?.items[0].vatIncluded)
      .toBe(true);
  });

  it("calculates previous business day and previous-Friday comparison without using same Friday", () => {
    expect(getPreviousPublishedBusinessDay("2026-06-22")).toBe("2026-06-19");
    expect(getPreviousWeekFriday("2026-06-19")).toBe("2026-06-12");
    expect(getPreviousWeekFriday("2026-06-22")).toBe("2026-06-19");

    const [fact] = buildSsiDailyIndexFacts([
      latest({ changeAbs: -2, valueUsdPerMt: 216.5 }),
    ], [
      history({ date: "2026-06-12", valueUsdPerMt: 220 }),
    ], "2026-06-19", "uk");

    expect(fact.dayChange).toBe(-2);
    expect(fact.previousFridayChange).toBe(-3.5);
  });

  it("builds SSI daily content with index section before themed news", () => {
    const report = buildSsiDailyReportView({
      historyData: [history({ date: "2026-06-12", valueUsdPerMt: 220 })],
      latestData: [latest({ changeAbs: -2, valueUsdPerMt: 216.5 })],
      locale: "uk",
      localizedSummary: [
        "🔎 Головні сигнали",
        "Кукурудза знизилася на денному відрізку.",
        "🚚 Логістика та експорт",
        "Портові маршрути залишались у фокусі моніторингу.",
      ],
      periodEndDate: "2026-06-19",
    });
    const telegram = [
      ...renderSsiDailyIndexTelegramSection(report.indexSection!),
      ...renderDailyNewsTelegramSection(report.newsSection),
    ].join("\n");

    expect(report.indexSection?.groups.map((group) => group.title)).toEqual([
      "ALL SEASON",
      "SEASONAL",
      "PROCESSING",
    ]);
    expect(report.newsSection.themes.map((theme) => theme.title)).toContain("🚚 Логістика та експорт");
    expect(telegram.indexOf("SPIKE Spot Commodity Index Ukraine"))
      .toBeLessThan(telegram.indexOf("🔎 Головні сигнали"));
    expect(telegram).not.toContain("↳");
  });

  it("renders SSI daily Telegram news as a compact price-focused digest", () => {
    const report = buildSsiDailyReportView({
      historyData: [],
      latestData: [latest({ changeAbs: -2, valueUsdPerMt: 216.5 })],
      locale: "uk",
      localizedSummary: [
        "🔎 Головні сигнали",
        "Кукурудза отримала підтримку від активних експортних програм експортерів.",
        "В ЄС тривають зміни в регулюванні геномно редагованих культур.",
        "🌾 Ринок зернових",
        "Пшеничний комплекс продовжив корекцію напередодні збору нового врожаю.",
        "🚚 Логістика та експорт",
        "Портові маршрути залишались у фокусі моніторингу.",
        "⚖️ Політика, регулювання та торгівля",
        "Обговорюється створення окремого Міністерства аграрної політики.",
      ],
      periodEndDate: "2026-06-22",
    });
    const telegram = renderSsiDailyNewsTelegramSection(report.newsSection).join("\n");

    expect(telegram).toContain("Кукурудза отримала підтримку");
    expect(telegram).toContain("Пшеничний комплекс");
    expect(telegram).not.toContain("Логістика");
    expect(telegram).not.toContain("регулюванні геномно");
    expect(telegram).not.toContain("Міністерства");
  });

  it("builds 1D3X daily content without an SSI index section", () => {
    const report = build1d3xDailyReportView({
      localizedSummary: [
        "🔎 Key signals",
        "Global wheat and corn flows were active.",
        "🚢 Logistics and freight",
        "Freight headlines concentrated around port execution.",
      ],
      periodEndDate: "2026-06-19",
    });

    expect(report.indexSection).toBeUndefined();
    expect(report.newsSection.themes.map((theme) => theme.title)).toEqual([
      "🔎 Key signals",
      "🚢 Logistics and freight",
    ]);
  });

  it("adds daily prompt guardrails for SSI and 1D3X", () => {
    const base = {
      kind: "daily" as const,
      latestData: [latest({})],
      periodEndDate: "2026-06-19",
      periodStartDate: "2026-06-19",
      snapshots: [],
    };
    const ssiPrompt = buildSsiDailyReportPrompt({
      ...base,
      locale: "uk",
      tenant: "spike",
    });
    const id3xPrompt = build1d3xDailyReportPrompt({
      ...base,
      latestData: [],
      locale: "en",
      tenant: "platform",
    });

    expect(ssiPrompt).toContain("Do not invent prices");
    expect(ssiPrompt).toContain("🌾 Ринок зернових");
    expect(ssiPrompt).toContain("Index data:");
    expect(id3xPrompt).toContain("1D3X has no index section");
    expect(id3xPrompt).toContain("🚢 Logistics and freight");
  });
});
