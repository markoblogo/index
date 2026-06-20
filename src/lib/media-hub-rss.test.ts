import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { __mediaHubRssTestHooks } from "@/lib/media-hub-rss";

const {
  canonicalizeUrl,
  dedupeItems,
  gdeltDocUrl,
  googleNewsUrl,
  isBlockedOrPaywalledSource,
  isDuplicateGlobalSourceFamily,
  isDuplicateSpikeTelegramSource,
  isUnsafeMonitoringCandidate,
  normalizeTitle,
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
});
