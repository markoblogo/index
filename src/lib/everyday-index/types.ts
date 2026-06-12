export type ConsumerIndexKey =
  | "burger"
  | "latte"
  | "iphone_price"
  | "iphone_workdays";

export type OverlaySeriesKey =
  | "burger"
  | "latte"
  | "iphone_price"
  | "iphone_workdays"
  | "brent_oil"
  | "wti_oil"
  | "gold";

export type ConsumerSourceStatus =
  | "verified"
  | "stale"
  | "unsupported"
  | "unavailable"
  | "quarantined";

export type ConfidenceLevel = "high" | "medium" | "low" | "none";
export type ValidationStatus = "accepted" | "rejected" | "quarantined";
export type ChartMode = "rebased_to_100" | "usd_price" | "local_price" | "percent_change";

export type ConsumerProductLock = {
  key: ConsumerIndexKey;
  label: string;
  variant: string;
  rules: string[];
};

export type ConsumerCountry = {
  iso2: string;
  iso3: string;
  name: string;
  currency: string;
  referenceCity?: string;
  coverage: Record<ConsumerIndexKey, boolean>;
};

export type ConsumerSourceDefinition = {
  id: string;
  key: string;
  countryIso3?: string;
  city?: string;
  sourceUrl: string;
  sourceType: "csv" | "json" | "html" | "pdf" | "api";
  parserKey: string;
  expectedCurrency?: string;
  priority: number;
  enabled: boolean;
  productKey: ConsumerIndexKey | OverlaySeriesKey;
};

export type RawSnapshot = {
  sourceId: string;
  fetchedAt: string;
  contentType: string;
  hash: string;
  url: string;
  body: string;
};

export type ParsedObservation = {
  sourceId: string;
  productKey: ConsumerIndexKey | OverlaySeriesKey;
  countryIso3?: string;
  observedAt: string;
  price?: number | null;
  usdPrice?: number | null;
  currency?: string;
  productVariant?: string;
  parserVersion: string;
  confidence: ConfidenceLevel;
  status: ConsumerSourceStatus;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ValidationResult = {
  status: ValidationStatus;
  reasons: string[];
};

export type EverydaySourceAdapter = {
  key: string;
  fetchSnapshot(source: ConsumerSourceDefinition): Promise<RawSnapshot>;
  parse(
    snapshot: RawSnapshot,
    source: ConsumerSourceDefinition,
  ): Promise<ParsedObservation>;
  validate(
    observation: ParsedObservation,
    source: ConsumerSourceDefinition,
    previousPublishedPrice?: number | null,
  ): ValidationResult;
};

export type DashboardCard = {
  key: ConsumerIndexKey;
  title: string;
  localPriceLabel: string;
  usdPriceLabel: string;
  indexVsUsLabel: string;
  sourceComparisonLabel?: string;
  lastVerifiedLabel: string;
  status: ConsumerSourceStatus;
  statusLabel: string;
  confidenceLabel: string;
  note: string;
  sparkline: number[];
  realData: boolean;
};

export type ChartSeries = {
  key: OverlaySeriesKey;
  label: string;
  status: ConsumerSourceStatus;
  values: Array<{ date: string; value: number }>;
};

export type RankingItem = {
  country: string;
  valueLabel: string;
  note: string;
};

export type RankingBlock = {
  key: ConsumerIndexKey;
  title: string;
  available: boolean;
  mostExpensive?: RankingItem;
  leastExpensive?: RankingItem;
  easiest?: RankingItem;
  hardest?: RankingItem;
  note: string;
};

export type EverydayIndexDashboard = {
  selectedCountry: ConsumerCountry;
  countries: ConsumerCountry[];
  detectedCountryIso2: string | null;
  chartMode: ChartMode;
  cards: DashboardCard[];
  chartSeries: ChartSeries[];
  rankings: RankingBlock[];
  methodology: Array<{ title: string; body: string }>;
  updatePolicy: string;
  generatedAt: string;
};
