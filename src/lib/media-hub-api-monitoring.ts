import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  ingestMediaHubTextMaterial,
  type MediaHubManualMaterialKind,
  type MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";

type ProviderType =
  | "climate_api"
  | "news_api"
  | "search_api"
  | "telegram_api"
  | "trade_api"
  | "video_api"
  | "weather_api";

type ResetWindow = "daily" | "hourly" | "manual" | "monthly";

type ProviderRegistryEntry = {
  cadence: string;
  conservativeBudget: number;
  enabledByDefault: boolean;
  envVar?: string;
  freeTierLimit: string;
  id: string;
  maxRequestsPerRun: number;
  notes: string;
  priority: number;
  resetWindow: ResetWindow;
  timeoutMs: number;
  type: ProviderType;
};

type ApiMonitoringTenant = Extract<MediaHubManualMaterialTenant, "1d3x" | "spike-ua">;

type ApiItem = {
  id?: string;
  providerId: string;
  publishedAt?: string;
  source: string;
  summary?: string;
  title: string;
  url?: string;
};

type RoutedItem = ApiItem & {
  tenants: ApiMonitoringTenant[];
  tags: {
    commodity: string[];
    country: string[];
    logistics: string[];
    provider: string[];
    region: string[];
    risk: string[];
  };
  tenantRoutingReason: string;
};

type ApiMonitoringResult = {
  dryRun: boolean;
  ingested: number;
  providers: Array<{
    error?: string;
    fetched?: number;
    id: string;
    ingested?: number;
    skippedReason?: string;
    status: "failed" | "processed" | "skipped";
  }>;
  status: "processed" | "skipped";
  tenantMode: "platform" | "spike" | "unified";
};

const DEFAULT_TIMEOUT_MS = 8_000;
const USER_AGENT = "1D3X-MediaHub/1.0 (+https://1d3x.com)";

export const MEDIA_HUB_API_PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
  provider("guardian", "GUARDIAN_API_KEY", "news_api", 50, 4, "500 calls/day; commodity search endpoint."),
  provider("currents", "CURRENTS_API_KEY", "news_api", 50, 4, "1000 calls/day; commodity search endpoint."),
  provider("newsdata", "NEWSDATA_API_KEY", "news_api", 30, 4, "200 credits/day; commodity searches."),
  provider("newsapi", "NEWSAPI_KEY", "news_api", 30, 4, "100 calls/day; commodity everything endpoint."),
  provider("gnews", "GNEWS_API_KEY", "news_api", 20, 4, "Commodity/news search; conservative."),
  provider("mediastack", "MEDIASTACK_API_KEY", "news_api", 30, 1, "100 calls/month; one small call/day."),
  provider("marketaux", "MARKETAUX_API_KEY", "news_api", 10, 2, "100 calls/day; market news."),
  provider("thenewsapi", "THENEWSAPI_KEY", "news_api", 10, 2, "100 calls/day; market news."),
  provider("world_news_api", "WORLD_NEWS_API_KEY", "news_api", 5, 1, "50 points/day; very small scan."),
  provider("tavily", "TAVILY_API_KEY", "search_api", 300, 2, "1000 credits/month; search fallback.", "monthly"),
  provider("serpapi", "SERPAPI_API_KEY", "search_api", 120, 1, "250 searches/month; Google News fallback.", "monthly"),
  provider("brave_search", "BRAVE_SEARCH_API_KEY", "search_api", 30, 4, "Commodity web/news search."),
  provider("newscatcher", "NEWSCATCHER_API_KEY", "news_api", 2, 1, "Limited credits; one compact query."),
  provider("youtube", "YOUTUBE_API_KEY", "video_api", 1_000, 2, "10k units/day; narrow search fallback only."),
  provider("noaa_cdo", "NOAA_CDO_TOKEN", "weather_api", 100, 1, "Weather metadata endpoint; not high-frequency."),
  provider("nasa", "NASA_API_KEY", "climate_api", 100, 1, "NASA metadata/event context only."),
  provider("copernicus_cds", "COPERNICUS_CDS_KEY", "climate_api", 1, 0, "Heavy async downloads; manual/weekly only.", "manual", false),
  provider("newsapi_ai", "NEWSAPI_AI_KEY", "news_api", 1, 0, "Disabled for daily polling; enable via allowlist.", "manual", false),
  {
    cadence: "daily-or-weekly",
    conservativeBudget: 10,
    enabledByDefault: true,
    freeTierLimit: "public releases endpoint",
    id: "un_comtrade_releases",
    maxRequestsPerRun: 1,
    notes: "No-key release endpoint; optional UN_COMTRADE_SUBSCRIPTION_KEY.",
    priority: 50,
    resetWindow: "daily",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    type: "trade_api",
  },
  provider("telegram_mtproto", "TELEGRAM_API_ID", "telegram_api", 1, 0, "Existing Telegram collector owns polling.", "manual", false),
];

const QUERY_PACKS = {
  global: [
    "wheat corn soybean futures export tender crop weather USDA",
    "CBOT wheat corn soybeans Euronext MATIF grain market",
    "Black Sea grain wheat corn sunflower oil export port freight",
    "Brazil Argentina soybean corn crop weather exports",
    "palm oil soybean oil sunflower oil rapeseed canola vegetable oils",
    "Egypt wheat tender Algeria wheat tender China soybean imports",
  ],
  ukraine: [
    "Ukraine grain exports Odesa Danube rail border wheat corn",
    "українське зерно пшениця кукурудза соняшник експорт порт",
    "Black Sea Ukraine wheat corn sunflower oil logistics",
    "Ukrainian rapeseed soybean sunflower processing exports",
  ],
};

const COMMODITY_KEYWORDS = [
  "barley", "biodiesel", "canola", "corn", "fertilizer", "grain", "maize", "oilseed",
  "palm oil", "rapeseed", "soybean", "sunflower", "urea", "vegetable oil", "wheat",
  "добрива", "зерно", "кукурудза", "олійні", "пшениця", "ріпак", "соняшник", "соя",
];
const LOGISTICS_KEYWORDS = [
  "barge", "border", "corridor", "danube", "freight", "insurance", "port", "rail",
  "shipping", "truck", "блокада", "вагони", "дунай", "залізниця", "логістика", "порт",
];
const UKRAINE_KEYWORDS = [
  "black sea", "chornomorsk", "constanta", "danube", "izmail", "odesa", "odessa",
  "pivdennyi", "reni", "ukraine", "ukrainian", "україн", "одеса", "ізмаїл", "рені",
];
const GLOBAL_IMPACT_KEYWORDS = [
  "attack", "ban", "corridor", "customs", "disruption", "export", "freight", "import",
  "quota", "safeguard", "sanction", "tender", "tariff", "страйк", "експорт", "тендер",
];
const MARKET_KEYWORDS = [
  "basis", "bid", "cbot", "elevator", "euronext", "fob", "forward", "future",
  "futures", "harvest", "matif", "price", "prices", "production", "stocks", "supply",
  "usd", "usda", "yield",
];
const WEAK_SOURCE_DOMAINS = [
  "wikipedia.org",
  "seedoilfreecertified.com",
];
const WEAK_TITLE_PATTERNS = [
  /\b4d lidar\b/i,
  /\bclass 8 safety\b/i,
  /\btruckload market cycle\b/i,
  /\bdomestic transportation offering\b/i,
  /\bseed oils list\b/i,
  /\bwhat foods contain seed oils\b/i,
];

function provider(
  id: string,
  envVar: string,
  type: ProviderType,
  conservativeBudget: number,
  maxRequestsPerRun: number,
  notes: string,
  resetWindow: ResetWindow = "daily",
  enabledByDefault = true,
): ProviderRegistryEntry {
  return {
    cadence: resetWindow === "monthly" ? "monthly-budgeted" : resetWindow === "manual" ? "manual" : "business-day",
    conservativeBudget,
    enabledByDefault,
    envVar,
    freeTierLimit: "see provider account",
    id,
    maxRequestsPerRun,
    notes,
    priority: conservativeBudget,
    resetWindow,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    type,
  };
}

export function listMediaHubApiProviderRegistry() {
  const allow = parseListEnv("MEDIA_HUB_API_PROVIDER_ALLOWLIST");
  const block = parseListEnv("MEDIA_HUB_API_PROVIDER_BLOCKLIST");
  return MEDIA_HUB_API_PROVIDER_REGISTRY.map((entry) => {
    const hasKey = entry.envVar ? Boolean(process.env[entry.envVar]?.trim()) : true;
    const allowlisted = allow.size === 0 || allow.has(entry.id);
    const blocked = block.has(entry.id);
    return {
      ...entry,
      enabled: entry.enabledByDefault && hasKey && allowlisted && !blocked,
      envConfigured: hasKey,
    };
  });
}

export async function runMediaHubApiMonitoring(input: {
  force?: boolean;
  kind?: "daily" | "monthly" | "weekly";
  tenantMode: "platform" | "spike" | "unified";
}): Promise<ApiMonitoringResult> {
  const dryRun = isTruthy(process.env.MEDIA_HUB_API_MONITORING_DRY_RUN);
  if (!isApiMonitoringEnabled()) {
    return { dryRun, ingested: 0, providers: [], status: "skipped", tenantMode: input.tenantMode };
  }
  if (!input.force && !isApiMonitoringWindowAllowed(input.kind)) {
    return { dryRun, ingested: 0, providers: [], status: "skipped", tenantMode: input.tenantMode };
  }
  if (!hasDatabaseUrl() && !dryRun) {
    return { dryRun, ingested: 0, providers: [], status: "skipped", tenantMode: input.tenantMode };
  }

  const providerResults: ApiMonitoringResult["providers"] = [];
  let ingested = 0;
  for (const entry of listMediaHubApiProviderRegistry()
    .filter((item) => item.enabled)
    .sort((first, second) => second.priority - first.priority)) {
    const budget = await acquireProviderBudget(entry);
    if (!budget.allowed) {
      providerResults.push({ id: entry.id, skippedReason: budget.reason, status: "skipped" });
      continue;
    }

    try {
      const items = await fetchProviderItems(entry, input.tenantMode);
      const routed = dedupeRoutedItems(items.flatMap(routeMediaHubItemToTenants));
      const stored = dryRun ? 0 : await ingestRoutedItems(routed, input.kind ?? "daily");
      if (!dryRun) {
        await markProviderUsage(entry, Math.max(1, budget.units), "ok");
      }
      ingested += stored;
      providerResults.push({ fetched: items.length, id: entry.id, ingested: stored, status: "processed" });
    } catch (error) {
      await markProviderUsage(entry, Math.max(1, budget.units), "failed", sanitizeError(error));
      providerResults.push({ error: sanitizeError(error), id: entry.id, status: "failed" });
    }
  }

  return { dryRun, ingested, providers: providerResults, status: "processed", tenantMode: input.tenantMode };
}

async function fetchProviderItems(entry: ProviderRegistryEntry, tenantMode: ApiMonitoringResult["tenantMode"]) {
  if (entry.maxRequestsPerRun <= 0) {
    return [] as ApiItem[];
  }
  const queries = selectQueries(entry, tenantMode).slice(0, entry.maxRequestsPerRun);
  switch (entry.id) {
    case "guardian":
      return fetchJsonSearch(entry, queries, guardianUrl, extractGuardian);
    case "currents":
      return fetchJsonSearch(entry, queries, currentsUrl, extractCurrents);
    case "newsdata":
      return fetchJsonSearch(entry, queries, newsdataUrl, extractNewsData);
    case "newsapi":
      return fetchJsonSearch(entry, queries, newsApiUrl, extractNewsApi);
    case "gnews":
      return fetchJsonSearch(entry, queries, gnewsUrl, extractGnews);
    case "mediastack":
      return fetchJsonSearch(entry, queries.slice(0, 1), mediastackUrl, extractMediastack);
    case "marketaux":
      return fetchJsonSearch(entry, queries, marketauxUrl, extractMarketaux);
    case "thenewsapi":
      return fetchJsonSearch(entry, queries, theNewsApiUrl, extractTheNewsApi);
    case "world_news_api":
      return fetchJsonSearch(entry, queries.slice(0, 1), worldNewsApiUrl, extractWorldNews);
    case "tavily":
      return fetchTavily(entry, queries);
    case "brave_search":
      return fetchJsonSearch(entry, queries, braveUrl, extractBrave, braveHeaders);
    case "serpapi":
      return fetchJsonSearch(entry, queries.slice(0, 1), serpApiUrl, extractSerpApi);
    case "newscatcher":
      return fetchJsonSearch(entry, queries.slice(0, 1), newscatcherUrl, extractNewscatcher, newscatcherHeaders);
    case "youtube":
      return fetchJsonSearch(entry, queries.slice(0, 2), youtubeUrl, extractYoutube);
    case "un_comtrade_releases":
      return fetchJsonSearch(entry, ["UN Comtrade releases"], comtradeUrl, extractComtrade, comtradeHeaders);
    case "noaa_cdo":
      return fetchJsonSearch(entry, ["NOAA climate datasets"], noaaUrl, extractNoaa, noaaHeaders);
    case "nasa":
      return fetchJsonSearch(entry, ["NASA crop weather context"], nasaUrl, extractNasa);
    default:
      return [];
  }
}

async function fetchJsonSearch(
  entry: ProviderRegistryEntry,
  queries: string[],
  buildUrl: (query: string) => string,
  extract: (payload: unknown, providerId: string) => ApiItem[],
  buildHeaders: (entry: ProviderRegistryEntry) => Record<string, string> = () => ({}),
) {
  const rows: ApiItem[] = [];
  for (const query of queries) {
    const response = await fetchWithTimeout(buildUrl(query), entry.timeoutMs, buildHeaders(entry));
    if (response.status === 429) {
      throw new Error("rate_limited");
    }
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    rows.push(...extract(await response.json(), entry.id));
  }
  return rows;
}

async function fetchTavily(entry: ProviderRegistryEntry, queries: string[]) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];
  const rows: ApiItem[] = [];
  for (const query of queries) {
    const response = await fetchWithTimeout("https://api.tavily.com/search", entry.timeoutMs, {
      "content-type": "application/json",
    }, JSON.stringify({
      api_key: apiKey,
      days: 7,
      include_answer: false,
      max_results: 8,
      query,
      search_depth: "basic",
    }));
    if (response.status === 429) throw new Error("rate_limited");
    if (!response.ok) throw new Error(`http_${response.status}`);
    rows.push(...extractTavily(await response.json(), entry.id));
  }
  return rows;
}

function routeMediaHubItemToTenants(item: ApiItem): RoutedItem[] {
  if (isWeakApiItem(item)) {
    return [];
  }
  const haystack = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const commodity = findMatches(haystack, COMMODITY_KEYWORDS);
  const logistics = findMatches(haystack, LOGISTICS_KEYWORDS);
  const country = findMatches(haystack, UKRAINE_KEYWORDS);
  const market = findMatches(haystack, MARKET_KEYWORDS);
  const risk = findMatches(haystack, GLOBAL_IMPACT_KEYWORDS);
  const hasCommodityMarketSignal = commodity.length > 0 && (market.length > 0 || risk.length > 0);
  const hasCommodityLogisticsSignal = commodity.length > 0 && logistics.length > 0;
  const hasUkraineGlobalSignal = country.length > 0 && (commodity.length > 0 || risk.length > 0);
  if (!hasCommodityMarketSignal && !hasCommodityLogisticsSignal && !hasUkraineGlobalSignal) {
    return [];
  }

  const isUkraine = country.length > 0;
  const hasGlobalImpact = isUkraine && risk.length > 0;
  const tenants: ApiMonitoringTenant[] = isUkraine
    ? hasGlobalImpact
      ? ["spike-ua", "1d3x"]
      : ["spike-ua"]
    : ["1d3x"];

  return [{
    ...item,
    tags: {
      commodity,
      country,
      logistics,
      provider: [item.providerId],
      region: isUkraine ? ["ukraine_black_sea"] : ["global"],
      risk: [...risk, ...market],
    },
    tenantRoutingReason: isUkraine
      ? hasGlobalImpact
        ? "ukraine_black_sea_global_market_impact"
        : "ukraine_specific_market_relevance"
      : "global_agri_commodity_or_logistics_relevance",
    tenants,
  }];
}

async function ingestRoutedItems(items: RoutedItem[], kind: "daily" | "monthly" | "weekly") {
  const materialKind: MediaHubManualMaterialKind =
    kind === "monthly" ? "monthly_material" : kind === "weekly" ? "weekly_material" : "daily_material";
  let count = 0;
  for (const item of items.slice(0, 48)) {
    for (const tenantId of item.tenants) {
      const result = await ingestMediaHubTextMaterial({
        kind: materialKind,
        originalUrl: item.url,
        receivedFrom: "scheduler",
        sourceDomain: item.url ? safeHostname(item.url) : item.source,
        sourceType: "scheduled_api",
        tenantId,
        text: formatApiItemForMaterial(item),
      });
      if (result.extractionStatus === "extracted") {
        count += 1;
      }
    }
  }
  return count;
}

function formatApiItemForMaterial(item: RoutedItem) {
  return cleanTextForStorage([
    `Provider: ${item.providerId}`,
    `Source: ${item.source}`,
    `Published: ${item.publishedAt ?? "unknown"}`,
    `URL: ${item.url ?? "n/a"}`,
    `Routing: ${item.tenants.join(", ")} · ${item.tenantRoutingReason}`,
    `Tags: ${[
      ...item.tags.commodity,
      ...item.tags.logistics,
      ...item.tags.country,
      ...item.tags.risk,
    ].join(", ")}`,
    "",
    item.title,
    "",
    item.summary ?? "",
  ].join("\n")).slice(0, 8_000);
}

function dedupeRoutedItems(items: RoutedItem[]) {
  const map = new Map<string, RoutedItem>();
  for (const item of items) {
    const key = dedupeKey(item);
    const existing = map.get(key);
    if (!existing || (item.summary?.length ?? 0) > (existing.summary?.length ?? 0)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function dedupeKey(item: ApiItem) {
  return createHash("sha1")
    .update([canonicalUrl(item.url), normalizeText(item.title), item.source, (item.publishedAt ?? "").slice(0, 10)].join("|"))
    .digest("hex");
}

async function acquireProviderBudget(entry: ProviderRegistryEntry) {
  const units = Math.max(1, entry.maxRequestsPerRun);
  if (isTruthy(process.env.MEDIA_HUB_API_MONITORING_DRY_RUN) || !hasDatabaseUrl()) {
    return { allowed: true, units };
  }
  await ensureApiBudgetStorage();
  const { periodKey, periodType } = getBudgetPeriod(entry);
  const limits = getBudgetOverrides(entry);
  const rows = await db.$queryRawUnsafe<Array<{ usedUnits: number }>>(
    `
      SELECT "usedUnits"
      FROM "MediaHubApiUsageBudget"
      WHERE "providerId" = $1 AND "periodKey" = $2 AND "periodType" = $3
      LIMIT 1
    `,
    entry.id,
    periodKey,
    periodType,
  );
  const used = rows[0]?.usedUnits ?? 0;
  if (used + units > limits.softLimitUnits) {
    return { allowed: false, reason: "soft_budget_exhausted", units };
  }
  return { allowed: true, units };
}

async function markProviderUsage(
  entry: ProviderRegistryEntry,
  usedUnits: number,
  status: string,
  error?: string,
) {
  if (!hasDatabaseUrl()) return;
  await ensureApiBudgetStorage();
  const { periodKey, periodType } = getBudgetPeriod(entry);
  const limits = getBudgetOverrides(entry);
  await db.$executeRawUnsafe(
    `
      INSERT INTO "MediaHubApiUsageBudget" (
        "id", "providerId", "periodKey", "periodType", "usedUnits",
        "hardLimitUnits", "softLimitUnits", "lastRequestAt", "lastStatus",
        "lastError", "createdAt", "updatedAt"
      )
      VALUES (
        $9, $1, $2, $3, $4,
        $5, $6, NOW(), $7, $8, NOW(), NOW()
      )
      ON CONFLICT ("providerId", "periodKey", "periodType")
      DO UPDATE SET
        "usedUnits" = "MediaHubApiUsageBudget"."usedUnits" + EXCLUDED."usedUnits",
        "hardLimitUnits" = EXCLUDED."hardLimitUnits",
        "softLimitUnits" = EXCLUDED."softLimitUnits",
        "lastRequestAt" = NOW(),
        "lastStatus" = EXCLUDED."lastStatus",
        "lastError" = EXCLUDED."lastError",
        "updatedAt" = NOW()
    `,
    entry.id,
    periodKey,
    periodType,
    usedUnits,
    limits.hardLimitUnits,
    limits.softLimitUnits,
    status,
    error ?? null,
    randomUUID(),
  );
}

async function ensureApiBudgetStorage() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MediaHubApiUsageBudget" (
      "id" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "periodKey" TEXT NOT NULL,
      "periodType" TEXT NOT NULL,
      "usedUnits" INTEGER NOT NULL DEFAULT 0,
      "hardLimitUnits" INTEGER NOT NULL,
      "softLimitUnits" INTEGER NOT NULL,
      "lastRequestAt" TIMESTAMP(3),
      "lastStatus" TEXT,
      "lastError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MediaHubApiUsageBudget_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MediaHubApiUsageBudget_provider_period_key"
    ON "MediaHubApiUsageBudget"("providerId", "periodKey", "periodType")
  `);
}

function getBudgetPeriod(entry: ProviderRegistryEntry) {
  const now = new Date();
  if (entry.resetWindow === "monthly") {
    return { periodKey: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`, periodType: "monthly" };
  }
  if (entry.resetWindow === "hourly") {
    return { periodKey: now.toISOString().slice(0, 13), periodType: "hourly" };
  }
  return { periodKey: now.toISOString().slice(0, 10), periodType: "daily" };
}

function getBudgetOverrides(entry: ProviderRegistryEntry) {
  const daily = parseJsonEnv("MEDIA_HUB_API_DAILY_SOFT_BUDGET_JSON");
  const monthly = parseJsonEnv("MEDIA_HUB_API_MONTHLY_SOFT_BUDGET_JSON");
  const override = entry.resetWindow === "monthly" ? monthly[entry.id] : daily[entry.id];
  const softLimitUnits = Number.isFinite(Number(override))
    ? Math.max(0, Number(override))
    : entry.conservativeBudget;
  return {
    hardLimitUnits: Math.max(softLimitUnits, entry.conservativeBudget),
    softLimitUnits,
  };
}

function selectQueries(entry: ProviderRegistryEntry, tenantMode: ApiMonitoringResult["tenantMode"]) {
  const pack = tenantMode === "platform"
    ? QUERY_PACKS.global
    : tenantMode === "spike"
      ? QUERY_PACKS.ukraine
      : [...QUERY_PACKS.ukraine, ...QUERY_PACKS.global];
  if (entry.type === "search_api") {
    return pack.map((query) => `${query} -wikipedia -recipe -diet -nutrition -cars -trucking jobs`);
  }
  if (entry.type === "video_api") {
    return pack.filter((query) => /wheat|corn|soybean|Black Sea|palm oil/i.test(query));
  }
  return pack;
}

function isApiMonitoringEnabled() {
  const value = process.env.MEDIA_HUB_API_MONITORING_ENABLED;
  return value === undefined || isTruthy(value);
}

function isApiMonitoringWindowAllowed(kind: "daily" | "monthly" | "weekly" = "daily") {
  const localWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.MEDIA_HUB_TIMEZONE || "Europe/Paris",
    weekday: "short",
  }).format(new Date());
  if (localWeekday === "Sun") return false;
  if (localWeekday === "Sat") return kind === "weekly" || kind === "monthly";
  return true;
}

async function fetchWithTimeout(url: string, timeoutMs: number, headers: Record<string, string> = {}, body?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      body,
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        ...headers,
      },
      method: body ? "POST" : "GET",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

const fromDate = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const key = (name: string) => encodeURIComponent(process.env[name]?.trim() ?? "");
const q = (value: string) => encodeURIComponent(value);

function guardianUrl(query: string) {
  return `https://content.guardianapis.com/search?api-key=${key("GUARDIAN_API_KEY")}&q=${q(query)}&from-date=${fromDate()}&page-size=8&show-fields=trailText`;
}
function currentsUrl(query: string) {
  return `https://api.currentsapi.services/v1/search?apiKey=${key("CURRENTS_API_KEY")}&keywords=${q(query)}&language=en`;
}
function newsdataUrl(query: string) {
  return `https://newsdata.io/api/1/news?apikey=${key("NEWSDATA_API_KEY")}&q=${q(query)}&language=en`;
}
function newsApiUrl(query: string) {
  return `https://newsapi.org/v2/everything?apiKey=${key("NEWSAPI_KEY")}&q=${q(query)}&from=${fromDate()}&pageSize=8&sortBy=publishedAt&language=en`;
}
function gnewsUrl(query: string) {
  return `https://gnews.io/api/v4/search?token=${key("GNEWS_API_KEY")}&q=${q(query)}&lang=en&max=8`;
}
function mediastackUrl(query: string) {
  return `https://api.mediastack.com/v1/news?access_key=${key("MEDIASTACK_API_KEY")}&keywords=${q(query)}&languages=en&limit=8`;
}
function marketauxUrl(query: string) {
  return `https://api.marketaux.com/v1/news/all?api_token=${key("MARKETAUX_API_KEY")}&search=${q(query)}&language=en&limit=8`;
}
function theNewsApiUrl(query: string) {
  return `https://api.thenewsapi.com/v1/news/all?api_token=${key("THENEWSAPI_KEY")}&search=${q(query)}&language=en&limit=8`;
}
function worldNewsApiUrl(query: string) {
  return `https://api.worldnewsapi.com/search-news?api-key=${key("WORLD_NEWS_API_KEY")}&text=${q(query)}&language=en&number=8`;
}
function braveUrl(query: string) {
  return `https://api.search.brave.com/res/v1/web/search?q=${q(query)}&count=8&freshness=pw`;
}
function braveHeaders() {
  return { "x-subscription-token": process.env.BRAVE_SEARCH_API_KEY?.trim() ?? "" };
}
function serpApiUrl(query: string) {
  return `https://serpapi.com/search.json?engine=google_news&q=${q(query)}&api_key=${key("SERPAPI_API_KEY")}`;
}
function newscatcherUrl(query: string) {
  return `https://v3-api.newscatcherapi.com/api/search?q=${q(query)}&lang=en&page_size=8`;
}
function newscatcherHeaders() {
  return { "x-api-token": process.env.NEWSCATCHER_API_KEY?.trim() ?? "" };
}
function youtubeUrl(query: string) {
  return `https://www.googleapis.com/youtube/v3/search?key=${key("YOUTUBE_API_KEY")}&q=${q(query)}&part=snippet&type=video&order=date&maxResults=5`;
}
function comtradeUrl() {
  return "https://comtradeapi.un.org/public/v1/getComtradeReleases";
}
function comtradeHeaders(): Record<string, string> {
  const token = process.env.UN_COMTRADE_SUBSCRIPTION_KEY?.trim();
  return token ? { "Ocp-Apim-Subscription-Key": token } : {};
}
function noaaUrl() {
  return "https://www.ncei.noaa.gov/cdo-web/api/v2/datasets?limit=5";
}
function noaaHeaders() {
  return { token: process.env.NOAA_CDO_TOKEN?.trim() ?? "" };
}
function nasaUrl() {
  return `https://api.nasa.gov/planetary/apod?api_key=${key("NASA_API_KEY")}`;
}

function extractGuardian(payload: unknown, providerId: string) {
  const results = asArray(getPath(payload, ["response", "results"]));
  return results.map((row) => item(providerId, row, "webTitle", "webUrl", ["fields", "trailText"], "webPublicationDate", "The Guardian"));
}
function extractCurrents(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["news"])).map((row) => item(providerId, row, "title", "url", "description", "published", getString(row, "author") || "Currents"));
}
function extractNewsData(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["results"])).map((row) => item(providerId, row, "title", "link", "description", "pubDate", getString(row, "source_id") || "NewsData"));
}
function extractNewsApi(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["articles"])).map((row) => item(providerId, row, "title", "url", "description", "publishedAt", getString(getPath(row, ["source"]), "name") || "NewsAPI"));
}
function extractGnews(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["articles"])).map((row) => item(providerId, row, "title", "url", "description", "publishedAt", getString(getPath(row, ["source"]), "name") || "GNews"));
}
function extractMediastack(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["data"])).map((row) => item(providerId, row, "title", "url", "description", "published_at", getString(row, "source") || "Mediastack"));
}
function extractMarketaux(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["data"])).map((row) => item(providerId, row, "title", "url", "description", "published_at", getString(getPath(row, ["source"]), "name") || "Marketaux"));
}
function extractTheNewsApi(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["data"])).map((row) => item(providerId, row, "title", "url", "description", "published_at", getString(getPath(row, ["source"]), "name") || "TheNewsAPI"));
}
function extractWorldNews(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["news"])).map((row) => item(providerId, row, "title", "url", "text", "publish_date", "World News API"));
}
function extractTavily(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["results"])).map((row) => item(providerId, row, "title", "url", "content", undefined, "Tavily"));
}
function extractBrave(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["web", "results"])).map((row) => item(providerId, row, "title", "url", "description", "page_age", "Brave Search"));
}
function extractSerpApi(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["news_results"])).map((row) => item(providerId, row, "title", "link", "snippet", "date", getString(row, "source") || "SerpAPI"));
}
function extractNewscatcher(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["articles"])).map((row) => item(providerId, row, "title", "link", "excerpt", "published_date", getString(row, "clean_url") || "Newscatcher"));
}
function extractYoutube(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["items"])).map((row) => {
    const videoId = getString(getPath(row, ["id"]), "videoId");
    return item(
      providerId,
      row,
      ["snippet", "title"],
      videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      ["snippet", "description"],
      ["snippet", "publishedAt"],
      getString(getPath(row, ["snippet"]), "channelTitle") || "YouTube",
    );
  });
}
function extractComtrade(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["data"])).slice(0, 5).map((row, index) => ({
    providerId,
    publishedAt: new Date().toISOString(),
    source: "UN Comtrade",
    summary: JSON.stringify(row).slice(0, 800),
    title: `UN Comtrade release ${index + 1}`,
    url: "https://comtradeplus.un.org/",
  }));
}
function extractNoaa(payload: unknown, providerId: string) {
  return asArray(getPath(payload, ["results"])).map((row) => item(providerId, row, "name", undefined, "datacoverage", undefined, "NOAA CDO"));
}
function extractNasa(payload: unknown, providerId: string) {
  const record = payload && typeof payload === "object" ? payload : {};
  return [item(providerId, record, "title", "url", "explanation", "date", "NASA")];
}

function item(
  providerId: string,
  row: unknown,
  titlePath: string | string[],
  urlPath?: string | string[],
  summaryPath?: string | string[],
  publishedPath?: string | string[],
  source = providerId,
): ApiItem {
  return {
    providerId: cleanTextForStorage(providerId),
    publishedAt: publishedPath ? normalizeDate(getStringPath(row, publishedPath)) : undefined,
    source: cleanTextForStorage(source),
    summary: summaryPath ? cleanTextForStorage(stripHtml(getStringPath(row, summaryPath))) : "",
    title: cleanTextForStorage(stripHtml(getStringPath(row, titlePath))),
    url: urlPath ? cleanTextForStorage(getStringPath(row, urlPath)) : undefined,
  };
}

function isWeakApiItem(item: ApiItem) {
  const url = item.url?.toLowerCase() ?? "";
  const haystack = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  if (WEAK_SOURCE_DOMAINS.some((domain) => url.includes(domain))) {
    return true;
  }
  return WEAK_TITLE_PATTERNS.some((pattern) => pattern.test(haystack));
}

function getPath(value: unknown, path: string[]) {
  let current = value;
  for (const keyPart of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[keyPart];
  }
  return current;
}
function getStringPath(value: unknown, path: string | string[]) {
  if (typeof path === "string" && path.startsWith("http")) return path;
  const raw = Array.isArray(path) ? getPath(value, path) : getString(value, path);
  return typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
}
function getString(value: unknown, keyName: string) {
  if (!value || typeof value !== "object") return "";
  const raw = (value as Record<string, unknown>)[keyName];
  return typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
}
function asArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}
function normalizeDate(value?: string) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}
function stripHtml(value: string) {
  return cleanTextForStorage(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function normalizeText(value: string) {
  return stripHtml(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function cleanTextForStorage(value: string) {
  return value.replace(/\u0000/g, "").trim();
}
function canonicalUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((param) =>
      url.searchParams.delete(param),
    );
    return url.toString();
  } catch {
    return value;
  }
}
function safeHostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.slice(0, 80);
  }
}
function findMatches(haystack: string, keywords: string[]) {
  return keywords.filter((keyword) => haystack.includes(keyword.toLowerCase())).slice(0, 6);
}
function parseListEnv(name: string) {
  return new Set((process.env[name] ?? "").split(/[,\s]+/).map((item) => item.trim()).filter(Boolean));
}
function parseJsonEnv(name: string) {
  try {
    const parsed = JSON.parse(process.env[name] ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}
function isTruthy(value?: string) {
  return Boolean(value && !["0", "false", "no", "off"].includes(value.toLowerCase()));
}
function sanitizeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 160) : "unknown_error";
}
