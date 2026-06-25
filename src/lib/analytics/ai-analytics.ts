import {
  computeRangeStats,
  getLookbackChange,
  normalizeHistory,
  percentileRank,
  quantile,
  realizedVolatility,
  type ConfidenceLevel,
  type DataQualityAlert,
  type IndexHistoryPoint,
  type IndexInstrument,
  type PulseRow,
  type SpreadAnalytics,
} from "@/lib/analytics/experimental-analytics";

export type HistoryWindow = "90D" | "180D" | "365D" | "FULL";

export type MetricEvidence = {
  confidence?: ConfidenceLevel;
  date?: string;
  id: string;
  instrumentId?: string;
  label: string;
  spreadId?: string;
  unit?: string;
  value: number | string | null;
  window?: string;
};

export type InstrumentFact = {
  change1d: number | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
  confidence: ConfidenceLevel;
  evidenceIds: string[];
  id: string;
  label: string;
  latestDate: string;
  percentile: number | null;
  respondents: number | null;
  value: number;
  volatility30d: number | null;
  volatilityPercentile: number | null;
};

export type SpreadFact = {
  change7d: number | null;
  change30d: number | null;
  current: number;
  evidenceIds: string[];
  id: string;
  label: string;
  zScore: number | null;
};

export type AnalyticsFactPack = {
  dataQuality: {
    alertCount: number;
    rows: Array<{
      alerts: DataQualityAlert[];
      confidence: ConfidenceLevel;
      evidenceIds: string[];
      positionId: string;
      positionLabel: string;
    }>;
  };
  evidence: MetricEvidence[];
  generatedAt: string;
  historyWindow: HistoryWindow;
  instruments: InstrumentFact[];
  latestDate: string | null;
  locale: "uk" | string;
  marketSummary: {
    topDownMove: InstrumentFact | null;
    topUpMove: InstrumentFact | null;
    widestSpread: SpreadFact | null;
  };
  sourceVersion: string;
  spreads: SpreadFact[];
};

export type MarketAnomaly = {
  confidence: ConfidenceLevel;
  evidenceIds: string[];
  id: string;
  instrumentId?: string;
  kind:
    | "price_extreme"
    | "large_daily_move"
    | "large_weekly_move"
    | "volatility_extreme"
    | "spread_extreme"
    | "data_quality";
  severity: "info" | "warning" | "critical";
  summary: string;
  title: string;
};

export type MarketRegime =
  | "quiet_range"
  | "upside_pressure"
  | "downside_pressure"
  | "volatile_breakout"
  | "mean_reversion_watch"
  | "thin_noisy_market"
  | "unavailable";

export type MarketRegimeResult = {
  confidence: ConfidenceLevel;
  evidenceIds: string[];
  instrumentId: string;
  instrumentLabel: string;
  momentum30d: number | null;
  pricePercentile: number | null;
  regime: MarketRegime;
  volatilityPercentile: number | null;
};

export type SimilarEpisode = {
  confidence: ConfidenceLevel;
  evidenceIds: string[];
  forwardReturns: {
    d7?: number | null;
    d14?: number | null;
    d30?: number | null;
  };
  id: string;
  instrumentId: string;
  similarityScore: number;
  startDate: string;
};

export type HistoricalScenarioDistribution = {
  confidence: ConfidenceLevel;
  episodeCount: number;
  evidenceIds: string[];
  horizon: "7D" | "14D" | "30D";
  maxReturn: number | null;
  medianReturn: number | null;
  minReturn: number | null;
  p25Return: number | null;
  p75Return: number | null;
  positiveShare: number | null;
};

export type AiInsightCard = {
  caveat?: string;
  confidence: "high" | "medium" | "low";
  details?: string[];
  evidenceIds: string[];
  id: string;
  severity?: "info" | "warning" | "critical";
  summary: string;
  title: string;
  type:
    | "anomaly"
    | "market_regime"
    | "similar_episode"
    | "daily_brief"
    | "weekly_brief"
    | "historical_scenario"
    | "data_quality";
};

export type AiAnalyticsResult = {
  anomalies: MarketAnomaly[];
  dailyBrief: AiInsightCard;
  marketRegimes: MarketRegimeResult[];
  scenarios: HistoricalScenarioDistribution[];
  similarEpisodes: SimilarEpisode[];
  weeklyBrief: AiInsightCard;
};

const FORBIDDEN_AI_TERMS = [
  "buy",
  "sell",
  "guaranteed",
  "купувати",
  "продавати",
  "сигнал",
  "гарантовано",
  "точний прогноз",
  "рекомендація купити",
  "рекомендація продати",
];

export function buildAnalyticsFactPack({
  history,
  instruments,
  pulseRows,
  qualityRows,
  spreadRows,
}: {
  history: IndexHistoryPoint[];
  instruments: IndexInstrument[];
  pulseRows: PulseRow[];
  qualityRows: Array<{
    alerts: DataQualityAlert[];
    confidence: ConfidenceLevel;
    positionId: string;
    positionLabel: string;
  }>;
  spreadRows: SpreadAnalytics[];
}): AnalyticsFactPack {
  const normalized = normalizeHistory(history);
  const evidence: MetricEvidence[] = [];
  const latestDate = normalized.map((point) => point.date).sort().at(-1) ?? null;
  const volatilityValues = pulseRows
    .map((row) => row.volatility30d)
    .filter((value): value is number => value !== null);
  const instrumentFacts = pulseRows.map((row) => {
    const volatilityPercentile =
      row.volatility30d === null || volatilityValues.length < 3
        ? null
        : percentileRank(volatilityValues, row.volatility30d);
    const evidenceIds = [
      addEvidence(evidence, {
        confidence: row.confidence,
        date: row.latestDate,
        id: `ev-${row.positionId}-price`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: остання ціна`,
        unit: "USD/t",
        value: row.value,
      }),
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-1d`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: зміна 1Д`,
        unit: "USD/t",
        value: row.change1d.abs,
        window: "1D",
      }),
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-7d`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: зміна 7Д`,
        unit: "USD/t",
        value: row.change7d.abs,
        window: "7D",
      }),
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-30d`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: зміна 30Д`,
        unit: "USD/t",
        value: row.change30d.abs,
        window: "30D",
      }),
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-percentile`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: перцентиль ціни`,
        unit: "%",
        value: row.percentile,
      }),
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-volatility-percentile`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: перцентиль волатильності`,
        unit: "%",
        value: volatilityPercentile,
      }),
    ];

    return {
      change1d: row.change1d.abs,
      change7d: row.change7d.abs,
      change30d: row.change30d.abs,
      change90d: row.change90d.abs,
      confidence: row.confidence,
      evidenceIds,
      id: row.positionId,
      label: row.positionLabel,
      latestDate: row.latestDate,
      percentile: row.percentile,
      respondents: row.respondents,
      value: row.value,
      volatility30d: row.volatility30d,
      volatilityPercentile,
    } satisfies InstrumentFact;
  });
  const spreadFacts = spreadRows.map((spread, index) => {
    const id = slugify(spread.label) || `spread-${index + 1}`;
    const evidenceIds = [
      addEvidence(evidence, {
        id: `ev-${id}-current`,
        label: `${spread.label}: поточний спред`,
        spreadId: id,
        unit: "USD/t",
        value: spread.current,
      }),
      addEvidence(evidence, {
        id: `ev-${id}-zscore`,
        label: `${spread.label}: z-score`,
        spreadId: id,
        value: spread.zScore,
      }),
    ];

    return {
      change7d: spread.change7d,
      change30d: spread.change30d,
      current: spread.current,
      evidenceIds,
      id,
      label: spread.label,
      zScore: spread.zScore,
    } satisfies SpreadFact;
  });
  const dataQualityRows = qualityRows.map((row) => ({
    ...row,
    evidenceIds: [
      addEvidence(evidence, {
        confidence: row.confidence,
        id: `ev-${row.positionId}-quality`,
        instrumentId: row.positionId,
        label: `${row.positionLabel}: рівень довіри`,
        value: row.confidence,
      }),
    ],
  }));

  return {
    dataQuality: {
      alertCount: dataQualityRows.reduce((sum, row) => sum + row.alerts.length, 0),
      rows: dataQualityRows,
    },
    evidence,
    generatedAt: new Date().toISOString(),
    historyWindow: "365D",
    instruments: instrumentFacts,
    latestDate,
    locale: "uk",
    marketSummary: {
      topDownMove:
        [...instrumentFacts]
          .filter((row) => row.change7d !== null)
          .sort((a, b) => (a.change7d ?? 0) - (b.change7d ?? 0))[0] ?? null,
      topUpMove:
        [...instrumentFacts]
          .filter((row) => row.change7d !== null)
          .sort((a, b) => (b.change7d ?? 0) - (a.change7d ?? 0))[0] ?? null,
      widestSpread:
        [...spreadFacts].sort(
          (a, b) => Math.abs(b.zScore ?? 0) - Math.abs(a.zScore ?? 0),
        )[0] ?? null,
    },
    sourceVersion: `spike-ai-analytics-v1:${latestDate ?? "none"}:${instruments.length}`,
    spreads: spreadFacts,
  };
}

export function buildAiAnalyticsResult({
  factPack,
  history,
  selectedInstrumentId,
}: {
  factPack: AnalyticsFactPack;
  history: IndexHistoryPoint[];
  selectedInstrumentId: string;
}): AiAnalyticsResult {
  const anomalies = detectMarketAnomalies(factPack);
  const marketRegimes = classifyMarketRegimes(factPack);
  const similarEpisodes = findSimilarEpisodes({
    history,
    instrumentId: selectedInstrumentId,
  });
  const scenarios = buildHistoricalScenarios(similarEpisodes);

  return {
    anomalies,
    dailyBrief: buildBriefCard(factPack, anomalies, "daily"),
    marketRegimes,
    scenarios,
    similarEpisodes,
    weeklyBrief: buildBriefCard(factPack, anomalies, "weekly"),
  };
}

export function detectMarketAnomalies(factPack: AnalyticsFactPack) {
  const medianAbsDaily = median(
    factPack.instruments
      .map((row) => Math.abs(row.change1d ?? 0))
      .filter((value) => value > 0),
  );
  const anomalies: MarketAnomaly[] = [];

  for (const row of factPack.instruments) {
    if (row.percentile !== null && (row.percentile >= 95 || row.percentile <= 5)) {
      const critical = row.percentile >= 98 || row.percentile <= 2;
      anomalies.push({
        confidence: row.confidence,
        evidenceIds: row.evidenceIds,
        id: `anomaly-${row.id}-price-extreme`,
        instrumentId: row.id,
        kind: "price_extreme",
        severity: critical ? "critical" : "warning",
        summary:
          row.percentile >= 95
            ? "Поточний рівень знаходиться біля верхньої межі власної історії."
            : "Поточний рівень знаходиться біля нижньої межі власної історії.",
        title: `${row.label}: нетиповий історичний рівень`,
      });
    }

    if (
      medianAbsDaily > 0 &&
      row.change1d !== null &&
      Math.abs(row.change1d) > medianAbsDaily * 3
    ) {
      anomalies.push({
        confidence: row.confidence,
        evidenceIds: row.evidenceIds,
        id: `anomaly-${row.id}-daily-move`,
        instrumentId: row.id,
        kind: "large_daily_move",
        severity: Math.abs(row.change1d) > medianAbsDaily * 5 ? "critical" : "warning",
        summary: "Денний рух суттєво вищий за типовий денний діапазон у поточній корзині.",
        title: `${row.label}: великий денний рух`,
      });
    }

    if ((row.volatilityPercentile ?? 0) >= 90) {
      anomalies.push({
        confidence: row.confidence,
        evidenceIds: row.evidenceIds,
        id: `anomaly-${row.id}-volatility`,
        instrumentId: row.id,
        kind: "volatility_extreme",
        severity: (row.volatilityPercentile ?? 0) >= 97 ? "critical" : "warning",
        summary: "Поточна 30Д волатильність знаходиться у верхній частині історичного розподілу.",
        title: `${row.label}: підвищена волатильність`,
      });
    }

    if (row.confidence === "low" || row.confidence === "unavailable") {
      anomalies.push({
        confidence: row.confidence,
        evidenceIds: row.evidenceIds,
        id: `anomaly-${row.id}-quality`,
        instrumentId: row.id,
        kind: "data_quality",
        severity: "warning",
        summary: "Аналітичне читання цієї позиції потребує обережності через слабке покриття або якість ряду.",
        title: `${row.label}: дані потребують перевірки`,
      });
    }
  }

  for (const spread of factPack.spreads) {
    if (Math.abs(spread.zScore ?? 0) >= 2) {
      anomalies.push({
        confidence: "medium",
        evidenceIds: spread.evidenceIds,
        id: `anomaly-${spread.id}-zscore`,
        kind: "spread_extreme",
        severity: Math.abs(spread.zScore ?? 0) >= 3 ? "critical" : "warning",
        summary: "Спред відхиляється від власної історичної середньої сильніше, ніж зазвичай.",
        title: `${spread.label}: нетиповий спред`,
      });
    }
  }

  return anomalies.slice(0, 8);
}

export function classifyMarketRegimes(factPack: AnalyticsFactPack) {
  return factPack.instruments.map((row) => {
    const pricePercentile = row.percentile;
    const volPercentile = row.volatilityPercentile;
    let regime: MarketRegime = "unavailable";

    if (row.confidence === "low" || row.confidence === "unavailable") {
      regime = "thin_noisy_market";
    } else if (pricePercentile === null || volPercentile === null || row.change30d === null) {
      regime = "unavailable";
    } else if (
      (pricePercentile >= 85 || pricePercentile <= 15) &&
      volPercentile >= 70 &&
      sameDirection(row.change7d, row.change30d)
    ) {
      regime = "volatile_breakout";
    } else if (
      (pricePercentile >= 90 || pricePercentile <= 10) &&
      !sameDirection(row.change7d, row.change30d)
    ) {
      regime = "mean_reversion_watch";
    } else if (
      (row.change7d ?? 0) > 0 &&
      (row.change30d ?? 0) > 0 &&
      pricePercentile >= 60 &&
      volPercentile <= 85
    ) {
      regime = "upside_pressure";
    } else if (
      (row.change7d ?? 0) < 0 &&
      (row.change30d ?? 0) < 0 &&
      pricePercentile <= 40 &&
      volPercentile <= 85
    ) {
      regime = "downside_pressure";
    } else if (
      Math.abs(row.change30d) <= 10 &&
      volPercentile <= 40 &&
      pricePercentile >= 25 &&
      pricePercentile <= 75
    ) {
      regime = "quiet_range";
    } else {
      regime = "mean_reversion_watch";
    }

    return {
      confidence: row.confidence,
      evidenceIds: row.evidenceIds,
      instrumentId: row.id,
      instrumentLabel: row.label,
      momentum30d: row.change30d,
      pricePercentile,
      regime,
      volatilityPercentile: volPercentile,
    } satisfies MarketRegimeResult;
  });
}

export function findSimilarEpisodes({
  history,
  instrumentId,
}: {
  history: IndexHistoryPoint[];
  instrumentId: string;
}): SimilarEpisode[] {
  const series = normalizeHistory(history)
    .filter((point) => point.commodityId === instrumentId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = series.at(-1);

  if (!latest || series.length < 120) return [];

  const currentVector = buildFeatureVector(series, latest.date);
  if (!currentVector) return [];

  return series
    .slice(45, -31)
    .filter((point) => daysBetween(point.date, latest.date) > 45)
    .flatMap((point): SimilarEpisode[] => {
      const vector = buildFeatureVector(series, point.date);
      const forward = getForwardReturns(series, point.date);

      if (!vector || forward.d30 === null) return [];

      const distance = weightedDistance(currentVector, vector);
      const similarityScore = Math.max(0, Math.min(100, Math.round((100 - distance) * 10) / 10));

      return [
        {
          confidence: similarityScore >= 80 ? "high" : similarityScore >= 65 ? "medium" : "low",
          evidenceIds: [`ev-episode-${instrumentId}-${point.date}`],
          forwardReturns: forward,
          id: `episode-${instrumentId}-${point.date}`,
          instrumentId,
          similarityScore,
          startDate: point.date,
        },
      ];
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);
}

export function buildHistoricalScenarios(
  episodes: SimilarEpisode[],
): HistoricalScenarioDistribution[] {
  return (["7D", "14D", "30D"] as const).map((horizon) => {
    const key = horizon === "7D" ? "d7" : horizon === "14D" ? "d14" : "d30";
    const values = episodes
      .map((episode) => episode.forwardReturns[key])
      .filter((value): value is number => value !== null && value !== undefined)
      .sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        confidence: "unavailable",
        episodeCount: 0,
        evidenceIds: [],
        horizon,
        maxReturn: null,
        medianReturn: null,
        minReturn: null,
        p25Return: null,
        p75Return: null,
        positiveShare: null,
      };
    }

    return {
      confidence: values.length >= 5 ? "high" : values.length >= 3 ? "medium" : "low",
      episodeCount: values.length,
      evidenceIds: episodes.map((episode) => episode.id),
      horizon,
      maxReturn: values.at(-1) ?? null,
      medianReturn: quantile(values, 0.5),
      minReturn: values[0] ?? null,
      p25Return: quantile(values, 0.25),
      p75Return: quantile(values, 0.75),
      positiveShare: Math.round((values.filter((value) => value > 0).length / values.length) * 1000) / 10,
    };
  });
}

export function buildBriefCard(
  factPack: AnalyticsFactPack,
  anomalies: MarketAnomaly[],
  period: "daily" | "weekly",
): AiInsightCard {
  const topUp = factPack.marketSummary.topUpMove;
  const topDown = factPack.marketSummary.topDownMove;
  const spread = factPack.marketSummary.widestSpread;
  const details = [
    topUp
      ? `Найбільший позитивний рух 7Д: ${topUp.label} (${formatSigned(topUp.change7d)} USD/t).`
      : null,
    topDown
      ? `Найбільший негативний рух 7Д: ${topDown.label} (${formatSigned(topDown.change7d)} USD/t).`
      : null,
    spread
      ? `Найбільш нетиповий спред: ${spread.label}, z-score ${formatNullable(spread.zScore)}.`
      : null,
    anomalies.length > 0
      ? `Виявлено ${anomalies.length} аномальних або QA-подій для ручного перегляду.`
      : "Суттєвих аномалій за поточними правилами не виявлено.",
  ].filter((item): item is string => Boolean(item));
  const card = {
    caveat:
      "AI-підсумок є аналітичним описом історичних даних, а не ціновим прогнозом або торговою рекомендацією.",
    confidence: anomalies.some((anomaly) => anomaly.severity === "critical")
      ? "medium"
      : "high",
    details,
    evidenceIds: [
      ...(topUp?.evidenceIds ?? []),
      ...(topDown?.evidenceIds ?? []),
      ...(spread?.evidenceIds ?? []),
    ],
    id: `${period}-brief-${factPack.latestDate ?? "none"}`,
    summary:
      period === "daily"
        ? "Короткий опис головних змін дня за опублікованою історією індексів."
        : "Короткий опис тижневої конфігурації ринку за індексною історією.",
    title: period === "daily" ? "Денний AI Market Brief" : "Тижневий AI Market Brief",
    type: period === "daily" ? "daily_brief" : "weekly_brief",
  } satisfies AiInsightCard;

  return sanitizeInsightCard(card);
}

export function sanitizeInsightCard(card: AiInsightCard) {
  const text = [card.title, card.summary, ...(card.details ?? []), card.caveat ?? ""]
    .join(" ")
    .toLowerCase();
  const hasForbidden = FORBIDDEN_AI_TERMS.some((term) => text.includes(term));

  if (!hasForbidden) return card;

  return {
    ...card,
    details: [
      "Текст замінено deterministic fallback через недопустиму лексику у згенерованому описі.",
    ],
    summary: "Аналітичний опис недоступний для публічного показу.",
  };
}

function addEvidence(evidence: MetricEvidence[], item: MetricEvidence) {
  evidence.push(item);
  return item.id;
}

function buildFeatureVector(series: IndexHistoryPoint[], date: string) {
  const point = series.find((row) => row.date === date);
  const index = series.findIndex((row) => row.date === date);
  if (!point || index < 31) return null;

  const prior = series.slice(0, index + 1);
  const stats = computeRangeStats(prior.map((row) => row.value), point.value);
  const vol = realizedVolatility(prior.slice(-31));
  const volHistory = prior
    .slice(31)
    .map((_, offset) => realizedVolatility(prior.slice(offset, offset + 31)))
    .filter((value): value is number => value !== null);

  return {
    change7d: getLookbackChange(prior, date, 7).abs ?? 0,
    change30d: getLookbackChange(prior, date, 30).abs ?? 0,
    percentile: stats?.percentile ?? 50,
    season: Math.sin((dayOfYear(date) / 365) * Math.PI * 2) * 10,
    volatilityPercentile: vol === null || volHistory.length < 5 ? 50 : percentileRank(volHistory, vol),
  };
}

function getForwardReturns(series: IndexHistoryPoint[], date: string) {
  const current = series.find((point) => point.date === date);
  const getForward = (days: number) => {
    const forward = series.find((point) => point.date >= shiftDate(date, days));
    if (!current || !forward) return null;
    return Math.round((forward.value - current.value) * 10) / 10;
  };

  return {
    d7: getForward(7),
    d14: getForward(14),
    d30: getForward(30),
  };
}

function weightedDistance(
  a: NonNullable<ReturnType<typeof buildFeatureVector>>,
  b: NonNullable<ReturnType<typeof buildFeatureVector>>,
) {
  const weighted =
    Math.abs(a.change30d - b.change30d) * 0.9 +
    Math.abs(a.percentile - b.percentile) * 0.45 +
    Math.abs(a.volatilityPercentile - b.volatilityPercentile) * 0.25 +
    Math.abs(a.change7d - b.change7d) * 0.45 +
    Math.abs(a.season - b.season) * 0.2;
  return Math.min(100, weighted / 2.5);
}

function sameDirection(first: number | null, second: number | null) {
  if (first === null || second === null) return false;
  return (first > 0 && second > 0) || (first < 0 && second < 0);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  return quantile([...values].sort((a, b) => a - b), 0.5);
}

function formatSigned(value: number | null) {
  if (value === null) return "n/a";
  return `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}`;
}

function formatNullable(value: number | null) {
  return value === null ? "n/a" : String(Math.round(value * 100) / 100);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, "-")
    .replace(/(^-|-$)/g, "");
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dayOfYear(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const start = Date.UTC(value.getUTCFullYear(), 0, 0);
  return Math.floor((value.getTime() - start) / 86_400_000);
}

function daysBetween(first: string, second: string) {
  return Math.abs(
    (new Date(`${second}T00:00:00.000Z`).getTime() -
      new Date(`${first}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}
