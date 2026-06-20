import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  getMediaHubWindowProgressLabel,
  type MediaHubWindowSnapshot,
} from "@/lib/media-hub";

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

type LegacyLast30DaysItem = {
  category?: string;
  link?: string;
  publishedAt?: string;
  published_at?: string;
  source?: string;
  source_name?: string;
  summary?: string;
  text?: string;
  title?: string;
  topicTags?: string[];
  topics?: string[];
  url?: string;
};

type CacheEntry = {
  generatedAt: number;
  items: RssNewsItem[];
};

type ExtraRssNewsItem = {
  publishedAt?: string;
  source: string;
  summary: string;
  title: string;
  topicTags?: string[];
  url?: string;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 7_000;
const cache = new Map<string, CacheEntry>();

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
  { id: "amis-outlook", name: "AMIS", url: "https://www.amis-outlook.org/rss.xml", category: "policy-macro", enabled: true },
  { id: "ahdb-news", name: "AHDB", url: "https://ahdb.org.uk/rss", category: "grain-oilseeds", enabled: true },
  { id: "mintec-top-stories", name: "Expana / Mintec", url: "https://www.mintecglobal.com/top-stories/rss.xml", category: "grain-oilseeds", enabled: true },
  { id: "kyiv-post", name: "Kyiv Post", url: "https://www.kyivpost.com/feed", category: "policy-macro", enabled: true },
  { id: "oecd-agri", name: "OECD Agriculture", url: "https://www.oecd.org/agriculture/rss.xml", category: "policy-macro", enabled: true },
  { id: "wto-news", name: "WTO News", url: "https://www.wto.org/english/news_e/news_e.xml", category: "policy-macro", enabled: true },
  { id: "ec-agri", name: "EU Agriculture and Rural Development", url: "https://agriculture.ec.europa.eu/news/rss_en", category: "policy-macro", enabled: true },
  { id: "fao-news", name: "FAO News", url: "https://www.fao.org/news/rss/en/", category: "policy-macro", enabled: true },
];

const SPIKE_EN_UKRAINE_RSS_SOURCES: RssSource[] = [
  { id: "ukragroconsult-en", name: "UkrAgroConsult EN", url: "https://ukragroconsult.com/en/news/feed/", category: "grain-oilseeds", enabled: true },
  { id: "kyiv-post-ukraine", name: "Kyiv Post", url: "https://www.kyivpost.com/feed", category: "policy-macro", enabled: true },
  { id: "interfax-ukraine-en", name: "Interfax-Ukraine EN", url: "https://en.interfax.com.ua/news/economic/", category: "policy-macro", enabled: true },
  { id: "mintec-ukraine", name: "Expana / Mintec", url: "https://www.mintecglobal.com/top-stories/rss.xml", category: "grain-oilseeds", enabled: true },
  { id: "amis-ukraine-context", name: "AMIS", url: "https://www.amis-outlook.org/rss.xml", category: "policy-macro", enabled: true },
  { id: "fao-ukraine-context", name: "FAO News", url: "https://www.fao.org/news/rss/en/", category: "policy-macro", enabled: true },
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
  const items = await getRssMonitorItems({
    cacheKey: "1d3x-global",
    includeLegacy: true,
    sources: RSS_SOURCES,
  });
  const now = Date.now();

  return [
    buildWindow(items, now - 24 * 60 * 60 * 1000, "day", "Day", {
      sources: RSS_SOURCES,
      summaryScope: "global",
      timezone: "Europe/Paris",
    }),
    buildWindow(items, now - 7 * 24 * 60 * 60 * 1000, "week", "7 Days", {
      sources: RSS_SOURCES,
      summaryScope: "global",
      timezone: "Europe/Paris",
    }),
    buildWindow(items, now - 30 * 24 * 60 * 60 * 1000, "month", "30 Days", {
      sources: RSS_SOURCES,
      summaryScope: "global",
      timezone: "Europe/Paris",
    }),
  ];
}

export async function getSpikeUkraineEnglishRssWindows(
  extraItems: ExtraRssNewsItem[] = [],
): Promise<MediaHubWindowSnapshot[]> {
  const items = await getRssMonitorItems({
    acceptAllFallback: true,
    cacheKey: "spike-en-ukraine",
    extraItems,
    includeLegacy: false,
    sources: SPIKE_EN_UKRAINE_RSS_SOURCES,
  });
  const now = Date.now();
  const options = {
    extraSourceCount: extraItems.length > 0 ? 1 : 0,
    sources: SPIKE_EN_UKRAINE_RSS_SOURCES,
    summaryScope: "ukraine" as const,
    timezone: "Europe/Kyiv",
  };

  return [
    buildWindow(items, now - 24 * 60 * 60 * 1000, "day", "Day", options),
    buildWindow(items, now - 7 * 24 * 60 * 60 * 1000, "week", "7 Days", options),
    buildWindow(items, now - 30 * 24 * 60 * 60 * 1000, "month", "30 Days", options),
  ];
}

async function getRssMonitorItems(input: {
  acceptAllFallback?: boolean;
  cacheKey: string;
  extraItems?: ExtraRssNewsItem[];
  includeLegacy: boolean;
  sources: RssSource[];
}) {
  const cached = cache.get(input.cacheKey);
  const extraItems = mapExtraItems(input.extraItems ?? []);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return dedupeItems([...cached.items, ...extraItems]);
  }

  const [fetched, legacyItems] = await Promise.all([
    Promise.all(
      input.sources.filter((source) => source.enabled).map(async (source) => {
        try {
          const feedItems = await fetchFeed(source);
          return feedItems.map((item) => toNewsItem(source, item));
        } catch {
          return [] as RssNewsItem[];
        }
      }),
    ),
    input.includeLegacy ? getLegacyLast30DaysItems() : Promise.resolve([] as RssNewsItem[]),
  ]);

  const scoredItems = dedupeItems([...fetched.flat(), ...legacyItems])
    .sort((a, b) => b.relevanceScore - a.relevanceScore || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const highlyRelevant = scoredItems.filter((item) => item.relevanceScore >= 3);
  const fallbackRelevant = scoredItems.filter((item) => item.relevanceScore > 0);
  const items =
    highlyRelevant.length >= 24
      ? highlyRelevant
      : fallbackRelevant.length > 0
        ? fallbackRelevant.slice(0, 240)
        : input.acceptAllFallback
          ? scoredItems.slice(0, 120)
          : [];

  cache.set(input.cacheKey, {
    generatedAt: Date.now(),
    items,
  });

  return dedupeItems([...items, ...extraItems]);
}

function mapExtraItems(items: ExtraRssNewsItem[]): RssNewsItem[] {
  return items.map((item, index) => {
    const scored = scoreNews(item.title, item.summary, "grain-oilseeds");
    return {
      category: "grain-oilseeds",
      cropTags: scored.cropTags,
      id: createHash("sha1")
        .update(`extra|${item.source}|${normalizeTitle(item.title)}|${index}`)
        .digest("hex")
        .slice(0, 20),
      publishedAt: item.publishedAt ?? new Date().toISOString(),
      regionTags: scored.regionTags,
      relevanceScore: Math.max(scored.relevanceScore, 4),
      source: item.source,
      summary: item.summary,
      title: item.title,
      topicTags: [...new Set([...(item.topicTags ?? []), ...scored.topicTags])],
      url: item.url ?? "",
    };
  });
}

async function getLegacyLast30DaysItems(): Promise<RssNewsItem[]> {
  const payload = await readLegacyLast30DaysPayload();
  if (!payload) {
    return [];
  }

  const payloadRecord = payload as { items?: unknown[]; results?: unknown[] };
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payloadRecord.items)
      ? payloadRecord.items
      : Array.isArray(payloadRecord.results)
        ? payloadRecord.results
        : [];

  return rows.flatMap((row, index) => {
    const parsed = row as LegacyLast30DaysItem;
    const title = (parsed.title || parsed.summary || parsed.text || "").trim();
    const url = parsed.url || parsed.link || "";
    if (!title || !url) {
      return [];
    }

    const summary = stripHtml(parsed.summary || parsed.text || title);
    const source = parsed.source_name || parsed.source || "Last30Days";
    const publishedAtRaw = parsed.publishedAt || parsed.published_at;
    const publishedAt =
      publishedAtRaw && Number.isFinite(Date.parse(publishedAtRaw))
        ? new Date(publishedAtRaw).toISOString()
        : new Date().toISOString();
    const category = normalizeLegacyCategory(parsed.category);
    const scored = scoreNews(title, summary, category);
    const topicTags = [...new Set([...(parsed.topicTags ?? parsed.topics ?? []), ...scored.topicTags])];
    const id = createHash("sha1")
      .update(`last30days|${source}|${normalizeTitle(title)}|${url}|${index}`)
      .digest("hex")
      .slice(0, 20);

    return [{
      category,
      cropTags: scored.cropTags,
      id,
      publishedAt,
      regionTags: scored.regionTags,
      relevanceScore: Math.max(scored.relevanceScore, 2),
      source,
      summary,
      title,
      topicTags,
      url,
    }];
  });
}

async function readLegacyLast30DaysPayload(): Promise<unknown | null> {
  const url = process.env.LAST30DAYS_JSON_URL?.trim();
  if (url) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        next: { revalidate: 600 },
      });
      if (response.ok) {
        return response.json();
      }
    } catch {
      return null;
    }
  }

  const path = process.env.LAST30DAYS_JSON_PATH?.trim();
  if (!path) {
    return null;
  }

  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function normalizeLegacyCategory(value?: string): FeedSourceCategory {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("logistic") || normalized.includes("shipping") || normalized.includes("freight")) {
    return "logistics-shipping";
  }
  if (normalized.includes("policy") || normalized.includes("macro")) {
    return "policy-macro";
  }
  if (normalized.includes("grain") || normalized.includes("oilseed") || normalized.includes("commodity")) {
    return "grain-oilseeds";
  }
  return "agro-general";
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
  options: {
    extraSourceCount?: number;
    sources: RssSource[];
    summaryScope: "global" | "ukraine";
    timezone: string;
  },
): MediaHubWindowSnapshot {
  const filtered = items.filter((item) => Date.parse(item.publishedAt) >= sinceMs);
  const configuredSources = options.sources.filter((source) => source.enabled);
  const configuredSourceCount =
    configuredSources.length +
    (options.summaryScope === "global" && (process.env.LAST30DAYS_JSON_URL || process.env.LAST30DAYS_JSON_PATH) ? 1 : 0) +
    (options.extraSourceCount ?? 0);
  const topSources = countBy(filtered, (item) => item.source).slice(0, 4);
  const visibleTopSources =
    topSources.length > 0
      ? topSources
      : configuredSources.slice(0, 4).map((source) => ({ count: 0, label: source.name }));
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
  const categoryCounts = (
    filtered.length > 0
      ? countBy(filtered, (item) => sourceLabel(item.category))
      : countBy(configuredSources, (source) => sourceLabel(source.category))
  ).slice(0, 5);
  const categoryTotal = categoryCounts.reduce((sum, item) => sum + item.count, 0) || 1;
  const totalSources = new Set(filtered.map((item) => item.source)).size;

  return {
    distribution: categoryCounts.map((item) => ({
      color: sourceColor(item.label),
      label: item.label,
      value: Math.max(1, Math.round((item.count / categoryTotal) * 100)),
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
    progressLabel: getMediaHubWindowProgressLabel(window, {
      timezone: options.timezone,
    }),
    pulseCards: topTopics.slice(0, 3).map((item, index) => ({
      hint: item.hint,
      label: item.label,
      tone: (index === 0 ? "sky" : index === 1 ? "green" : "amber") as "sky" | "green" | "amber",
      value: Math.max(1, Math.min(10, Math.round((item.count / Math.max(filtered.length, 1)) * 40))),
    })),
    snapshotCards: [
      { label: "Sources", note: `${totalSources} active in window`, value: String(configuredSourceCount) },
      { label: "Items", note: "accepted after scoring", value: String(filtered.length) },
      { label: "Topics", note: "keyword clusters", value: String(topTopics.length) },
    ],
    sourceCount: configuredSourceCount,
    summaryBody: buildSummary(filtered, topTopics, visibleTopSources, window, options.summaryScope),
    summaryTitle:
      window === "day"
        ? "Global commodity monitoring brief"
        : window === "week"
          ? "Weekly global synthesis"
          : "30-day media intelligence layer",
    topSources: visibleTopSources,
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
  scope: "global" | "ukraine",
) {
  if (window !== "day") {
    return buildPeriodSummary(items, topTopics, topSources, window, scope);
  }

  const topicText = topTopics.map((item) => item.label).join(", ");
  const sourceText = topSources.map((item) => item.label).join(", ");
  const scopeText =
    scope === "ukraine"
      ? "English-language Ukraine grain and oilseed market monitoring window"
      : "global commodity monitoring window";
  const leadItems = items.slice(0, 4).map((item) => item.title).filter(Boolean);

  return [
    `The day ${scopeText} is led by ${topicText || "the current commodity monitoring context"}, with the densest source contribution coming from ${sourceText || "the active feed mesh"}.`,
    items.length > 0
      ? `The accepted feed contains ${items.length} monitored items; the strongest signals are ${leadItems.join("; ") || "clustered around the main topic groups"}.`
      : "The accepted feed is light, so the report keeps to verified monitoring context rather than inventing market drivers.",
    "The daily read remains focused on verified commodity, logistics and policy signals from the monitoring layer.",
  ];
}

function buildPeriodSummary(
  items: RssNewsItem[],
  topTopics: Array<{ count: number; hint: string; label: string }>,
  topSources: Array<{ count: number; label: string }>,
  window: "week" | "month",
  scope: "global" | "ukraine",
) {
  const periodLabel = window === "week" ? "week" : "30-day period";
  const scopeLabel =
    scope === "ukraine"
      ? "Ukraine-focused grain and oilseed market"
      : "global commodity market";
  const topicText = topTopics.slice(0, 4).map((item) => item.label.toLowerCase()).join(", ");
  const sourceText = topSources.slice(0, 4).map((item) => item.label).join(", ");
  const lines: string[] = [];

  lines.push(
    `The ${periodLabel} ${scopeLabel} read is built from ${items.length} monitored items across ${sourceText || "the active source mesh"}, with the strongest clusters in ${topicText || "commodity, logistics and policy signals"}.`,
  );

  const usedItemIds = new Set<string>();
  const grainItems = selectSignalItems(items, (item) =>
    item.category === "grain-oilseeds" ||
    item.cropTags.some((tag) => ["corn", "wheat", "soy", "rapeseed", "sunflower"].includes(tag)) ||
    item.topicTags.includes("markets"),
  );
  markUsed(usedItemIds, grainItems);
  const logisticsItems = selectSignalItems(items, (item) =>
    !usedItemIds.has(item.id) && (item.category === "logistics-shipping" || item.topicTags.includes("logistics")),
  );
  markUsed(usedItemIds, logisticsItems);
  const weatherItems = selectSignalItems(items, (item) =>
    !usedItemIds.has(item.id) && item.topicTags.includes("weather"),
  );
  markUsed(usedItemIds, weatherItems);
  const tradeItems = selectSignalItems(items, (item) =>
    !usedItemIds.has(item.id) &&
    (
      item.topicTags.includes("trade") ||
      item.category === "policy-macro" ||
      item.regionTags.some((tag) => ["black-sea", "ukraine", "china", "eu"].includes(tag))
    ),
  );
  markUsed(usedItemIds, tradeItems);
  const remainingItems = selectSignalItems(items, (item) =>
    !usedItemIds.has(item.id),
  );

  pushSignalLine(lines, "Grains and oilseeds", grainItems, "price tone, futures, basis and crop-flow signals");
  pushSignalLine(lines, "Logistics and shipping", logisticsItems, "freight, ports, chokepoints and execution risk");
  pushSignalLine(lines, "Weather and crop outlook", weatherItems, "field conditions, production outlook and regional weather risk");
  pushSignalLine(lines, "Trade and policy", tradeItems, "export demand, regulation, tenders and macro policy");
  pushSignalLine(lines, "Other monitored signals", remainingItems, "adjacent commodity and supply-chain developments");

  if (lines.length < 4 && items.length > 0) {
    lines.push(`Additional monitored signals include ${formatItemList(selectSignalItems(items, () => true, 5))}.`);
  }

  return lines.slice(0, window === "week" ? 7 : 8);
}

function markUsed(usedItemIds: Set<string>, items: RssNewsItem[]) {
  for (const item of items) {
    usedItemIds.add(item.id);
  }
}

function selectSignalItems(
  items: RssNewsItem[],
  predicate: (item: RssNewsItem) => boolean,
  limit = 4,
) {
  return items
    .filter(predicate)
    .sort((first, second) =>
      second.relevanceScore - first.relevanceScore ||
      Date.parse(second.publishedAt) - Date.parse(first.publishedAt),
    )
    .slice(0, limit);
}

function pushSignalLine(
  lines: string[],
  label: string,
  items: RssNewsItem[],
  fallbackContext: string,
) {
  if (items.length === 0) {
    return;
  }

  lines.push(`${label}: ${formatItemList(items)}. This cluster frames ${fallbackContext}.`);
}

function formatItemList(items: RssNewsItem[]) {
  return items
    .map((item) => `${item.title} (${item.source})`)
    .filter(Boolean)
    .join("; ");
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
