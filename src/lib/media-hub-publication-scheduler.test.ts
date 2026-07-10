import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
let platformSite = false;
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));
vi.mock("@/lib/index-platform", () => ({
  getCommodityCategory: (commodity: { category?: string }) => commodity.category ?? "all-seasons",
  getActiveIndexConfig: () => ({
    commodities: [
      {
        category: "all-seasons",
        code: "CORN",
        dbCode: "CORN",
        group: "export",
        id: "corn",
        name: { en: "Corn", uk: "Кукурудза" },
        shortName: { en: "Corn", uk: "Кукурудза" },
        sortOrder: 1,
      },
      {
        category: "all-seasons",
        code: "WHT_115",
        dbCode: "WHT_115",
        group: "export",
        id: "milling-wheat",
        name: { en: "Milling Wheat", uk: "Продовольча пшениця" },
        shortName: { en: "Milling Wheat", uk: "Продовольча пшениця" },
        sortOrder: 2,
      },
      {
        category: "processors",
        code: "GMO_SOY",
        dbCode: "GMO_SOY",
        group: "processing",
        id: "gmo-soybean",
        name: { en: "GMO soybean", uk: "Соя ГМО" },
        shortName: { en: "GMO soybean", uk: "Соя ГМО" },
        sortOrder: 7,
        vatIncluded: true,
      },
    ],
    deliveryBases: [{ code: "CPT_ODESSA", basketCode: "EXPORT" }],
    id: "spike-ua",
    legalName: { en: "Spike", uk: "Spike" },
    respondents: [],
  }),
}));
vi.mock("@/lib/platform-site", () => ({
  isPlatformSite: () => platformSite,
}));

import {
  __mediaHubPublicationSchedulerTestHooks,
  buildMediaHubTelegramMessages,
  getMediaHubMonitoringPlan,
  getMediaHubPublicationPlan,
  isMediaHubPublicationDue,
  normalizeMediaHubTelegramChatId,
} from "./media-hub-publication-scheduler";
import { buildCortexMarketReportContextPack } from "@/lib/commodity-intelligence-layer";

describe("media hub publication scheduler", () => {
  beforeEach(() => {
    platformSite = false;
    vi.stubEnv("MEDIA_HUB_SCHEDULE_TIMEZONE", "Europe/Kyiv");
    vi.stubEnv("MEDIA_HUB_WEEKLY_REPORT_TIME", "15:00");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes daily on weekdays, weekly on most Saturdays, monthly on fourth Saturday, and nothing on Sunday", () => {
    expect(getMediaHubPublicationPlan("2026-06-19")).toMatchObject({
      kind: "daily",
      reason: "weekday_daily_slot",
      timezone: "Europe/Kyiv",
    });
    expect(getMediaHubPublicationPlan("2026-06-20")).toMatchObject({
      kind: "weekly",
      reason: "saturday_weekly_slot",
    });
    expect(getMediaHubPublicationPlan("2026-06-27")).toMatchObject({
      kind: "monthly",
      reason: "fourth_saturday_monthly_replaces_weekly",
    });
    expect(getMediaHubPublicationPlan("2026-06-21")).toMatchObject({
      kind: "none",
      reason: "no_publication_on_sunday",
    });
  });

  it("runs monitoring only on business days in the Context schedule timezone", () => {
    expect(getMediaHubMonitoringPlan(new Date("2026-06-19T12:00:00.000Z"))).toMatchObject({
      allowed: true,
      date: "2026-06-19",
    });
    expect(getMediaHubMonitoringPlan(new Date("2026-06-20T12:00:00.000Z"))).toMatchObject({
      allowed: false,
      reason: "media_hub_monitoring_disabled_on_weekends",
    });
  });

  it("runs SSI weekday daily reports at 19:10 Kyiv after the 19:00 index publication slot", () => {
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:10:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-01-05T17:10:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:09:00.000Z"))).toBe(false);
  });

  it("runs 1D3X weekday daily reports at 19:15 Kyiv", () => {
    platformSite = true;
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:15:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-01-05T17:15:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:10:00.000Z"))).toBe(false);
  });

  it("runs Saturday weekly/monthly reports at 15:00 Kyiv", () => {
    expect(isMediaHubPublicationDue(new Date("2026-06-20T12:00:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-01-10T13:00:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-06-21T12:00:00.000Z"))).toBe(false);
  });

  it("normalizes Telegram peer ids to supergroup chat ids", () => {
    expect(normalizeMediaHubTelegramChatId("4847957467")).toBe("-1004847957467");
    expect(normalizeMediaHubTelegramChatId("-1004847957467")).toBe("-1004847957467");
    expect(normalizeMediaHubTelegramChatId("353706900")).toBe("353706900");
  });

  it("stores the 1D3X Cortex context pack inside generated Context report content", () => {
    const cortexContextPack = buildCortexMarketReportContextPack({
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

    const content = __mediaHubPublicationSchedulerTestHooks.buildSnapshotReportContent({
      kind: "weekly",
      llm: {
        cortexContextPack,
        localized: {
          en: {
            summary: ["Corn export demand improved in the provided Telegram material."],
            title: "Weekly grain context",
          },
        },
        model: "gpt-4.1-mini",
        provider: "openai",
      },
      manualMaterials: [],
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      snapshots: [
        {
          distribution: [],
          feed: [],
          itemCount: 0,
          label: "Week",
          progressLabel: "7/7",
          pulseCards: [],
          snapshotCards: [],
          sourceCount: 0,
          summaryBody: [],
          summaryTitle: "Weekly grain context",
          topSources: [],
          topTopics: [],
          topicCount: 0,
          window: "week",
        },
      ],
      tenant: "spike",
    });

    expect(content.llm?.cortexContextPack?.product).toBe("1D3X Cortex");
    expect(content.llm?.cortexContextPack?.sourceIds).toContain("mediahub-telegram-materials");
    expect(content.llm?.cortexContextPack?.evidence.map((item) => item.id)).toContain(
      "cortex:material:material-1",
    );
  });

  it("renders SSI daily WhatsApp as a short English Ukraine-focused market update", () => {
    const html = __mediaHubPublicationSchedulerTestHooks.buildSsiDailyWhatsAppText(
      "2026-07-03",
      {
        indexSection: {
          groups: [
            {
              id: "all_season",
              items: [
                {
                  basis: "CPT Odesa, Ukraine (export)",
                  commodityCode: "CORN",
                  dayChange: -2,
                  name: "Corn",
                  previousFridayChange: -3,
                  value: 210,
                  vatIncluded: false,
                },
                {
                  basis: "CPT Odesa, Ukraine (export)",
                  commodityCode: "WHT_115",
                  dayChange: -1,
                  name: "Milling Wheat",
                  previousFridayChange: -6,
                  value: 207,
                  vatIncluded: false,
                },
              ],
              title: "GRAINS EXPORT",
            },
            {
              id: "seasonal",
              items: [
                {
                  basis: "FCA Chop, Ukraine (export)",
                  commodityCode: "RAPESEED_NON_GMO_FCA_CHOP",
                  dayChange: -5,
                  name: "Rapeseed non-GMO FCA Chop",
                  previousFridayChange: 0,
                  value: 565,
                  vatIncluded: false,
                },
              ],
              title: "OILSEEDS EXPORT",
            },
            {
              id: "processing",
              items: [
                {
                  basis: "CPT Crush, Ukraine (processing)",
                  commodityCode: "GMO_SOY",
                  dayChange: 0,
                  name: "GMO soybean",
                  previousFridayChange: -33,
                  value: 459,
                  vatIncluded: true,
                },
              ],
              title: "OILSEEDS CRUSH",
            },
          ],
          title: "Spot Index Ukraine",
        },
        newsSection: {
          themes: [
            {
              id: "grains",
              items: [
                "Ukraine harvest progress remains the key driver for wheat and corn price formation.",
                "Brazil corn exports were active but outside the Ukraine-focused brief.",
              ],
              title: "Grains",
            },
          ],
        },
      },
      [
        "Ukraine fieldwork and harvest progress remain central for grain market pricing.",
        "CBOT wheat futures moved lower without a direct Ukraine price signal.",
      ],
    );
    const text = __mediaHubPublicationSchedulerTestHooks.convertTelegramHtmlToWhatsAppText(html);

    expect(text).toContain("🇺🇦 *SPIKE SPOT INDEX UKRAINE* · *03.07.26*");
    expect(text).toContain("🌎 *EXPORT MARKET*");
    expect(text).toContain("*CPT Odesa, Ukraine*");
    expect(text).toContain("* Corn – 210$ (-2$)");
    expect(text).toContain("* Wheat 11.5pro – 207$ (-1$)");
    expect(text).toContain("* Rapeseed NGMO 40% oil – 565$ (-5$)");
    expect(text).toContain("🏭 *PROCESSING MARKET*");
    expect(text).toContain("* Soybeans GMO 37pro – 459$ incl. VAT (0$)");
    expect(text).toContain("📰 *MARKET OVERVIEW*");
    expect(text).toContain("Export indices: Corn (CPT Odesa, Ukraine) -2$ to 210$");
    expect(text).toContain("🔗 _Powered by 1D3X Platform_ · https://spike.1d3x.com/");
    expect(text).not.toContain("daily report");
    expect(text).not.toContain("*📊 Spot Index Ukraine*");
    expect(text).not.toContain("д/д");
    expect(text).not.toContain("т/т");
  });

  it("keeps SSI daily WhatsApp in the short English format when saved dailyReports are absent", () => {
    const [html] = __mediaHubPublicationSchedulerTestHooks.buildMediaHubWhatsAppMessages({
      content: {
        generatedAt: "2026-07-03T16:10:00.000Z",
        kind: "daily",
        localized: {
          en: {
            summary: [
              "Ukraine fieldwork and harvesting remain central for domestic grain price formation.",
              "CBOT futures moved lower on broad global macro pressure.",
            ],
            title: "Daily report",
          },
        },
        periodEndDate: "2026-07-03",
        periodStartDate: "2026-07-03",
        summary: [],
        title: "SPIKE SPOT INDEX · daily report",
        totals: { items: 0, sources: 0, windows: 0 },
        windows: [],
      },
      kind: "daily",
      latestData: [
        {
          basis: "CPT Odesa, Ukraine (export)",
          changeAbs: -2,
          changePct: -0.9,
          commodityCode: "CORN",
          commodityId: "corn",
          commodityNameEn: "Corn",
          commodityNameUk: "Кукурудза",
          date: "2026-07-03",
          respondents: 4,
          valueUsdPerMt: 210,
        },
        {
          basis: "CPT Crush, Ukraine (processing)",
          changeAbs: 0,
          changePct: 0,
          commodityCode: "GMO_SOY",
          commodityId: "gmo-soybean",
          commodityNameEn: "GMO soybean",
          commodityNameUk: "Соя ГМО",
          date: "2026-07-03",
          respondents: 3,
          valueUsdPerMt: 459,
        },
      ],
      locale: "en",
      periodEndDate: "2026-07-03",
      tenant: "spike",
    });
    const text = __mediaHubPublicationSchedulerTestHooks.convertTelegramHtmlToWhatsAppText(html);

    expect(text).toContain("🇺🇦 *SPIKE SPOT INDEX UKRAINE* · *03.07.26*");
    expect(text).toContain("* Corn – 210$ (-2$)");
    expect(text).toContain("* Soybeans GMO 37pro – 459$ incl. VAT (0$)");
    expect(text).toContain("📰 *MARKET OVERVIEW*");
    expect(text).toContain("Export indices: Corn (CPT Odesa, Ukraine) -2$ to 210$");
    expect(text).not.toContain("daily report");
    expect(text).not.toContain("*📊 Spot Index Ukraine*");
    expect(text).not.toContain("д/д");
  });

  it("refreshes saved SSI daily Telegram index values from the latest published snapshot", () => {
    const [html] = buildMediaHubTelegramMessages({
      content: {
        dailyReports: {
          uk: {
            indexSection: {
              date: "2026-07-06",
              groups: [
                {
                  id: "all_season",
                  items: [
                    {
                      basis: "FCA Chop, Ukraine (export)",
                      comment: "",
                      commodityCode: "CORN_FCA_CHOP",
                      dayChange: -161,
                      groupId: "all_season",
                      name: "Кукурудза FCA Чоп",
                      previousFridayChange: null,
                      previousFridayDate: null,
                      sortOrder: 4,
                      unit: "USD/t",
                      value: 200,
                      vatIncluded: false,
                    },
                  ],
                  subtitle: "основні індекси",
                  title: "GRAINS EXPORT",
                },
              ],
              notes: [],
              title: "Spot Index Ukraine",
            },
            newsSection: { themes: [], title: "Daily" },
          },
        },
        generatedAt: "2026-07-06T16:10:00.000Z",
        kind: "daily",
        localized: {},
        periodEndDate: "2026-07-06",
        periodStartDate: "2026-07-06",
        summary: [],
        title: "Daily",
        totals: { items: 0, sources: 0, windows: 0 },
        windows: [],
      },
      kind: "daily",
      latestData: [
        {
          basis: "FCA Chop, Ukraine (export)",
          changeAbs: 3,
          changePct: 1.35,
          commodityCode: "CORN_FCA_CHOP",
          commodityId: "corn-fca-chop",
          commodityNameEn: "Corn FCA Chop",
          commodityNameUk: "Кукурудза FCA Чоп",
          date: "2026-07-06",
          respondents: 19,
          valueUsdPerMt: 225,
        },
      ],
      locale: "uk",
      periodEndDate: "2026-07-06",
      tenant: "spike",
    });

    expect(html).toContain("• Кукурудза - 225$ (+3$)");
    expect(html).not.toContain("-161$");
    expect(html).not.toContain("200$");
  });

  it("omits external market facts from SSI daily Telegram overview", () => {
    const [html] = buildMediaHubTelegramMessages({
      content: {
        dailyReports: {
          uk: {
            indexSection: undefined,
            newsSection: {
              themes: [
                {
                  id: "key_signals",
                  items: [
                    "Експорт за квітень склав 1 млн тонн і не є поточною новиною.",
                    "Стан посівів кукурудзи у Франції найгірший за 13 років, що підтримує попит на українську кукурудзу.",
                  ],
                  title: "🔎 Головні сигнали",
                },
              ],
              title: "Daily",
            },
          },
        },
        generatedAt: "2026-07-06T16:10:00.000Z",
        kind: "daily",
        localized: {},
        periodEndDate: "2026-07-06",
        periodStartDate: "2026-07-06",
        summary: [],
        title: "Daily",
        totals: { items: 0, sources: 0, windows: 0 },
        windows: [],
      },
      kind: "daily",
      latestData: [],
      locale: "uk",
      periodEndDate: "2026-07-06",
      tenant: "spike",
    });

    expect(html).not.toContain("Франції");
    expect(html).not.toContain("квітень");
  });

  it("filters SSI weekly WhatsApp overview to Ukraine-focused market context", () => {
    const html = __mediaHubPublicationSchedulerTestHooks.buildSsiNonDailyWhatsAppMessages(
      "2026-07-04",
      "weekly",
      {
        generatedAt: "2026-07-04T12:00:00.000Z",
        kind: "weekly",
        localized: {
          en: {
            summary: [
              "Ukraine harvesting progress and port logistics shaped grain price expectations.",
              "Brazil soybean exports accelerated on stronger China demand.",
            ],
            title: "Weekly report",
          },
        },
        periodEndDate: "2026-07-04",
        periodStartDate: "2026-06-29",
        summary: [],
        title: "Weekly report",
        totals: { items: 0, sources: 0, windows: 0 },
        windows: [],
      },
    );
    const text = html
      .map(__mediaHubPublicationSchedulerTestHooks.convertTelegramHtmlToWhatsAppText)
      .join("\n\n");

    expect(html).toHaveLength(3);
    expect(text).toContain("SPIKE BROKERS | Weekly Commodity & Logistics Market");
    expect(text).toContain("Ukraine harvesting progress and port logistics");
    expect(text).not.toContain("Brazil soybean exports");
  });

  it("sends SSI WhatsApp webhook messages with an abort signal", async () => {
    vi.stubEnv("SSI_WHATSAPP_ENABLED", "1");
    vi.stubEnv("SSI_WHATSAPP_WEBHOOK_URL", "https://worker.example.com/send");
    vi.stubEnv("SSI_WHATSAPP_WEBHOOK_SECRET", "worker-secret");
    vi.stubEnv("SSI_WHATSAPP_TARGET_GROUP_NAME", "SPIKE INDEX");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    ));

    try {
      await expect(__mediaHubPublicationSchedulerTestHooks.sendMediaHubReportWhatsApp({
        content: {
          generatedAt: "2026-07-04T12:00:00.000Z",
          kind: "weekly",
          localized: {
            en: {
              summary: ["Ukraine port logistics supported grain market execution."],
              title: "Weekly report",
            },
          },
          periodEndDate: "2026-07-04",
          periodStartDate: "2026-06-29",
          summary: [],
          title: "Weekly report",
          totals: { items: 0, sources: 0, windows: 0 },
          windows: [],
        },
        kind: "weekly",
        locale: "en",
        periodEndDate: "2026-07-04",
        tenant: "spike",
      })).resolves.toMatchObject({ messageCount: 3, status: "sent" });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
