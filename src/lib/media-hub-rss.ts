import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spikeBlogPosts } from "@/lib/blog-posts";
import {
  getMediaHubWindowProgressLabel,
  type MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import { getPlatformBlogPosts } from "@/lib/platform-blog-posts";

type FeedSourceCategory =
  | "agro-general"
  | "grain-oilseeds"
  | "logistics-shipping"
  | "policy-macro";

type FeedSourceTransport =
  | "bluesky-author-feed"
  | "gdelt"
  | "google-news"
  | "html-blog"
  | "internal-1d3x-blog"
  | "internal-spike-blog"
  | "rss";

type RssSource = {
  canonicalDomain?: string;
  cadenceMinutes?: number;
  corporateOwned?: boolean;
  countryFocus?: string[];
  displayBadges?: string[];
  handle?: string;
  id: string;
  language?: string;
  name: string;
  primaryTenants?: Array<"1d3x" | "spike-ua">;
  sourceFamily?: string;
  sourceTrust?: "first_party" | "owned" | "standard";
  secondaryTenants?: Array<"1d3x" | "spike-ua">;
  topicTags?: string[];
  transport?: FeedSourceTransport;
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

const CORPORATE_SHARED_SOURCES: RssSource[] = [
  {
    cadenceMinutes: 60,
    category: "grain-oilseeds",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    id: "mn7r_blog",
    name: "MN7R Blog",
    primaryTenants: ["1d3x", "spike-ua"],
    sourceFamily: "corporate_blog",
    sourceTrust: "first_party",
    topicTags: ["corporate", "mn7r", "blog", "analytics", "commodity_market", "first_party"],
    transport: "html-blog",
    url: "https://mn7r.com/blog",
  },
  {
    cadenceMinutes: 60,
    category: "agro-general",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    handle: "mn7r.bsky.social",
    id: "mn7r_bluesky",
    name: "MN7R Bluesky",
    primaryTenants: ["1d3x", "spike-ua"],
    sourceFamily: "corporate_social",
    sourceTrust: "first_party",
    topicTags: ["corporate", "mn7r", "bluesky", "social", "first_party"],
    transport: "bluesky-author-feed",
    url: "https://bsky.app/profile/mn7r.bsky.social",
  },
];

const SPIKE_CORPORATE_SOURCES: RssSource[] = [
  {
    cadenceMinutes: 60,
    category: "grain-oilseeds",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    id: "spike_spot_index_blog",
    name: "Spike Spot Index Blog",
    primaryTenants: ["spike-ua"],
    secondaryTenants: ["1d3x"],
    sourceFamily: "corporate_blog",
    sourceTrust: "first_party",
    topicTags: ["corporate", "spike_spot_index", "ssi", "ukraine", "grain", "oilseeds", "index", "first_party"],
    transport: "internal-spike-blog",
    url: "https://spike.1d3x.com/en/blog",
  },
  {
    cadenceMinutes: 60,
    category: "grain-oilseeds",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    id: "id3x_blog",
    name: "1D3X Blog",
    primaryTenants: ["1d3x"],
    secondaryTenants: ["spike-ua"],
    sourceFamily: "corporate_blog",
    sourceTrust: "first_party",
    topicTags: ["corporate", "1d3x", "blog", "global", "grain", "oilseeds", "market_intelligence", "first_party"],
    transport: "internal-1d3x-blog",
    url: "https://1d3x.com/blog",
  },
  ...CORPORATE_SHARED_SOURCES,
];

const ID3X_CORPORATE_SOURCES: RssSource[] = [
  {
    cadenceMinutes: 60,
    category: "grain-oilseeds",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    id: "id3x_blog",
    name: "1D3X Blog",
    primaryTenants: ["1d3x"],
    secondaryTenants: ["spike-ua"],
    sourceFamily: "corporate_blog",
    sourceTrust: "first_party",
    topicTags: ["corporate", "1d3x", "blog", "global", "grain", "oilseeds", "market_intelligence", "first_party"],
    transport: "internal-1d3x-blog",
    url: "https://1d3x.com/blog",
  },
  {
    cadenceMinutes: 60,
    category: "grain-oilseeds",
    corporateOwned: true,
    displayBadges: ["First-party", "Corporate"],
    enabled: true,
    id: "spike_spot_index_blog",
    name: "Spike Spot Index Blog",
    primaryTenants: ["spike-ua"],
    secondaryTenants: ["1d3x"],
    sourceFamily: "corporate_blog",
    sourceTrust: "first_party",
    topicTags: ["corporate", "spike_spot_index", "ssi", "ukraine", "grain", "oilseeds", "index", "first_party"],
    transport: "internal-spike-blog",
    url: "https://spike.1d3x.com/en/blog",
  },
  ...CORPORATE_SHARED_SOURCES,
];

const RSS_SOURCES: RssSource[] = [
  ...ID3X_CORPORATE_SOURCES,
  { id: "brownfield-main", name: "Brownfield Ag News", url: "https://brownfieldagnews.com/feed/", category: "agro-general", enabled: true },
  { id: "brownfield-markets", name: "Brownfield Markets", url: "https://brownfieldagnews.com/category/markets/feed/", category: "agro-general", enabled: true },
  { id: "brownfield-weather", name: "Brownfield Weather", url: "https://brownfieldagnews.com/category/weather/feed/", category: "agro-general", enabled: true },
  { id: "farmersweekly-world", name: "Farmers Weekly Markets", url: "https://www.fwi.co.uk/markets/feed", category: "agro-general", enabled: true },
  { id: "agweb-markets", name: "AgWeb Markets", url: "https://www.agweb.com/rss.xml", category: "agro-general", enabled: true },
  { id: "world-grain-news", name: "World Grain", url: "https://www.world-grain.com/rss/articles", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-news", name: "Grain Central", url: "https://www.graincentral.com/feed/", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-markets", name: "Grain Central Markets", url: "https://www.graincentral.com/markets/feed", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-trade", name: "Grain Central Trade", url: "https://www.graincentral.com/trade/feed", category: "grain-oilseeds", enabled: true },
  { id: "graincentral-production", name: "Grain Central Production", url: "https://www.graincentral.com/production/feed", category: "grain-oilseeds", enabled: true },
  { id: "farmdoc-daily", name: "farmdoc daily", url: "https://farmdocdaily.illinois.edu/feed", category: "grain-oilseeds", enabled: true },
  { id: "farmprogress-global", name: "Farm Progress", url: "https://www.farmprogress.com/rss.xml", category: "grain-oilseeds", enabled: true },
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
  { id: "freightos-weekly", name: "Freightos", url: "https://www.freightos.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "railmarket-global", name: "RailMarket", url: "https://railmarket.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "railfreight-global", name: "RailFreight", url: "https://www.railfreight.com/feed/", category: "logistics-shipping", enabled: true },
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
  { id: "gnews-global-grains", name: "Google News · Global grains", url: googleNewsUrl("global grain market wheat corn soybeans harvest forecast when:1d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-brazil-argentina", name: "Google News · South America crops", url: googleNewsUrl("Brazil Argentina soybean corn crop forecast Rosario Parana exports when:7d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-usda-reports", name: "Google News · USDA reports", url: googleNewsUrl("USDA WASDE export sales crop progress corn soybeans wheat when:30d"), transport: "google-news", category: "policy-macro", enabled: true },
  { id: "gnews-canada-australia", name: "Google News · Canada Australia crops", url: googleNewsUrl("Canada canola wheat Australia wheat barley canola crop forecast when:7d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-eu-black-sea", name: "Google News · EU Black Sea crops", url: googleNewsUrl("EU France Russia Ukraine Black Sea wheat barley rapeseed exports quota freight when:7d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-import-tenders", name: "Google News · Import tenders", url: googleNewsUrl("China soybean imports Egypt Algeria wheat tender grain tender when:7d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-vegetable-oils", name: "Google News · Vegetable oils", url: googleNewsUrl("palm oil soybean oil sunflower oil rapeseed oil biodiesel mandate exports stocks when:7d"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-global-freight", name: "Google News · Grain freight", url: googleNewsUrl("grain freight rates dry bulk IGC Drewry Freightos AAR rail traffic DAT truckload rates when:7d"), transport: "google-news", category: "logistics-shipping", enabled: true },
  { id: "gnews-official-crop-reports", name: "Google News · Official crop reports", url: googleNewsUrl("WASDE AMIS FAO GEOGLAM JRC MARS ABARES CONAB crop report wheat corn soybeans canola when:30d"), transport: "google-news", category: "policy-macro", enabled: true },
  { id: "gdelt-global-grains-oilseeds", name: "GDELT · Global grains and oilseeds", url: gdeltDocUrl("(wheat OR corn OR maize OR barley OR sorghum OR soybean OR soybeans OR rapeseed OR canola OR sunflower OR oilseeds OR vegetable oil) (export OR harvest OR yield OR crop condition OR production forecast OR stocks OR tender OR import demand OR tariff OR quota)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-major-exporters", name: "GDELT · Major exporters", url: gdeltDocUrl("(Brazil OR Argentina OR United States OR Canada OR Australia OR European Union OR France OR Russia OR Ukraine OR Kazakhstan) (wheat OR corn OR maize OR soybeans OR barley OR canola OR rapeseed OR sunflower) (exports OR harvest OR crop forecast OR drought OR port OR freight OR rail)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-importers-tenders", name: "GDELT · Importers and tenders", url: gdeltDocUrl("(China OR Egypt OR Algeria OR Turkey OR Saudi Arabia OR Mexico OR Japan OR South Korea OR Indonesia) (wheat tender OR corn imports OR soybean imports OR grain tender OR oilseed imports OR vegetable oil imports)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-black-sea-impact", name: "GDELT · Black Sea global impact", url: gdeltDocUrl("(Black Sea OR Danube OR Constanta OR Odesa OR Russia OR Ukraine OR Kazakhstan) (grain OR wheat OR corn OR sunflower oil OR barley) (exports OR shipping OR freight OR insurance OR port OR corridor OR sanctions)"), transport: "gdelt", category: "logistics-shipping", enabled: true },
  { id: "gdelt-south-america", name: "GDELT · South America crops", url: gdeltDocUrl("(Brazil OR Paranagua OR Santos OR Argentina OR Rosario OR Parana River OR Bahia Blanca) (soybeans OR soybean meal OR soybean oil OR corn OR wheat) (harvest OR exports OR crop estimate OR drought OR river levels OR freight OR ports)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-north-america", name: "GDELT · North America crops", url: gdeltDocUrl("(USDA OR United States OR US Gulf OR Pacific Northwest OR Mississippi River OR Canada OR Vancouver OR St Lawrence) (corn OR soybeans OR wheat OR canola OR barley) (crop progress OR export inspections OR export sales OR rail OR barge OR drought OR harvest)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-eu-uk", name: "GDELT · EU and UK crops", url: gdeltDocUrl("(European Union OR France OR Germany OR Romania OR Poland OR Spain OR United Kingdom) (wheat OR barley OR maize OR rapeseed OR oilseed rape) (crop condition OR yield forecast OR exports OR imports OR tariff OR quota OR drought)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-australia", name: "GDELT · Australia crops", url: gdeltDocUrl("(Australia OR Western Australia OR New South Wales OR Victoria OR South Australia) (wheat OR barley OR canola OR sorghum) (harvest OR crop forecast OR exports OR drought OR ports)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-vegetable-oils", name: "GDELT · Vegetable oils", url: gdeltDocUrl("(palm oil OR soybean oil OR sunflower oil OR rapeseed oil OR canola oil) (biodiesel OR biofuel mandate OR exports OR imports OR stocks OR production OR Indonesia OR Malaysia OR Argentina OR Ukraine)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-input-costs", name: "GDELT · Fertilizer and input costs", url: gdeltDocUrl("(fertilizer OR urea OR ammonia OR potash OR phosphate OR diesel) (corn OR wheat OR soybean OR farmers OR planting OR crop costs OR exports)"), transport: "gdelt", category: "policy-macro", enabled: true },
];

const SPIKE_EN_UKRAINE_RSS_SOURCES: RssSource[] = [
  ...SPIKE_CORPORATE_SOURCES,
  { id: "ukragroconsult-en", name: "UkrAgroConsult EN", url: "https://ukragroconsult.com/en/news/feed/", category: "grain-oilseeds", enabled: true },
  { id: "proagro-ukraine-en", name: "ProAgro Ukraine EN", url: "https://www.proagroukraine.com/en/feed/", category: "grain-oilseeds", enabled: true },
  { id: "agrotimes-ua", name: "AgroTimes UA", url: "https://agrotimes.ua/feed/", category: "agro-general", enabled: true },
  { id: "usm-shipping-en", name: "USM Shipping EN", url: "https://en.usm.media/feed/", category: "logistics-shipping", enabled: true },
  { id: "railinsider-ua", name: "Rail Insider UA", url: "https://www.railinsider.com.ua/feed/", category: "logistics-shipping", enabled: true },
  { id: "railfreight-ukraine", name: "RailFreight Ukraine", url: "https://www.railfreight.com/feed/", category: "logistics-shipping", enabled: true },
  { id: "kyiv-post-ukraine", name: "Kyiv Post", url: "https://www.kyivpost.com/feed", category: "policy-macro", enabled: true },
  { id: "interfax-ukraine-en", name: "Interfax-Ukraine EN", url: "https://en.interfax.com.ua/news/economic/", category: "policy-macro", enabled: true },
  { id: "mintec-ukraine", name: "Expana / Mintec", url: "https://www.mintecglobal.com/top-stories/rss.xml", category: "grain-oilseeds", enabled: true },
  { id: "amis-ukraine-context", name: "AMIS", url: "https://www.amis-outlook.org/rss.xml", category: "policy-macro", enabled: true },
  { id: "fao-ukraine-context", name: "FAO News", url: "https://www.fao.org/news/rss/en/", category: "policy-macro", enabled: true },
  { id: "gnews-ukraine-grain-export", name: "Google News · Ukraine grain export", url: googleNewsUrl("\"Ukraine\" grain export OR wheat OR corn OR oilseeds"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gnews-ukraine-black-sea", name: "Google News · Black Sea grain corridor", url: googleNewsUrl("\"Black Sea\" grain Ukraine port OR corridor OR vessel"), transport: "google-news", category: "logistics-shipping", enabled: true },
  { id: "gnews-ukraine-danube-rail", name: "Google News · Ukraine Danube rail logistics", url: googleNewsUrl("Ukraine grain Danube OR rail OR border logistics"), transport: "google-news", category: "logistics-shipping", enabled: true },
  { id: "gnews-ukraine-agri-policy", name: "Google News · Ukraine agri policy", url: googleNewsUrl("Ukraine agriculture EU policy tariff quota grain"), transport: "google-news", category: "policy-macro", enabled: true },
  { id: "gnews-ukraine-oilseeds", name: "Google News · Ukraine oilseeds", url: googleNewsUrl("Ukraine sunflower soybean rapeseed oilseed market"), transport: "google-news", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-ukraine-grain-export", name: "GDELT · Ukraine grain export", url: gdeltDocUrl("(Ukraine grain export OR Ukraine wheat OR Ukraine corn OR Ukraine oilseeds)"), transport: "gdelt", category: "grain-oilseeds", enabled: true },
  { id: "gdelt-ukraine-logistics", name: "GDELT · Ukraine logistics", url: gdeltDocUrl("(Ukraine grain port OR Ukraine Danube OR Black Sea grain corridor OR Ukraine rail freight)"), transport: "gdelt", category: "logistics-shipping", enabled: true },
  { id: "gdelt-ukraine-policy", name: "GDELT · Ukraine agri policy", url: gdeltDocUrl("(Ukraine agriculture EU policy OR Ukraine grain tariff OR Ukraine export quota)"), transport: "gdelt", category: "policy-macro", enabled: true },
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
  "lottery",
  "betting",
  "crypto casino",
  "rural lifestyle",
  "farm machinery",
  "tractor review",
  "passenger rail",
  "ecommerce",
  "stock tips",
];

const CROPS = [
  "wheat", "corn", "maize", "barley", "sorghum", "rice", "soybean", "soybeans", "soy", "soybean oil", "soybean meal", "rapeseed", "canola", "sunflower", "sunflower seed", "sunflower oil", "palm oil", "vegetable oil", "oilseed", "oilseeds", "meal", "crush",
];
const TRADE = [
  "harvest", "sowing", "yield", "crop", "acreage", "planting", "export", "import", "tender", "futures", "basis", "stocks", "shipments", "quota", "shipment", "demand", "inspections", "export sales", "food security", "balance sheet",
];
const LOGISTICS = [
  "freight", "vessel", "rail", "wagon", "truck", "trucking", "barge", "port", "terminal", "shipping", "logistics", "river", "container", "border", "insurance", "strike", "congestion", "chokepoint", "panama canal", "suez", "red sea", "bosphorus", "danube", "mississippi river", "parana river", "demurrage",
];
const WEATHER = [
  "drought", "rainfall", "precipitation", "soil moisture", "heat", "frost", "weather", "storm", "flood", "temperature",
];
const POLICY = [
  "tariff", "quota", "sanctions", "export ban", "export duty", "regulation", "duties", "subsidy", "mandate", "biofuel", "biodiesel", "fertilizer", "urea", "ammonia", "potash", "phosphate", "diesel", "restriction", "trade agreement", "compliance", "eu accession", "ministry", "customs",
];
const REGIONS = [
  "ukraine", "odesa", "odessa", "chornomorsk", "pivdennyi", "izmail", "reni", "constanta", "danube", "black sea", "eu", "european union", "france", "germany", "romania", "bulgaria", "poland", "spain", "united kingdom", "moldova", "slovakia", "hungary", "us", "united states", "us gulf", "pnw", "mississippi", "brazil", "santos", "paranagua", "argentina", "rosario", "bahia blanca", "russia", "kazakhstan", "canada", "vancouver", "australia", "india", "china", "egypt", "algeria", "turkey", "mexico", "japan", "south korea", "indonesia", "malaysia", "saudi arabia",
];

const GLOBAL_SOURCE_FAMILY_DOMAINS = new Set([
  "freightwaves.com",
  "brownfieldagnews.com",
  "marineinsight.com",
  "splash247.com",
  "world-grain.com",
  "agri-pulse.com",
  "farmprogress.com",
  "farmfutures.com",
  "agriculture.com",
  "producer.com",
  "graincentral.com",
  "farmersguardian.com",
  "fginsight.com",
  "ahdb.org.uk",
  "usda.gov",
  "fas.usda.gov",
  "nass.usda.gov",
  "esmis.nal.usda.gov",
  "amis-outlook.org",
  "fao.org",
  "cropmonitor.org",
  "geoglam.org",
  "joint-research-centre.ec.europa.eu",
  "publications.jrc.ec.europa.eu",
  "igc.int",
  "drewry.co.uk",
  "freightos.com",
  "aar.org",
  "dat.com",
  "bcr.com.ar",
  "bolsadecereales.com",
  "conab.gov.br",
  "agriculture.ec.europa.eu",
]);

const SPIKE_TELEGRAM_SOURCE_DOMAINS = new Set([
  "agroportal.ua",
  "apk-inform.com",
  "elevatorist.com",
  "latifundist.com",
  "kurkul.com",
  "superagronom.com",
  "uga.ua",
]);

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
          const feedItems = await fetchSourceItems(source);
          return feedItems.map((item) => toNewsItem(source, item));
        } catch {
          return [] as RssNewsItem[];
        }
      }),
    ),
    input.includeLegacy ? getLegacyLast30DaysItems() : Promise.resolve([] as RssNewsItem[]),
  ]);

  const scoredItems = dedupeItems([...fetched.flat(), ...legacyItems])
    .filter((item) => !isUnsafeMonitoringCandidate(item.title, item.summary))
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
      return await fetchJsonWithTimeout(url);
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

async function fetchJsonWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
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

async function fetchSourceItems(source: RssSource): Promise<ParsedFeedItem[]> {
  if (source.transport === "internal-spike-blog") {
    return getSpikeInternalBlogItems();
  }
  if (source.transport === "internal-1d3x-blog") {
    return get1d3xInternalBlogItems();
  }
  if (source.transport === "html-blog") {
    return fetchHtmlBlogItems(source);
  }
  if (source.transport === "bluesky-author-feed") {
    return fetchBlueskyAuthorFeed(source);
  }
  if (source.transport === "gdelt") {
    return fetchGdeltItems(source);
  }

  return fetchFeed(source);
}

function getSpikeInternalBlogItems(): ParsedFeedItem[] {
  return spikeBlogPosts
    .filter((post) => post.language === "en" && post.publishedAt)
    .map((post) => ({
      link: `https://spike.1d3x.com/en/blog/${post.slug}`,
      publishedAt: post.publishedAt,
      summary: [post.excerpt, ...post.body.slice(0, 2)].join(" "),
      title: post.title,
    }));
}

function get1d3xInternalBlogItems(): ParsedFeedItem[] {
  return getPlatformBlogPosts().map((post) => ({
    link: `https://1d3x.com/blog/${post.slug}`,
    publishedAt: post.publishedAt,
    summary: [post.excerpt, ...post.body.slice(0, 2)].join(" "),
    title: post.title,
  }));
}

async function fetchHtmlBlogItems(source: RssSource): Promise<ParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "1D3XMediaHub/1.0 (+https://1d3x.com)",
      },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseBlogHtmlList(html, source.url);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchBlueskyAuthorFeed(source: RssSource): Promise<ParsedFeedItem[]> {
  const handle = source.handle ?? source.url.split("/").pop() ?? "";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&filter=posts_no_replies&limit=50`,
      {
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent": "1D3XMediaHub/1.0 (+https://1d3x.com)",
        },
        next: { revalidate: 900 },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json() as {
      feed?: Array<{
        post?: {
          cid?: string;
          embed?: {
            external?: {
              description?: string;
              title?: string;
              uri?: string;
            };
          };
          record?: {
            createdAt?: string;
            text?: string;
          };
          uri?: string;
        };
      }>;
    };

    return (payload.feed ?? []).flatMap((entry) => {
      const post = entry.post;
      const text = post?.record?.text?.trim();
      const atUri = post?.uri ?? "";
      if (!post || !text || !atUri) {
        return [];
      }
      const external = post.embed?.external;
      const postUrl = blueskyPostUrl(handle, atUri);
      const linkedUrl = external?.uri ? canonicalizeUrl(external.uri) || external.uri : "";
      return [{
        link: linkedUrl || postUrl || atUri,
        publishedAt: post.record?.createdAt,
        summary: [
          text,
          external?.title ? `Linked: ${external.title}` : "",
          external?.description ?? "",
          post.cid ? `CID: ${post.cid}` : "",
          atUri ? `AT URI: ${atUri}` : "",
          postUrl ? `Bluesky: ${postUrl}` : "",
        ].filter(Boolean).join("\n"),
        title: external?.title || text.split("\n")[0].slice(0, 120),
      }];
    });
  } finally {
    clearTimeout(timeout);
  }
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

async function fetchGdeltItems(source: RssSource): Promise<ParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "1D3XMediaHub/1.0 (+https://1d3x.com)",
      },
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json() as { articles?: Array<{
      seendate?: string;
      sourceCommonName?: string;
      title?: string;
      url?: string;
    }> };

    return (payload.articles ?? []).flatMap((article) => {
      if (!article.title || !article.url) {
        return [];
      }

      return [{
        link: article.url,
        publishedAt: parseGdeltDate(article.seendate),
        summary: article.sourceCommonName,
        title: article.title,
      }];
    });
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

function parseBlogHtmlList(html: string, baseUrl: string): ParsedFeedItem[] {
  const jsonLdItems = parseJsonLdBlogItems(html, baseUrl);
  if (jsonLdItems.length > 0) {
    return jsonLdItems;
  }

  const items: ParsedFeedItem[] = [];
  const seen = new Set<string>();
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const match of anchors) {
    const link = absoluteUrl(match[1], baseUrl);
    const title = stripHtml(match[2]);
    const key = canonicalizeUrl(link) || link;
    if (!link || !title || seen.has(key) || !isLikelyBlogArticleUrl(link, baseUrl)) {
      continue;
    }
    seen.add(key);
    items.push({
      link,
      summary: extractNearbyMetaSummary(html, match.index ?? 0),
      title,
    });
    if (items.length >= 24) {
      break;
    }
  }

  return items;
}

function parseJsonLdBlogItems(html: string, baseUrl: string): ParsedFeedItem[] {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const items: ParsedFeedItem[] = [];

  for (const script of scripts) {
    try {
      const payload = JSON.parse(decodeXml(script[1]));
      const rows = flattenJsonLd(payload);
      for (const row of rows) {
        const record = row as Record<string, unknown>;
        const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "");
        if (!/(blogposting|article|newsarticle)/i.test(type)) {
          continue;
        }
        const title = String(record.headline ?? record.name ?? "").trim();
        const link = absoluteUrl(String(record.url ?? record.mainEntityOfPage ?? ""), baseUrl);
        if (!title || !link) {
          continue;
        }
        items.push({
          link,
          publishedAt: typeof record.datePublished === "string" ? record.datePublished : undefined,
          summary: String(record.description ?? ""),
          title,
        });
      }
    } catch {
      continue;
    }
  }

  return dedupeParsedFeedItems(items).slice(0, 24);
}

function flattenJsonLd(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const record = value as Record<string, unknown>;
  return [
    value,
    ...flattenJsonLd(record["@graph"]),
    ...flattenJsonLd(record.itemListElement),
  ];
}

function dedupeParsedFeedItems(items: ParsedFeedItem[]) {
  const map = new Map<string, ParsedFeedItem>();
  for (const item of items) {
    map.set(canonicalizeUrl(item.link) || normalizeTitle(item.title), item);
  }
  return [...map.values()];
}

function absoluteUrl(value: string, baseUrl: string) {
  if (!value || value.startsWith("#") || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return "";
  }
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function isLikelyBlogArticleUrl(link: string, baseUrl: string) {
  try {
    const url = new URL(link);
    const base = new URL(baseUrl);
    return url.hostname === base.hostname &&
      url.pathname !== base.pathname &&
      /blog|news|article|insight|market/i.test(url.pathname);
  } catch {
    return false;
  }
}

function extractNearbyMetaSummary(html: string, index: number) {
  const slice = html.slice(index, index + 1200);
  const paragraph = slice.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  return paragraph ? stripHtml(paragraph) : undefined;
}

function blueskyPostUrl(handle: string, atUri: string) {
  const rkey = atUri.match(/\/app\.bsky\.feed\.post\/([^/]+)$/)?.[1];
  return rkey ? `https://bsky.app/profile/${handle}/post/${rkey}` : "";
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
  const sourceTopicTags = (source.topicTags ?? [])
    .filter((tag) => !["corporate", "first_party", "blog", "social", "mn7r", "1d3x", "ssi", "spike_spot_index"].includes(tag));
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
    relevanceScore: scored.relevanceScore + (source.corporateOwned ? 2 : 0),
    source: source.name,
    summary,
    title,
    topicTags: [...new Set([...sourceTopicTags, ...scored.topicTags])],
    url: canonicalizeUrl(item.link) || item.link,
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
  const slots = new Map<string, RssNewsItem>();
  const titleSlots = new Map<string, Array<{ publishedAt: number; slotKey: string }>>();
  const urlSlots = new Map<string, string>();

  for (const item of items) {
    const titleKey = normalizeTitle(item.title);
    const urlKey = canonicalizeUrl(item.url);
    const recentTitleSlot = findRecentTitleSlot(titleSlots.get(titleKey), item.publishedAt);
    const slotKey =
      (urlKey && urlSlots.get(urlKey)) ||
      recentTitleSlot ||
      (urlKey || titleWindowKey(titleKey, item.publishedAt));
    const existing = slots.get(slotKey);
    if (!existing || compareDedupeCandidate(item, existing) > 0) {
      slots.set(slotKey, item);
    }
    if (urlKey) {
      urlSlots.set(urlKey, slotKey);
    }
    if (titleKey) {
      const existingTitleSlots = titleSlots.get(titleKey) ?? [];
      if (!existingTitleSlots.some((entry) => entry.slotKey === slotKey)) {
        existingTitleSlots.push({ publishedAt: Date.parse(item.publishedAt), slotKey });
        titleSlots.set(titleKey, existingTitleSlots);
      }
    }
  }

  return [...slots.values()];
}

function findRecentTitleSlot(slots: Array<{ publishedAt: number; slotKey: string }> | undefined, publishedAt: string) {
  if (!slots?.length) {
    return undefined;
  }

  const timestamp = Date.parse(publishedAt);
  return slots.find((entry) =>
    Math.abs(timestamp - entry.publishedAt) <= 14 * 24 * 60 * 60 * 1000,
  )?.slotKey;
}

function titleWindowKey(titleKey: string, publishedAt: string) {
  return `${titleKey || publishedAt}:${Date.parse(publishedAt) || publishedAt}`;
}

function compareDedupeCandidate(candidate: RssNewsItem, existing: RssNewsItem) {
  const relevanceDelta = candidate.relevanceScore - existing.relevanceScore;
  if (Math.abs(relevanceDelta) >= 2) {
    return relevanceDelta;
  }
  return Date.parse(candidate.publishedAt) - Date.parse(existing.publishedAt);
}

function canonicalizeUrl(value: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["fbclid", "gclid", "mc_cid", "mc_eid", "ocid", "ref"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.hostname = url.hostname.replace(/^www\./, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function parseGdeltDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/);
  if (normalized) {
    return new Date(Date.UTC(
      Number(normalized[1]),
      Number(normalized[2]) - 1,
      Number(normalized[3]),
      Number(normalized[4]),
      Number(normalized[5]),
      Number(normalized[6]),
    )).toISOString();
  }

  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined;
}

function googleNewsUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function gdeltDocUrl(query: string) {
  return `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=30&sort=HybridRel`;
}

function isDuplicateSpikeTelegramSource(value: string) {
  return SPIKE_TELEGRAM_SOURCE_DOMAINS.has(toRootDomain(value));
}

function isDuplicateGlobalSourceFamily(value: string) {
  const hostname = toHostname(value);
  const rootDomain = toRootDomain(value);
  return GLOBAL_SOURCE_FAMILY_DOMAINS.has(rootDomain) ||
    [...GLOBAL_SOURCE_FAMILY_DOMAINS].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function listCorporateMediaHubRssSources() {
  const sources = new Map<string, RssSource>();
  for (const source of [...ID3X_CORPORATE_SOURCES, ...SPIKE_CORPORATE_SOURCES]) {
    sources.set(source.id, source);
  }
  return [...sources.values()].map((source) => ({
    cadenceMinutes: source.cadenceMinutes ?? 60,
    corporateOwned: Boolean(source.corporateOwned),
    displayBadges: source.displayBadges ?? [],
    handle: source.handle ?? null,
    id: source.id,
    name: source.name,
    primaryTenants: source.primaryTenants ?? [],
    secondaryTenants: source.secondaryTenants ?? [],
    sourceFamily: source.sourceFamily ?? "standard",
    sourceTrust: source.sourceTrust ?? "standard",
    transport: source.transport ?? "rss",
    url: source.url,
  }));
}

function isUnsafeMonitoringCandidate(title: string, summary = "") {
  const body = `${title} ${summary}`.toLowerCase();
  return STOPWORDS.some((word) => body.includes(word));
}

function isBlockedOrPaywalledSource(status: number, contentType = "") {
  return [401, 402, 403, 451].includes(status) || contentType.toLowerCase().includes("paywall");
}

function toRootDomain(value: string) {
  const normalized = toHostname(value).replace(/^www\./, "");
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length <= 2) {
    return normalized;
  }
  return parts.slice(-2).join(".");
}

function toHostname(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
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
      processingState: item.relevanceScore >= 3 ? "accepted_after_scoring" : "fallback_accepted",
      relevanceScore: item.relevanceScore,
      source: item.source,
      sourceType: "RSS",
      sourceUrl: item.url,
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
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "n/a";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

export const __mediaHubRssTestHooks = {
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
  toHostname,
  toRootDomain,
};
