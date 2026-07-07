import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { __mediaHubRssTestHooks } from "@/lib/media-hub-rss";

const {
  blueskyPostUrl,
  buildWindow,
  canonicalizeUrl,
  dedupeItems,
  gdeltDocUrl,
  googleNewsUrl,
  isBlockedOrPaywalledSource,
  isDuplicateGlobalSourceFamily,
  isDuplicateSpikeTelegramSource,
  isUnsafeMonitoringCandidate,
  listCorporateMediaHubRssSources,
  normalizeTitle,
  parseBlogHtmlList,
  readLegacyLast30DaysPayload,
  scoreNews,
} = __mediaHubRssTestHooks;

function item(input: {
  publishedAt?: string;
  relevanceScore?: number;
  source?: string;
  title: string;
  url?: string;
}) {
  return {
    category: "grain-oilseeds",
    cropTags: [],
    id: input.title,
    publishedAt: input.publishedAt ?? "2026-06-20T10:00:00.000Z",
    regionTags: [],
    relevanceScore: input.relevanceScore ?? 5,
    source: input.source ?? "Direct",
    summary: "",
    title: input.title,
    topicTags: [],
    url: input.url ?? "",
  } as Parameters<typeof dedupeItems>[0][number];
}

describe("media hub RSS source hygiene", () => {
  it("canonicalizes URLs before cross-source dedupe", () => {
    expect(canonicalizeUrl("https://www.example.com/news/a?utm_source=x&fbclid=1#frag"))
      .toBe("https://example.com/news/a");
  });

  it("dedupes direct, Google News and GDELT copies by canonical URL or normalized title", () => {
    const result = dedupeItems([
      item({
        source: "Direct",
        title: "Ukraine grain exports through Danube ports",
        url: "https://example.com/news/ukraine-grain?utm_source=rss",
      }),
      item({
        publishedAt: "2026-06-20T11:00:00.000Z",
        source: "Google News",
        title: "Ukraine grain exports through Danube ports",
        url: "https://example.com/news/ukraine-grain",
      }),
      item({
        source: "GDELT",
        title: "Ukraine grain exports through Danube ports!",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("Google News");
    expect(normalizeTitle(result[0].title)).toBe("ukraine grain exports through danube ports");
  });

  it("keeps same title fingerprints separate outside the 14-day duplicate window", () => {
    const result = dedupeItems([
      item({
        publishedAt: "2026-06-01T10:00:00.000Z",
        source: "Direct",
        title: "USDA releases wheat crop forecast",
      }),
      item({
        publishedAt: "2026-06-10T10:00:00.000Z",
        source: "GDELT",
        title: "USDA releases wheat crop forecast",
      }),
      item({
        publishedAt: "2026-06-20T10:00:00.000Z",
        source: "Google News",
        title: "USDA releases wheat crop forecast",
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("flags existing Telegram-backed SPIKE source domains as duplicates", () => {
    expect(isDuplicateSpikeTelegramSource("https://latifundist.com/news")).toBe(true);
    expect(isDuplicateSpikeTelegramSource("www.superagronom.com")).toBe(true);
    expect(isDuplicateSpikeTelegramSource("en.usm.media")).toBe(false);
  });

  it("flags existing global source families before adding new feeds", () => {
    expect(isDuplicateGlobalSourceFamily("https://www.freightwaves.com/news/feed")).toBe(true);
    expect(isDuplicateGlobalSourceFamily("https://publications.jrc.ec.europa.eu/repository/")).toBe(true);
    expect(isDuplicateGlobalSourceFamily("https://new-source.example/feed")).toBe(false);
  });

  it("keeps Ukraine grain logistics above generic non-market noise", () => {
    const relevant = scoreNews(
      "Ukraine grain exports move through Danube and rail border logistics",
      "Wheat and corn shipments continue via ports and rail corridors.",
      "logistics-shipping",
    );
    const noise = scoreNews(
      "Celebrity gaming giveaway launches new smartphone",
      "Casino and movie trailer news unrelated to commodities.",
      "agro-general",
    );

    expect(relevant.relevanceScore).toBeGreaterThan(noise.relevanceScore);
    expect(relevant.topicTags).toContain("logistics");
  });

  it("scores global commodity fundamentals above generic logistics noise", () => {
    const relevant = scoreNews(
      "Brazil soybean exports rise as Rosario corn and wheat tenders support global grain trade",
      "Crop forecasts, port flows, freight and import demand remain active market drivers.",
      "grain-oilseeds",
    );
    const noise = scoreNews(
      "Passenger rail app launches ecommerce logistics feature",
      "Consumer mobility software and parcel dashboards with no physical commodity signal.",
      "logistics-shipping",
    );

    expect(relevant.relevanceScore).toBeGreaterThan(noise.relevanceScore);
    expect(relevant.topicTags).toEqual(expect.arrayContaining(["markets", "trade", "logistics"]));
  });

  it("quarantines unsafe monitoring candidates", () => {
    expect(isUnsafeMonitoringCandidate("Casino slot giveaway", "not an agri-market signal")).toBe(true);
    expect(isUnsafeMonitoringCandidate("Ukraine wheat exports rise", "port shipments and tenders")).toBe(false);
  });

  it("recognizes blocked or paywalled source responses without archiving bodies", () => {
    expect(isBlockedOrPaywalledSource(403)).toBe(true);
    expect(isBlockedOrPaywalledSource(200, "text/html; paywall=true")).toBe(true);
    expect(isBlockedOrPaywalledSource(200, "application/rss+xml")).toBe(false);
  });

  it("builds no-key discovery URLs for Google News RSS and GDELT", () => {
    expect(googleNewsUrl("Ukraine grain export")).toContain("news.google.com/rss/search");
    expect(gdeltDocUrl("Ukraine grain export")).toContain("api.gdeltproject.org/api/v2/doc/doc");
  });

  it("registers first-party corporate Media Hub sources without duplicates", () => {
    const sources = listCorporateMediaHubRssSources();
    const ids = sources.map((source) => source.id);

    expect(ids).toEqual(expect.arrayContaining([
      "mn7r_blog",
      "spike_spot_index_blog",
      "id3x_blog",
      "mn7r_bluesky",
    ]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(sources.find((source) => source.id === "mn7r_blog")).toMatchObject({
      corporateOwned: true,
      sourceFamily: "corporate_blog",
      sourceTrust: "first_party",
      transport: "html-blog",
    });
    expect(sources.find((source) => source.id === "spike_spot_index_blog")).toMatchObject({
      primaryTenants: ["spike-ua"],
      secondaryTenants: ["1d3x"],
    });
    expect(sources.find((source) => source.id === "id3x_blog")).toMatchObject({
      primaryTenants: ["1d3x"],
      secondaryTenants: ["spike-ua"],
    });
    expect(sources.find((source) => source.id === "mn7r_bluesky")).toMatchObject({
      handle: "mn7r.bsky.social",
      transport: "bluesky-author-feed",
    });
  });

  it("keeps raw monitoring metadata on accepted feed items", () => {
    const window = buildWindow([
      item({
        relevanceScore: 8,
        title: "Ukraine wheat exports rise through Odesa ports",
        url: "https://example.com/wheat",
      }),
    ], Date.parse("2026-06-20T00:00:00.000Z"), "day", "Day", {
      sources: [],
      summaryScope: "ukraine",
      timezone: "Europe/Kyiv",
    });

    expect(window.feed[0]).toMatchObject({
      processingState: "accepted_after_scoring",
      relevanceScore: 8,
      sourceUrl: "https://example.com/wheat",
    });
  });

  it("parses HTML blog list fallback and dedupes canonical article URLs", () => {
    const items = parseBlogHtmlList(`
      <html><body>
        <a href="/blog/grain-market-update?utm_source=x">Grain market update</a><p>Wheat and corn logistics.</p>
        <a href="https://mn7r.com/blog/grain-market-update">Grain market update</a>
        <a href="/contact">Contact</a>
      </body></html>
    `, "https://mn7r.com/blog");

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      link: "https://mn7r.com/blog/grain-market-update?utm_source=x",
      title: "Grain market update",
    });
  });

  it("derives canonical Bluesky post URLs from AT URIs", () => {
    expect(blueskyPostUrl(
      "mn7r.bsky.social",
      "at://did:plc:abc/app.bsky.feed.post/3lxyz",
    )).toBe("https://bsky.app/profile/mn7r.bsky.social/post/3lxyz");
  });

  it("applies an abort signal to legacy Last30Days JSON URL fetches", async () => {
    const previousUrl = process.env.LAST30DAYS_JSON_URL;
    const previousPath = process.env.LAST30DAYS_JSON_PATH;
    process.env.LAST30DAYS_JSON_URL = "https://example.com/last30days.json";
    delete process.env.LAST30DAYS_JSON_PATH;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ title: "Ukraine wheat exports", url: "https://example.com/a" }]), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );

    try {
      await expect(readLegacyLast30DaysPayload()).resolves.toEqual([
        { title: "Ukraine wheat exports", url: "https://example.com/a" },
      ]);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      fetchMock.mockRestore();
      if (previousUrl === undefined) {
        delete process.env.LAST30DAYS_JSON_URL;
      } else {
        process.env.LAST30DAYS_JSON_URL = previousUrl;
      }
      if (previousPath === undefined) {
        delete process.env.LAST30DAYS_JSON_PATH;
      } else {
        process.env.LAST30DAYS_JSON_PATH = previousPath;
      }
    }
  });
});
