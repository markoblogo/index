import "server-only";

import { createHash } from "node:crypto";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";

type FeedSourceCategory =
  | "agro-general"
  | "grain-oilseeds"
  | "logistics-shipping"
  | "policy-macro";

type RssSource = {
  id: string;
  name: string;
  url: string;
  category: FeedSourceCategory;
  enabled: boolean;
};

type ParsedFeedItem = {
  title: string;
  link: string;
  summary?: string;
  publishedAt?: string;
};

type RssNewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  topicTags: string[];
  cropTags: string[];
  regionTags: string[];
  relevanceScore: number;
  category: FeedSourceCategory;
};

type CacheEntry = {
  generatedAt: number;
  items: RssNewsItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 7_000;
let cache: CacheEntry | null = null;

const RSS_SOURCES: RssSource[] = [
  { id: "brownfield-main", name: "Brownfield Ag News", url: "https://brownfieldagnews.com/feed/", category: "agro-general", enabled: true },
  { id: "brownfield-markets", name: "Brownfield Markets", url: "https://brownfieldagnews.com/category/markets/feed/", category: "agro-general", enabled: true },
  { id: "brownfield-weather", name: "Brownfield Weather", url: "https://brownfieldagnews.com/category/weather/feed/", category: "agro-general", enabled: true },
  { id: "farmersweekly-world", name: "Farmers Weekly Markets", url: "https://www.fwi.co.uk/markets/feed", category: "agro-general", enabled: true },
  { id: "agweb-markets", name: "AgWeb Markets", url: "https://www.agweb.com/rss.xml", category: "agro-general", enabled: true },
  { id: "world-grain-news", name: "World Grain", url: "https://www.world-grain.com/rss/topic/2670-world-grain-news", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-news", name: "Grain Central", url: "https://www.graincentral.com/feed/", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-markets", name: "Grain Central Markets", url: "https://www.graincentral.com/markets/feed", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-trade", name: "Grain Central Trade", url: "https://www.graincentral.com/trade/feed", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-production", name: "Grain Central Production", url: "https://www.graincentral.com/production/feed", category: "grain-oilseeds", enabled: true },
  { id: "farmdoc-daily", name: "farmdoc daily", url: "https://farmdocdaily.illinois.edu/feed", category: "grain-oilseeds", enabled: true },
  { id: "agrimoney", name: "Agrimoney", url: "https://www.agrimoney.com/rss", category: "grain-oilseeds", enabled: true },
  { id: "mundus-agri", name: "Mundus Agri", url: "https://mundus-agri.eu/feed/", category: "grain-oilseeds", enabled: true },
  { id: "biofuels-news", name: "Biofuels News", url: "https://biofuels-news.com/rss", category: "grain-oilseeds", enabled: true },
  { id: "farms-markets", name: "Farms.com Markets", url: "https://m.farms.com/farmspages/generate_rss_portal/tabid/2854/default.aspx", category: "agro-general", enabled: true },
  { id: "sovecon", name: "SovEcon", url: "https://sovecon.com/en/feed/", category: "grain-oilseeds", enabled: true },
  { id: "barchart-grains", name: "Barchart Grains News", url: "https://www.barchart.com/feeds/news/getFeed.php?feed=bcnews_grains", category: "grain-oilseeds", enabled: true },
  { id: "splash247", name: "Splash247 Shipping", url: "https://splash247.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "gcaptain", name: "gCaptain", url: "https://gcaptain.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "marine-insight", name: "Marine Insight", url: "https://www.marineinsight.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "freightwaves", name: "FreightWaves", url: "https://www.freightwaves.com/news/feed", category: "logistics-shipping", enabled: true },
  { id: "ein-shipping", name: "EIN Shipping & Logistics", url: "https://shipping.einnews.com/rss", category: "logistics-shipping", enabled: true },
  { id: "hellenic-shipping-news", name: "Hellenic Shipping News", url: "https://www.hellenicshippingnews.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "agri-pulse-free", name: "Agri-Pulse", url: "https://www.agri-pulse.com/rss/topic/34-rss", category: "policy-macro", enabled: true },
  { id: "agdaily", name: "AGDAILY", url: "https://www.agdaily.com/feed/", category: "agro-general", enabled: true },
  { id: "oecd-agri", name: "OECD Agriculture", url: "https://www.oecd.org/agriculture/rss.xml", category: "policy-macro", enabled: true },
  { id: "wto-news", name: "WTO News", url: "https://www.wto.org/english/news_e/news_e.xml", category: "policy-macro", enabled: true },
  { id: "ec-agri", name: "EU Agriculture and Rural Development", url: "https://agriculture.ec.europa.eu/news/rss_en", category: "policy-macro", enabled: true },
  { id: "fao-news", name: "FAO News", url: "https://www.fao.org/news/rss/en/", category: "policy-macro", enabled: true },
];

const STOPWORDS = [
  "celebrity",
  "gaming",
  "smartphone",
  "movie trailer",
  "coupon",
  "giveaway",
  "fashion",
  "casino",
  "esports",
  "tv show",
];

const CROPS = [
  "wheat", "corn", "maize", "soybean", "soybeans", "soy", "rapeseed", "canola", "sunflower", "barley", "oilseed", "oilseeds", "meal", "crush",
];
const TRADE = [
  "harvest", "yield", "crop", "acreage", "planting", "export", "import", "tender", "futures", "basis", "stocks", "shipments",
];
const LOGISTICS = [
  "freight", "vessel", "rail", "barge", "port", "terminal", "shipping", "logistics", "river", "container", "chokepoint", "panama canal", "suez", "demurrage",
];
const WEATHER = [
  "drought", "rainfall", "precipitation", "soil moisture", "heat", "frost", "weather", "storm", "flood", "temperature",
];
const POLICY = [
  "tariff", "quota", "sanctions", "export ban", "export duty", "regulation", "duties", "subsidy", "mandate", "restriction", "trade agreement", "compliance",
];
const REGIONS = [
  "ukraine", "black sea", "eu", "france", "germany", "romania", "bulgaria", "poland", "us", "brazil", "argentina", "russia", "india", "china",
];

export async function get1d3xRssWindows(): Promise<MediaHubWindowSnapshot[]> {
  const items = await getRssMonitorItems();
  const now = Date.now();

  return [
    buildWindow(items, now - 24 * 60 * 60 * 1000, "day", "Day", "1/1"),
    buildWindow(items, now - 7 * 24 * 60 * 60 * 1000, "week", "7 Days", "7/7"),
    buildWindow(items, now - 30 * 24 * 60 * 60 * 1000, "month", "30 Days", "30/30"),
  ];
}

async function getRssMonitorItems() {
  if (cache && Date.now() - cache.generatedAt < CACHE_TTL_MS) {
    return cache.items;
  }

  const fetched = await Promise.all(
    RSS_SOURCES.filter((source) => source.enabled).map(async (source) => {
      try {
        const feedItems = await fetchFeed(source);
        return feedItems.map((item) => toNewsItem(source, item));
      } catch {
        return [] as RssNewsItem[];
      }
    }),
  );

  const items = dedupeItems(fetched.flat())
    .filter((item) => item.relevanceScore >= 3)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  cache = {
    generatedAt: Date.now(),
    items,
  };

  return items;
}

async function fetchFeed(source: RssSource): Promise<ParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "user-agent": "1D3XMediaHub/1.0 (+https://1d3x.com)",
      },
      next: { revalidate: 600 },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseFeedXml(xml);
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeedXml(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)];

  for (const match of blocks) {
    const block = match[0];
    const title = extractTagValue(block, "title") || "";
    const link = extractTagValue(block, "link") || "";
    const summary =
      extractTagValue(block, "description") ||
      extractTagValue(block, "summary") ||
      extractTagValue(block, "content") ||
      undefined;
    const publishedAt =
      extractTagValue(block, "pubDate") ||
      extractTagValue(block, "published") ||
      extractTagValue(block, "updated") ||
      undefined;

    if (title && link) {
      items.push({ title, link, summary, publishedAt });
    }
  }

  return items;
}

function extractTagValue(block: string, tag: string): string | null {
  const fullTagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const fullTag = block.match(fullTagRegex);
  if (fullTag?.[1]) {
    return decodeXml(stripHtml(fullTag[1]));
  }

  if (tag === "link") {
    const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
    if (atomLink?.[1]) {
      return decodeXml(atomLink[1]);
    }
  }

  return null;
}

function stripHtml(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXml(raw: string) {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function toNewsItem(source: RssSource, item: ParsedFeedItem): RssNewsItem {
  const title = item.title.trim();
  const summary = stripHtml(item.summary || "");
  const scored = scoreNews(title, summary, source.category);
  const publishedAt =
    item.publishedAt && Number.isFinite(Date.parse(item.publishedAt))
      ? new Date(item.publishedAt).toISOString()
      : new Date().toISOString();
  const id = createHash("sha1")
    .update(`${source.id}|${normalizeTitle(title)}|${item.link}`)
    .digest("hex")
    .slice(0, 20);

  return {
    category: source.category,
    cropTags: scored.cropTags,
    id,
    publishedAt,
    regionTags: scored.regionTags,
    relevanceScore: scored.relevanceScore,
    source: source.name,
    summary,
    title,
    topicTags: scored.topicTags,
    url: item.link,
  };
}

function scoreNews(titleRaw: string, summaryRaw: string, category: FeedSourceCategory) {
  const title = titleRaw.toLowerCase();
  const body = `${title} ${summaryRaw.toLowerCase()}`;
  const cropTags = matchKeywords(body, CROPS);
  const tradeTags = matchKeywords(body, TRADE);
  const logisticsTags = matchKeywords(body, LOGISTICS);
  const weatherTags = matchKeywords(body, WEATHER);
  const policyTags = matchKeywords(body, POLICY);
  const regionTags = matchKeywords(body, REGIONS);
  const penalty = STOPWORDS.reduce((sum, word) => sum + (body.includes(word) ? 2 : 0), 0);

  let relevanceScore =
    cropTags.length * 2 +
    tradeTags.length * 2 +
    logisticsTags.length +
    weatherTags.length +
    policyTags.length +
    regionTags.length -
    penalty;

  if (category === "logistics-shipping") relevanceScore += 1;
  if (category === "policy-macro") relevanceScore += 1;

  const topicTags = new Set<string>();
  if (tradeTags.length > 0) {
    topicTags.add("markets");
    topicTags.add("trade");
  }
  if (logisticsTags.length > 0) topicTags.add("logistics");
  if (weatherTags.length > 0) topicTags.add("weather");
  if (policyTags.length > 0) topicTags.add("policy");

  return {
    cropTags: normalizeCropTags(cropTags),
    regionTags,
    relevanceScore,
    topicTags: [...topicTags],
  };
}

function matchKeywords(body: string, keywords: string[]) {
  return keywords.filter((word) => body.includes(word));
}

function normalizeCropTags(values: string[]) {
  return [...new Set(values.map((value) => {
    if (value.startsWith("soy")) return "soy";
    if (value === "canola" || value === "rapeseed") return "rapeseed";
    return value;
  }))];
}

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeItems(items: RssNewsItem[]) {
  const map = new Map<string, RssNewsItem>();

  for (const item of items) {
    const key = `${item.source}|${normalizeTitle(item.title)}`;
    const existing = map.get(key);
    if (!existing || Date.parse(item.publishedAt) > Date.parse(existing.publishedAt)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function buildWindow(
  items: RssNewsItem[],
  sinceMs: number,
  window: "day" | "week" | "month",
  label: string,
  progressLabel: string,
): MediaHubWindowSnapshot {
  const filtered = items.filter((item) => Date.parse(item.publishedAt) >= sinceMs);
  const topSources = countBy(filtered, (item) => item.source).slice(0, 4);
  const topTopics = countBy(
    filtered.flatMap((item) => item.topicTags.map((tag) => ({ tag }))),
    (item) => item.tag,
  )
    .slice(0, 4)
    .map(({ count, label: topic }) => ({
      count,
      hint: topicHint(topic),
      label: topicLabel(topic),
    }));
  const categoryCounts = countBy(filtered, (item) => sourceLabel(item.category)).slice(0, 5);
  const totalSources = new Set(filtered.map((item) => item.source)).size;

  return {
    distribution: categoryCounts.map((item) => ({
      color: sourceColor(item.label),
      label: item.label,
      value: Math.max(1, Math.round((item.count / Math.max(filtered.length, 1)) * 100)),
    })),
    feed: filtered.slice(0, 6).map((item) => ({
      id: item.id,
      source: item.source,
      sourceType: "RSS",
      summary: item.summary.slice(0, 240),
      tags: item.topicTags.slice(0, 3).map(topicLabel),
      time: formatDate(item.publishedAt),
      title: item.title,
      tone: item.relevanceScore >= 8 ? "elevated" : "normal",
    })),
    itemCount: filtered.length,
    label,
    progressLabel,
    pulseCards: topTopics.slice(0, 3).map((item, index) => ({
      hint: item.hint,
      label: item.label,
      tone: (index === 0 ? "sky" : index === 1 ? "green" : "amber") as "sky" | "green" | "amber",
      value: Math.max(1, Math.min(10, Math.round((item.count / Math.max(filtered.length, 1)) * 40))),
    })),
    snapshotCards: [
      { label: "Sources", note: "active in window", value: String(totalSources) },
      { label: "Items", note: "accepted after scoring", value: String(filtered.length) },
      { label: "Topics", note: "keyword clusters", value: String(topTopics.length) },
    ],
    sourceCount: totalSources,
    summaryBody: buildSummary(filtered, topTopics, topSources, window),
    summaryTitle:
      window === "day"
        ? "Global commodity monitoring brief"
        : window === "week"
          ? "Weekly global synthesis"
          : "30-day media intelligence layer",
    topSources,
    topTopics,
    topicCount: topTopics.length,
    window,
  };
}

function buildSummary(
  items: RssNewsItem[],
  topTopics: Array<{ count: number; hint: string; label: string }>,
  topSources: Array<{ count: number; label: string }>,
  window: "day" | "week" | "month",
) {
  const topicText = topTopics.map((item) => item.label).join(", ");
  const sourceText = topSources.map((item) => item.label).join(", ");
  const label = window === "day" ? "day" : window === "week" ? "7-day" : "30-day";

  return [
    `The ${label} monitoring window currently holds ${items.length} accepted items from the transferred Cropto RSS mesh.`,
    `The strongest active themes are ${topicText || "current monitoring context"}, with the densest source contribution coming from ${sourceText || "the active feed mesh"}.`,
    "This is the keyless layer transferred from the legacy 30days logic: a broad RSS/Atom network that can run immediately without waiting for paid API credentials.",
  ];
}

function countBy<T>(items: T[], pick: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ count, label }))
    .sort((a, b) => b.count - a.count);
}

function sourceLabel(category: FeedSourceCategory) {
  if (category === "grain-oilseeds") return "Grain / oilseeds";
  if (category === "logistics-shipping") return "Logistics";
  if (category === "policy-macro") return "Policy / macro";
  return "Agro general";
}

function sourceColor(label: string) {
  if (label === "Logistics") return "#7be7ff";
  if (label === "Grain / oilseeds") return "#9dff7a";
  if (label === "Policy / macro") return "#ffd869";
  return "#a78bfa";
}

function topicLabel(topic: string) {
  if (topic === "markets") return "Markets";
  if (topic === "trade") return "Trade";
  if (topic === "logistics") return "Logistics";
  if (topic === "weather") return "Weather";
  if (topic === "policy") return "Policy";
  return topic;
}

function topicHint(topic: string) {
  if (topic === "markets") return "Price tone, futures and basis";
  if (topic === "trade") return "Demand, exports and tenders";
  if (topic === "logistics") return "Freight, ports and execution";
  if (topic === "weather") return "Crop risk and field conditions";
  if (topic === "policy") return "Regulation, tariffs and macro context";
  return "Topic cluster";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
