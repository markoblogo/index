import type { BasketMarket, BasketProduct, BasketProductId, BasketSource } from "@/lib/basket/types";

export const BASKET_PRODUCTS: Record<BasketProductId, BasketProduct> = {
  bigmac: {
    id: "bigmac",
    name: "Big Mac Index",
    shortName: "Big Mac",
    accent: "#ffc42e",
    unit: "item",
  },
  latte: {
    id: "latte",
    name: "Starbucks Latte Index",
    shortName: "Latte",
    accent: "#70f2bd",
    unit: "item",
  },
  iphone: {
    id: "iphone",
    name: "iPhone Index",
    shortName: "iPhone",
    accent: "#b96cff",
    unit: "item",
  },
};

export const BASKET_MARKETS: Array<{ id: BasketMarket; label: string }> = [
  { id: "GLOBAL", label: "Global" },
  { id: "US", label: "United States" },
  { id: "UA", label: "Ukraine" },
];

export const BASKET_SOURCES: Record<string, BasketSource> = {
  economistBigMac: {
    id: "economist-bigmac",
    kind: "price_dataset",
    label: "The Economist Big Mac Index dataset",
    url: "https://github.com/TheEconomist/big-mac-data",
  },
  starbucksMonitor: {
    id: "starbucks-menu-monitor",
    kind: "brand_menu",
    label: "Monitored Starbucks menu prices / public menu datasets",
  },
  gcpdexStarbucks: {
    id: "gcpdex-starbucks",
    kind: "price_dataset",
    label: "GCPDex Starbucks Latte Index reference dataset",
    url: "https://www.gcpdex.com/",
  },
  appleStore: {
    id: "apple-store-retail",
    kind: "retail_price",
    label: "Apple Store / authorized retailer price monitoring",
  },
  picodiIphone: {
    id: "picodi-iphone-index",
    kind: "price_dataset",
    label: "Picodi iPhone Index annual affordability report",
    url: "https://www.picodi.com/",
  },
  tenscopeIphone: {
    id: "tenscope-iphone-affordability",
    kind: "price_dataset",
    label: "Tenscope iPhone Affordability Index",
    url: "https://tenscope.com/",
  },
  applePriceCompare: {
    id: "apple-price-compare",
    kind: "retail_price",
    label: "ApplePriceCompare Apple Store country price tables",
    url: "https://applepricecompare.com/",
  },
  fredUsd: {
    id: "fred-usd-broad",
    kind: "external_market_series",
    label: "FRED broad USD proxy",
    url: "https://fred.stlouisfed.org/series/DTWEXBGS",
  },
  fredBrent: {
    id: "fred-brent",
    kind: "external_market_series",
    label: "FRED Brent crude oil spot price",
    url: "https://fred.stlouisfed.org/series/DCOILBRENTEU",
  },
  fredWti: {
    id: "fred-wti",
    kind: "external_market_series",
    label: "FRED WTI crude oil spot price",
    url: "https://fred.stlouisfed.org/series/DCOILWTICO",
  },
  commodityProxy: {
    id: "commodity-proxy",
    kind: "external_market_series",
    label: "Public commodity market proxy",
  },
  spikePublic: {
    id: "spike-public-history",
    kind: "external_market_series",
    label: "SPIKE Spot Index public history",
  },
  economistMedia: {
    id: "economist-burgernomics",
    kind: "news",
    label: "The Economist Burgernomics coverage",
    url: "https://www.economist.com/big-mac-index",
  },
  consumerIndexMedia: {
    id: "consumer-index-media",
    kind: "rss",
    label: "Consumer index media monitoring: Visual Capitalist, Investopedia, SwitchOnBusiness, Yahoo Finance, CNBC, Reuters, Bloomberg",
  },
  communityDataSignals: {
    id: "community-data-signals",
    kind: "news",
    label: "Community data signals for non-official consumer index leads",
  },
};
