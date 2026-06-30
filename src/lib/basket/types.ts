export type BasketProductId = "bigmac" | "latte" | "iphone";
export type BasketMarket = "GLOBAL" | "US" | "UA";
export type BasketConfidence = "verified" | "monitored" | "seed" | "unavailable";
export type BasketObservationStatus = "published" | "monitored" | "unavailable";

export type BasketSourceKind =
  | "price_dataset"
  | "brand_menu"
  | "retail_price"
  | "fx"
  | "external_market_series"
  | "news"
  | "rss"
  | "telegram"
  | "manual_material";

export type BasketSource = {
  id: string;
  label: string;
  kind: BasketSourceKind;
  url?: string;
};

export type BasketProduct = {
  id: BasketProductId;
  name: string;
  shortName: string;
  accent: string;
  unit: "item";
};

export type BasketObservation = {
  product: BasketProductId;
  market: BasketMarket;
  date: string;
  valueUsd: number | null;
  baselineUsd: number;
  source: BasketSource;
  confidence: BasketConfidence;
  status: BasketObservationStatus;
  note?: string;
};

export type BasketLatestItem = BasketObservation & {
  indexVsBaseline: number | null;
  changeYoY: number | null;
  sparkline: number[];
};

export type BasketSeriesPoint = {
  date: string;
  seriesId: string;
  value: number;
};

export type BasketChartSeries = {
  id: string;
  label: string;
  color: string;
  points: Array<{ date: string; value: number }>;
  source: string;
};

export type BasketCoverage = {
  available: number;
  total: number;
  label: string;
};

export type BasketLatestResponse = {
  market: BasketMarket;
  updatedAt: string;
  products: BasketLatestItem[];
  composite: {
    value: number | null;
    coverage: BasketCoverage;
  };
};
