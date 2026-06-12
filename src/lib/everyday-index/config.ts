import type {
  ConsumerCountry,
  ConsumerProductLock,
  ConsumerSourceDefinition,
} from "@/lib/everyday-index/types";

export const EVERYDAY_UPDATE_POLICY =
  "Checked daily. Published weekly or when verified source data changes.";

export const CONSUMER_PRODUCT_LOCKS: ConsumerProductLock[] = [
  {
    key: "burger",
    label: "Burger Index",
    variant: "Big Mac",
    rules: [
      "Use structured Economist Big Mac dataset when available.",
      "Do not backfill from guesswork or unverified scraping.",
    ],
  },
  {
    key: "latte",
    label: "Latte Index",
    variant: "Starbucks Caffe Latte, hot, standard dairy, no modifiers",
    rules: [
      "Primary sources must be official Starbucks country pages or official PDFs.",
      "Reject delivery-platform prices as public primary values.",
    ],
  },
  {
    key: "iphone_price",
    label: "iPhone Index",
    variant: "Configured base-storage unlocked iPhone, no trade-in or carrier subsidy",
    rules: [
      "Reject trade-in, installment, carrier and 'from' pricing.",
      "Use consumer-paid retail price only.",
    ],
  },
  {
    key: "iphone_workdays",
    label: "iPhone Workdays Index",
    variant: "Validated iPhone retail price divided by validated wage/tax observation",
    rules: [
      "Publish only where wage and tax source automation is available.",
      "No manual wage overrides.",
    ],
  },
];

export const CONSUMER_COUNTRIES: ConsumerCountry[] = [
  {
    iso2: "US",
    iso3: "USA",
    name: "United States",
    currency: "USD",
    referenceCity: "New York, NY",
    coverage: {
      burger: false,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "GB",
    iso3: "GBR",
    name: "United Kingdom",
    currency: "GBP",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "DE",
    iso3: "DEU",
    name: "Germany",
    currency: "EUR",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "JP",
    iso3: "JPN",
    name: "Japan",
    currency: "JPY",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "FR",
    iso3: "FRA",
    name: "France",
    currency: "EUR",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "CA",
    iso3: "CAN",
    name: "Canada",
    currency: "CAD",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
  {
    iso2: "AU",
    iso3: "AUS",
    name: "Australia",
    currency: "AUD",
    coverage: {
      burger: true,
      latte: false,
      iphone_price: false,
      iphone_workdays: false,
    },
  },
];

export const SAFE_NEAREST_COUNTRY_BY_ISO2: Record<string, string> = {
  AT: "DE",
  CH: "DE",
  IE: "GB",
  MX: "US",
  NZ: "AU",
};

export const EVERYDAY_SOURCE_DEFINITIONS: ConsumerSourceDefinition[] = [
  {
    id: "burger-economist-global",
    key: "big-mac-economist",
    sourceUrl:
      "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv",
    sourceType: "csv",
    parserKey: "economist-big-mac-csv-v1",
    priority: 1,
    enabled: true,
    productKey: "burger",
  },
  {
    id: "latte-starbucks-registry",
    key: "latte-starbucks",
    sourceUrl: "https://www.starbucks.com",
    sourceType: "html",
    parserKey: "latte-starbucks-html-v1",
    priority: 1,
    enabled: false,
    productKey: "latte",
  },
  {
    id: "iphone-apple-registry",
    key: "iphone-apple-store",
    sourceUrl: "https://www.apple.com/iphone/",
    sourceType: "html",
    parserKey: "iphone-apple-store-html-v1",
    priority: 1,
    enabled: false,
    productKey: "iphone_price",
  },
  {
    id: "iphone-workdays-registry",
    key: "iphone-workdays",
    sourceUrl: "https://www.apple.com/iphone/",
    sourceType: "api",
    parserKey: "iphone-workdays-v1",
    priority: 1,
    enabled: false,
    productKey: "iphone_workdays",
  },
  {
    id: "overlay-wti-registry",
    key: "market-wti",
    sourceUrl: "https://fred.stlouisfed.org",
    sourceType: "api",
    parserKey: "fred-wti-v1",
    priority: 1,
    enabled: false,
    productKey: "wti_oil",
  },
  {
    id: "overlay-brent-registry",
    key: "market-brent",
    sourceUrl: "https://fred.stlouisfed.org",
    sourceType: "api",
    parserKey: "fred-brent-v1",
    priority: 1,
    enabled: false,
    productKey: "brent_oil",
  },
  {
    id: "overlay-gold-registry",
    key: "market-gold",
    sourceUrl: "https://example.invalid/gold-disabled",
    sourceType: "api",
    parserKey: "gold-disabled-v1",
    priority: 1,
    enabled: false,
    productKey: "gold",
  },
];
