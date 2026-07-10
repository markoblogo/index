"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";
import {
  SCENARIO_FORECAST_DAYS,
  type ScenarioMarketReadSnapshot,
} from "@/lib/scenario-market-read";
import { getDeliveryBasisConfigForCommodityId } from "@/lib/tenant-basis";

type ScenarioSourcePoint = {
  commodityId: CommodityId;
  date: string;
  dayChange: number;
  value: number;
};

type ScenarioModelPanelProps = {
  commodities: Commodity[];
  history: ScenarioSourcePoint[];
  locale: Locale;
  mediaHubHighlights?: string[];
  mediaHubReportDate?: string;
  snapshot?: ScenarioMarketReadSnapshot;
};

type SpreadDefinition = {
  id: string;
  a: CommodityId;
  b: CommodityId;
  label: Record<Locale, string>;
};

type MarketSeriesPoint = {
  date: string;
  value: number;
};

type MarketDriver = {
  body: string;
  label: string;
  tone: "green" | "lime" | "amber" | "blue";
  value: string;
};

type SeasonalityRead = {
  averageMove: number | null;
  bestMove: number | null;
  bestYear: number | null;
  confidence: number | null;
  lookbackYears: number;
};

const HISTORY_END_X = 50;
const HISTORY_WINDOW_DAYS = 30;
const MAX_ISOLATED_SPREAD_JUMP = 30;
const MAX_ABSOLUTE_SPREAD = 250;

const spreadDefinitions: SpreadDefinition[] = [
  {
    a: "wheat-115",
    b: "feed-wheat",
    id: "wheat-feed",
    label: {
      en: "Wheat 11.5% premium vs feed wheat",
      uk: "Премія пшениці 11.5% до фуражної",
    },
  },
  {
    a: "corn",
    b: "feed-wheat",
    id: "corn-feed",
    label: {
      en: "Corn vs feed wheat spread",
      uk: "Спред кукурудзи до фуражної пшениці",
    },
  },
  {
    a: "gmo-soybean",
    b: "corn",
    id: "soy-corn",
    label: {
      en: "GMO soybean premium vs corn",
      uk: "Премія сої ГМО до кукурудзи",
    },
  },
];

export function ScenarioModelPanel({
  commodities,
  history,
  locale,
  mediaHubHighlights = [],
  mediaHubReportDate,
  snapshot,
}: ScenarioModelPanelProps) {
  const [mode, setMode] = useState<"commodity" | "spread">("commodity");
  const [commodityId, setCommodityId] = useState<CommodityId>(
    commodities[0]?.id ?? "corn",
  );
  const [spreadId, setSpreadId] = useState(spreadDefinitions[0].id);
  const text = getCopy(locale);
  const projectedSeries = useMemo(
    () => buildProjectedSeries(snapshot, mode, commodityId, spreadId),
    [commodityId, mode, snapshot, spreadId],
  );

  const series = useMemo(() => {
    if (projectedSeries) {
      return projectedSeries.actual;
    }

    if (mode === "commodity") {
      return history
        .filter((point) => point.commodityId === commodityId)
        .map((point) => ({
          date: point.date,
          value: point.value,
        }));
    }

    const spread =
      spreadDefinitions.find((item) => item.id === spreadId) ??
      spreadDefinitions[0];
    return buildSpreadSeries(history, spread);
  }, [commodityId, history, mode, projectedSeries, spreadId]);

  const sample = useMemo(() => series.slice(-HISTORY_WINDOW_DAYS), [series]);
  const seasonalProjection = projectedSeries?.forecast ?? [];
  const seasonalityOverride = useMemo(
    () => buildSeasonalityFromProjection(
      sample,
      seasonalProjection,
      projectedSeries?.lookbackYears ?? 0,
    ),
    [projectedSeries?.lookbackYears, sample, seasonalProjection],
  );
  const read = useMemo(
    () => buildMarketRead(
      series,
      sample,
      text,
      locale,
      mode,
      mediaHubHighlights,
      mediaHubReportDate,
      projectedSeries?.seasonalRange ?? null,
      seasonalityOverride,
    ),
    [mediaHubHighlights, mediaHubReportDate, mode, projectedSeries?.seasonalRange, sample, seasonalityOverride, series, text],
  );
  const chartValues =
    sample.length > 0
      ? sample.flatMap((point) => [
          point.value,
          read.normalLower,
          read.normalUpper,
          read.seasonality.averageMove === null
            ? point.value
            : point.value + read.seasonality.averageMove,
          read.seasonality.bestMove === null
            ? point.value
            : point.value + read.seasonality.bestMove,
          ...seasonalProjection.map((point) => point.value),
        ])
      : [0, read.normalLower, read.normalUpper];
  const range = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
  const title =
    mode === "commodity"
      ? getCommodityChartTitle(
          commodities.find((commodity) => commodity.id === commodityId),
          locale,
        )
      : spreadDefinitions.find((spread) => spread.id === spreadId)?.label[locale];

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.4rem] border border-black bg-white p-4 shadow-[0_28px_80px_rgba(0,0,0,0.12)]">
      <div className="border-b border-black pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase leading-6 text-black">
              {text.title}
            </h2>
            <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-black/55">
              {text.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_1fr] lg:items-end">
        <div className="flex overflow-hidden rounded-full border border-black bg-white">
          {(["commodity", "spread"] as const).map((item) => (
            <button
              className={`px-3 py-2 text-xs font-black uppercase transition ${
                mode === item
                  ? "bg-uga-dark text-white"
                  : "bg-white text-black/55 hover:text-black"
              }`}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {item === "commodity" ? text.commodityMode : text.spreadMode}
            </button>
          ))}
        </div>

        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
          {text.commodityLabel}
          <select
            className="w-full rounded-[0.55rem] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
            disabled={mode !== "commodity"}
            onChange={(event) => setCommodityId(event.target.value as CommodityId)}
            value={commodityId}
          >
            {commodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.name[locale]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
          {text.spreadLabel}
          <select
            className="w-full rounded-[0.55rem] border border-black bg-white px-3 py-2 text-sm font-semibold text-black disabled:opacity-45"
            disabled={mode !== "spread"}
            onChange={(event) => setSpreadId(event.target.value)}
            value={spreadId}
          >
            {spreadDefinitions.map((spread) => (
              <option key={spread.id} value={spread.id}>
                {spread.label[locale]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1rem] border border-black bg-uga-mist p-4">
          <h3 className="text-2xl font-black uppercase leading-tight text-black">
            {text.priceAnalysis}
          </h3>
          <ul className="mt-4 grid gap-3 text-sm font-semibold leading-5 text-black/68">
            {read.summary.map((item) => (
              <li className="flex gap-2" key={item}>
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-uga-green" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1rem] border border-black bg-[#050805] p-4 text-white">
          <div className="mb-2 flex flex-wrap justify-between gap-3 text-xs font-black uppercase text-white/58">
            <span>{title}</span>
            <span>{read.latestLabel}</span>
            <span>{text.chartWindow}</span>
          </div>
          <svg
            aria-label={text.title}
            className="h-64 w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <GridLines range={range} />
            {sample.length > 1 ? (
              <>
                <rect
                  fill="rgba(57,255,20,0.08)"
                  height="72"
                  width={recentWindowWidth(sample.length, HISTORY_END_X)}
                  x={HISTORY_END_X - recentWindowWidth(sample.length, HISTORY_END_X)}
                  y="14"
                />
                <polygon
                  className="market-band"
                  fill="var(--color-lime)"
                  fillOpacity="0.16"
                  points={toBandPoints(
                    sample,
                    read.normalLower,
                    read.normalUpper,
                    range.min,
                    range.max,
                    HISTORY_END_X,
                  )}
                />
                <polyline
                  className="market-line"
                  fill="none"
                  points={toChartPoints(
                    sample.map((point) => point.value),
                    range.min,
                    range.max,
                    HISTORY_END_X,
                  )}
                  stroke="var(--color-lime)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={HISTORY_END_X}
                  cy={toChartY(sample.at(-1)?.value ?? 0, range.min, range.max)}
                  fill="#f8f8f2"
                  r="1.9"
                  stroke="var(--color-lime)"
                  strokeWidth="0.8"
                  vectorEffect="non-scaling-stroke"
                />
                <SeasonalityProjection
                  forecast={seasonalProjection}
                  latest={sample.at(-1)?.value ?? 0}
                  range={range}
                  seasonality={read.seasonality}
                />
              </>
            ) : null}
          </svg>
          <div className="mt-1 grid grid-cols-3 text-[0.58rem] font-black uppercase text-white/42">
            <span>{formatChartDate(sample[0]?.date, locale)}</span>
            <span className="text-center">{formatChartDate(sample.at(-1)?.date, locale)}</span>
            <span className="text-right">{formatChartDate(seasonalProjection.at(-1)?.date, locale)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-black uppercase text-white/62">
            <span>{text.publishedLine}</span>
            <span>{text.seasonalProjection}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {read.drivers.filter((driver) => driver.value !== text.noSeasonalData).map((driver) => (
          <div
            className="rounded-[0.95rem] border border-black bg-white p-3"
            key={driver.label}
          >
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-black/45">
              {driver.label}
            </p>
            <p className={`mt-2 text-xl font-black ${driverToneClass(driver.tone)}`}>
              {driver.value}
            </p>
            <p className="mt-1 text-xs font-semibold leading-4 text-black/58">
              {driver.body}
            </p>
          </div>
        ))}
      </div>

      <style jsx>{`
        .market-line {
          opacity: 0;
          animation: market-line-in 0.6s ease-out forwards;
        }

        .market-band {
          opacity: 0;
          animation: market-band 1s ease-out 0.45s forwards;
        }

        @keyframes market-line-in {
          to {
            opacity: 1;
          }
        }

        @keyframes market-band {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </article>
  );
}

function buildSpreadSeries(history: ScenarioSourcePoint[], spread: SpreadDefinition) {
  const byDate = new Map<string, Map<CommodityId, number>>();

  for (const point of history) {
    const values = byDate.get(point.date) ?? new Map<CommodityId, number>();
    values.set(point.commodityId, point.value);
    byDate.set(point.date, values);
  }

  let latestFirst: number | undefined;
  let latestSecond: number | undefined;

  return normalizeSpreadSeries(Array.from(byDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .flatMap(([date, values]) => {
      latestFirst = values.get(spread.a) ?? latestFirst;
      latestSecond = values.get(spread.b) ?? latestSecond;

      if (latestFirst === undefined || latestSecond === undefined) {
        return [];
      }

      return [
        {
          date,
          value: roundOne(latestFirst - latestSecond),
        },
      ];
    }));
}

function normalizeSpreadSeries(series: Array<{ date: string; value: number }>) {
  return series.map((point, index) => {
    const previous = series[index - 1];
    const next = series[index + 1];

    if (!previous) {
      return point;
    }

    const isAbsoluteOutlier = Math.abs(point.value) > MAX_ABSOLUTE_SPREAD;
    const isIsolatedJump =
      Boolean(next) &&
      Math.abs(point.value - previous.value) > MAX_ISOLATED_SPREAD_JUMP &&
      Math.abs(point.value - next.value) > MAX_ISOLATED_SPREAD_JUMP &&
      Math.abs(previous.value - next.value) <= MAX_ISOLATED_SPREAD_JUMP;

    return isAbsoluteOutlier || isIsolatedJump
      ? { ...point, value: previous.value }
      : point;
  });
}

function buildMarketRead(
  series: MarketSeriesPoint[],
  sample: MarketSeriesPoint[],
  text: ReturnType<typeof getCopy>,
  locale: Locale,
  mode: "commodity" | "spread",
  mediaHubHighlights: string[],
  mediaHubReportDate: string | undefined,
  seasonalRange: { lower: number; upper: number } | null,
  seasonalityOverride?: SeasonalityRead | null,
) {
  const latest = sample.at(-1)?.value ?? 0;
  const previous = sample.at(-2)?.value ?? latest;
  const first = sample[0]?.value ?? latest;
  const monthAgo = sample.at(-31)?.value ?? first;
  const change1d = roundOne(latest - previous);
  const change30d = roundOne(latest - monthAgo);
  const values = sample.map((point) => point.value);
  const average = averageValue(values);
  const volatility = standardDeviation(
    sample.map((point, index) =>
      index === 0 ? 0 : point.value - sample[index - 1].value,
    ),
  );
  const normalBand = Math.max(volatility * 2.2, Math.abs(average) * 0.012, 1);
  const normalLower = average - normalBand;
  const normalUpper = average + normalBand;
  const percentile = percentileRank(values, latest);
  const seasonality = seasonalityOverride ?? buildSeasonalityRead(series);
  const regime = getRegime(change1d, change30d, volatility, percentile, mode, text);
  const confidence =
    seasonality.confidence !== null && seasonality.confidence >= 72
      ? text.confidenceHigh
      : sample.length >= 90
      ? text.confidenceHigh
      : sample.length >= 30
        ? text.confidenceNormal
        : text.confidenceLimited;

  return {
    confidence,
    drivers: [
      {
        body: text.indexMoveBody(change1d),
        label: text.indexMove,
        tone: change1d > 0 ? "green" : change1d < 0 ? "amber" : "blue",
        value: formatSigned(change1d),
      },
      {
        body: text.nextSeasonalMoveBody(7, seasonality.lookbackYears),
        label: text.next7Days,
        tone:
          (seasonalMoveAtDay(sample, seasonality.averageMove, 7) ?? 0) > 0
            ? "green"
            : (seasonalMoveAtDay(sample, seasonality.averageMove, 7) ?? 0) < 0
              ? "amber"
              : "blue",
        value:
          seasonalMoveAtDay(sample, seasonality.averageMove, 7) === null
            ? text.noSeasonalData
            : formatSigned(seasonalMoveAtDay(sample, seasonality.averageMove, 7) ?? 0),
      },
      {
        body: text.nextSeasonalMoveBody(30, seasonality.lookbackYears),
        label: text.next30Days,
        tone:
          (seasonality.averageMove ?? 0) > 0
            ? "green"
            : (seasonality.averageMove ?? 0) < 0
              ? "amber"
              : "blue",
        value:
          seasonality.averageMove === null
            ? text.noSeasonalData
            : formatSigned(seasonality.averageMove),
      },
    ] satisfies MarketDriver[],
    latestLabel: text.latestLabel(latest),
    normalLower,
    normalUpper,
    regime: regime.title,
    seasonality,
    summary: [
      text.summaryCurrent(latest, seasonalRange),
      text.summarySeasonal(
        seasonalMoveAtDay(sample, seasonality.averageMove, 7),
        seasonality.averageMove,
        seasonality.lookbackYears,
      ),
      text.summarySeasonContext(getSeasonContext(sample.at(-1)?.date, locale)),
      text.summaryMediaHub(
        isFreshMediaHubContext(sample.at(-1)?.date, mediaHubReportDate)
          ? mediaHubHighlights[0]
          : undefined,
      ),
    ],
  };
}

function getRegime(
  change1d: number,
  change30d: number,
  volatility: number,
  percentile: number,
  mode: "commodity" | "spread",
  text: ReturnType<typeof getCopy>,
) {
  if (volatility >= 5) {
    return {
      body: text.regimeVolatileBody,
      title: text.regimeVolatile,
    };
  }

  if (mode === "spread" && change30d >= 4) {
    return {
      body: text.regimeWideningBody,
      title: text.regimeWidening,
    };
  }

  if (mode === "spread" && change30d <= -4) {
    return {
      body: text.regimeCompressionBody,
      title: text.regimeCompression,
    };
  }

  if (change1d < -1 || change30d < -4 || percentile < 35) {
    return {
      body: text.regimePressureBody,
      title: text.regimePressure,
    };
  }

  if (change1d > 1 || change30d > 4 || percentile > 65) {
    return {
      body: text.regimeReboundBody,
      title: text.regimeRebound,
    };
  }

  return {
    body: text.regimeStableBody,
    title: text.regimeStable,
  };
}

function buildSeasonalityRead(series: MarketSeriesPoint[]): SeasonalityRead {
  const latest = series.at(-1);

  if (!latest) {
    return {
      averageMove: null,
      bestMove: null,
      bestYear: null,
      confidence: null,
      lookbackYears: 0,
    };
  }

  const latestDate = new Date(`${latest.date}T00:00:00.000Z`);
  const currentYear = latestDate.getUTCFullYear();
  const currentDoy = getDayOfYear(latestDate);
  const currentCurve = getWindowBeforeDay(series, currentYear, currentDoy, 30);
  const priorYears = [...new Set(series.map((point) => getYear(point.date)))]
    .filter((year) => year < currentYear)
    .sort((first, second) => second - first);
  const candidates = priorYears
    .map((year) => {
      const curve = getWindowBeforeDay(series, year, currentDoy, 30);
      const move = getForwardMove(series, year, currentDoy, 30);
      const confidence = scoreCurveSimilarity(currentCurve, curve);

      return {
        confidence,
        move,
        year,
      };
    })
    .filter((candidate) => candidate.confidence !== null || candidate.move !== null);
  const moveCandidates = candidates
    .filter((candidate) => candidate.move !== null)
    .slice(0, 3);
  const bestCandidate = candidates
    .filter((candidate) => candidate.confidence !== null)
    .sort((first, second) => (second.confidence ?? 0) - (first.confidence ?? 0))[0];

  return {
    averageMove:
      moveCandidates.length === 0
        ? null
        : roundOne(
            moveCandidates.reduce((sum, candidate) => sum + (candidate.move ?? 0), 0) /
              moveCandidates.length,
          ),
    bestMove:
      bestCandidate?.move === null || bestCandidate?.move === undefined
        ? null
        : roundOne(bestCandidate.move),
    bestYear: bestCandidate?.year ?? null,
    confidence:
      bestCandidate?.confidence === null || bestCandidate?.confidence === undefined
        ? null
        : Math.round(bestCandidate.confidence),
    lookbackYears: moveCandidates.length,
  };
}

function getWindowBeforeDay(
  series: MarketSeriesPoint[],
  year: number,
  targetDoy: number,
  lookbackDays: number,
) {
  return series.filter((point) => {
    const date = new Date(`${point.date}T00:00:00.000Z`);

    if (date.getUTCFullYear() !== year) {
      return false;
    }

    const doy = getDayOfYear(date);
    return doy >= targetDoy - lookbackDays && doy <= targetDoy;
  });
}

function getForwardMove(
  series: MarketSeriesPoint[],
  year: number,
  targetDoy: number,
  forwardDays: number,
) {
  const yearPoints = series
    .filter((point) => getYear(point.date) === year)
    .map((point) => ({
      ...point,
      doy: getDayOfYear(new Date(`${point.date}T00:00:00.000Z`)),
    }));
  const start = getClosestPointByDoy(yearPoints, targetDoy, 10);
  const future = getClosestPointByDoy(yearPoints, targetDoy + forwardDays, 14);

  if (!start || !future) {
    return null;
  }

  return future.value - start.value;
}

function getClosestPointByDoy(
  points: Array<MarketSeriesPoint & { doy: number }>,
  targetDoy: number,
  tolerance: number,
) {
  return points
    .map((point) => ({
      distance: Math.abs(point.doy - targetDoy),
      point,
    }))
    .filter((entry) => entry.distance <= tolerance)
    .sort((first, second) => first.distance - second.distance)[0]?.point;
}

function scoreCurveSimilarity(
  currentCurve: MarketSeriesPoint[],
  candidateCurve: MarketSeriesPoint[],
) {
  if (currentCurve.length < 6 || candidateCurve.length < 6) {
    return null;
  }

  const current = resampleNormalizedCurve(currentCurve, 16);
  const candidate = resampleNormalizedCurve(candidateCurve, 16);
  const mae =
    current.reduce((sum, value, index) => sum + Math.abs(value - candidate[index]), 0) /
    current.length;

  return Math.max(0, Math.min(100, 100 - mae * 42));
}

function resampleNormalizedCurve(points: MarketSeriesPoint[], size: number) {
  const values = points.map((point) => point.value);
  const first = values[0] ?? 0;
  const deltas = values.map((value) => value - first);
  const maxAbs = Math.max(...deltas.map((value) => Math.abs(value)), 1);
  const normalized = deltas.map((value) => value / maxAbs);

  return Array.from({ length: size }, (_, index) => {
    const rawIndex = (index / Math.max(size - 1, 1)) * Math.max(normalized.length - 1, 0);
    const lower = Math.floor(rawIndex);
    const upper = Math.min(Math.ceil(rawIndex), normalized.length - 1);
    const ratio = rawIndex - lower;

    return (normalized[lower] ?? 0) * (1 - ratio) + (normalized[upper] ?? 0) * ratio;
  });
}

function getDayOfYear(date: Date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86_400_000);
}

function getYear(date: string) {
  return Number.parseInt(date.slice(0, 4), 10);
}

function standardDeviation(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}

function averageValue(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentileRank(values: number[], latest: number) {
  if (values.length <= 1) {
    return 50;
  }

  const belowOrEqual = values.filter((value) => value <= latest).length;
  return (belowOrEqual / values.length) * 100;
}

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.14, 1);

  return {
    max: max + padding,
    min: min - padding,
  };
}

function toChartPoints(
  values: number[],
  min: number,
  max: number,
  endX = 100,
) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * endX;
      const y = toChartY(value, min, max);
      return `${x},${y}`;
    })
    .join(" ");
}

function toChartSegmentPoints(
  values: number[],
  min: number,
  max: number,
  startX: number,
  endX: number,
) {
  return values
    .map((value, index) => {
      const x = values.length === 1
        ? startX
        : startX + (index / (values.length - 1)) * (endX - startX);
      return `${x},${toChartY(value, min, max)}`;
    })
    .join(" ");
}

function toBandPoints(
  sample: MarketSeriesPoint[],
  lower: number,
  upper: number,
  min: number,
  max: number,
  endX = 100,
) {
  const upperPoints = sample.map((_, index) => {
    const x = sample.length === 1 ? 0 : (index / (sample.length - 1)) * endX;
    return `${x},${toChartY(upper, min, max)}`;
  });
  const lowerPoints = sample
    .map((_, index) => {
      const x = sample.length === 1 ? 0 : (index / (sample.length - 1)) * endX;
      return `${x},${toChartY(lower, min, max)}`;
    })
    .reverse();

  return [...upperPoints, ...lowerPoints].join(" ");
}

function toChartY(value: number, min: number, max: number) {
  const range = Math.max(max - min, 1);
  return 84 - ((value - min) / range) * 68;
}

function recentWindowWidth(length: number, endX = 100) {
  return Math.min(endX * 0.38, (Math.min(14, length) / Math.max(length, 1)) * endX);
}

function SeasonalityProjection({
  forecast,
  latest,
  range,
  seasonality,
}: {
  forecast: MarketSeriesPoint[];
  latest: number;
  range: { max: number; min: number };
  seasonality: SeasonalityRead;
}) {
  if (forecast.length > 0) {
    return (
      <polyline
        fill="none"
        points={toChartSegmentPoints(
          [latest, ...forecast.map((point) => point.value)],
          range.min,
          range.max,
          HISTORY_END_X,
          100,
        )}
        stroke="#f8f8f2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  const projections = [
    { move: seasonality.averageMove, stroke: "var(--spike-accent)" },
    { move: seasonality.bestMove, stroke: "#f8f8f2" },
  ].filter((item): item is { move: number; stroke: string } => item.move !== null);

  return (
    <>
      {projections.map((projection, index) => (
        <line
          key={`${projection.stroke}-${index}`}
          stroke={projection.stroke}
          strokeDasharray="4 4"
          strokeLinecap="round"
          strokeWidth={index === 0 ? "2.1" : "1.5"}
          vectorEffect="non-scaling-stroke"
          x1={HISTORY_END_X}
          x2="100"
          y1={toChartY(latest, range.min, range.max)}
          y2={toChartY(latest + projection.move, range.min, range.max)}
        />
      ))}
    </>
  );
}

function GridLines({ range }: { range: { max: number; min: number } }) {
  const labels = [range.max, (range.max + range.min) / 2, range.min];

  return (
    <>
      {[16, 33, 50, 67, 84].map((y) => (
        <line
          key={y}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          x1="0"
          x2="100"
          y1={y}
          y2={y}
        />
      ))}
      {labels.map((value) => (
        <text
          fill="rgba(255,255,255,0.58)"
          fontSize="3"
          fontWeight="800"
          key={value}
          textAnchor="end"
          x="99"
          y={toChartY(value, range.min, range.max) - 1.5}
        >
          {Math.round(value)} $
        </text>
      ))}
    </>
  );
}

function buildProjectedSeries(
  snapshot: ScenarioMarketReadSnapshot | undefined,
  mode: "commodity" | "spread",
  commodityId: CommodityId,
  spreadId: string,
) {
  if (!snapshot) {
    return null;
  }

  if (mode === "commodity") {
    return snapshot.seriesByCommodityId[commodityId] ?? null;
  }

  const spread = spreadDefinitions.find((item) => item.id === spreadId);
  if (!spread) {
    return null;
  }

  const first = snapshot.seriesByCommodityId[spread.a];
  const second = snapshot.seriesByCommodityId[spread.b];
  if (!first || !second) {
    return null;
  }

  return {
    actual: subtractSeries(first.actual, second.actual),
    forecast: subtractSeries(first.forecast, second.forecast),
    lookbackYears: Math.min(first.lookbackYears, second.lookbackYears),
    seasonalRange: null,
  };
}

function subtractSeries(
  first: MarketSeriesPoint[],
  second: MarketSeriesPoint[],
) {
  const secondValueByDate = new Map(second.map((point) => [point.date, point.value]));

  return first.flatMap((point) => {
    const value = secondValueByDate.get(point.date);
    return value === undefined ? [] : [{ date: point.date, value: roundOne(point.value - value) }];
  });
}

function buildSeasonalityFromProjection(
  actual: MarketSeriesPoint[],
  forecast: MarketSeriesPoint[],
  lookbackYears: number,
): SeasonalityRead | null {
  const latest = actual.at(-1)?.value;
  const projected = forecast.at(-1)?.value;
  if (latest === undefined || projected === undefined) {
    return null;
  }

  return {
    averageMove: roundOne(projected - latest),
    bestMove: null,
    bestYear: null,
    confidence: null,
    lookbackYears,
  };
}

function seasonalMoveAtDay(
  actual: MarketSeriesPoint[],
  averageMove: number | null,
  day: number,
) {
  if (averageMove === null || actual.length === 0) {
    return null;
  }

  return roundOne(averageMove * (day / SCENARIO_FORECAST_DAYS));
}

function getCommodityChartTitle(commodity: Commodity | undefined, locale: Locale) {
  if (!commodity) {
    return "";
  }

  const basis = getDeliveryBasisConfigForCommodityId(commodity.id).name;
  const isChop = /chop/i.test(basis);
  const group = commodity.group === "processing"
    ? locale === "uk" ? "Олійні переробка" : "Oilseeds processing"
    : isChop
      ? locale === "uk" ? "Chop експорт" : "Chop export"
      : commodity.category === "seasonal-export"
        ? locale === "uk" ? "Олійні експорт" : "Oilseeds export"
        : locale === "uk" ? "Зернові експорт" : "Grains export";

  return `${commodity.name[locale]} · ${basis} · ${group}`;
}

function getSeasonContext(date: string | undefined, locale: Locale) {
  const month = date ? new Date(`${date}T00:00:00.000Z`).getUTCMonth() + 1 : 0;

  if (month >= 7 && month <= 10) {
    return locale === "uk"
      ? "Триває період жнив в Україні: надходження нового врожаю може посилювати пропозицію та стримувати ціну."
      : "Ukraine is in the harvest period: new-crop arrivals can expand supply and cap prices.";
  }

  if (month >= 5 && month <= 6) {
    return locale === "uk"
      ? "Це кінець сезону: обмеження старого врожаю може підтримувати ціну, а очікування нового врожаю стримує премії."
      : "This is the end of the season: tighter old-crop supply can support price while new-crop expectations cap premiums.";
  }

  if (month >= 11 || month <= 2) {
    return locale === "uk"
      ? "Ринок перебуває в середині сезону, коли ціна сильніше залежить від темпів експорту, логістики та попиту."
      : "The market is in the middle of the season, when export pace, logistics and demand carry more weight for price.";
  }

  return locale === "uk"
    ? "Ринок наближається до завершення сезону: баланс старого врожаю та очікування нового поступово формують ціну."
    : "The market is approaching the season end: the old-crop balance and new-crop expectations increasingly shape price.";
}

function describeSeasonalPosition(
  value: number,
  range: { lower: number; upper: number },
  locale: Locale,
) {
  const width = Math.max(range.upper - range.lower, 1);
  const position = (value - range.lower) / width;

  if (position <= 0.2) {
    return locale === "uk" ? "знаходиться біля нижньої межі" : "is near the lower boundary of";
  }

  if (position >= 0.8) {
    return locale === "uk" ? "знаходиться біля верхньої межі" : "is near the upper boundary of";
  }

  return locale === "uk" ? "знаходиться в середині" : "is in the middle of";
}

function isFreshMediaHubContext(
  indexDate: string | undefined,
  reportDate: string | undefined,
) {
  if (!indexDate || !reportDate) {
    return false;
  }

  const age = Math.abs(
    new Date(`${indexDate}T00:00:00.000Z`).getTime() -
      new Date(`${reportDate}T00:00:00.000Z`).getTime(),
  );

  return age <= 2 * 24 * 60 * 60 * 1000;
}

function formatChartDate(value: string | undefined, locale: Locale) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function driverToneClass(tone: MarketDriver["tone"]) {
  if (tone === "amber") {
    return "text-[#ffb84d]";
  }

  if (tone === "blue") {
    return "text-[#5cd7ff]";
  }

  if (tone === "lime") {
    return "text-[#b9ff18]";
  }

  return "text-uga-green";
}

function formatSigned(value: number) {
  if (Math.abs(value) < 0.05) {
    return "0 USD/t";
  }

  return `${value > 0 ? "+" : ""}${roundOne(value)} USD/t`;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function trimSentence(value: string) {
  const trimmed = value.replace(/^[•\-\s]+/, "").replace(/\s+/g, " ").trim();
  const sentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;

  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}...` : sentence;
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      aiContext: "AI контекст",
      commodityLabel: "Культура",
      commodityMode: "Культура",
      confidenceHigh: "висока довіра",
      confidenceLimited: "обмежена довіра",
      confidenceNormal: "нормальна довіра",
      contextBody: (mode: "commodity" | "spread") =>
        mode === "spread"
          ? "Спред читається як сигнал розриву між двома ринковими корзинами."
          : "MediaHub-контекст може пояснювати рух, але не змінює офіційне значення.",
      days: "днів",
      chartWindow: "30 днів + наступні 30 днів",
      description:
        "AI Market Read пояснює поточний контекст ринку та зміни індексів. Надалі цей блок планується як частина платної аналітичної підписки.",
      indexMove: "Денний рух",
      indexMoveBody: (change: number) =>
        Math.abs(change) < 0.05
          ? "Останнє значення не показує суттєвого денного імпульсу."
          : "Остання зміна дає короткий сигнал для читання поточного тону.",
      next7Days: "Наступні 7 днів",
      next30Days: "Наступні 30 днів",
      nextSeasonalMoveBody: (days: number, years: number) =>
        years > 0
          ? `Сезонна траєкторія на ${days} днів за ${years} попередні роки.`
          : "Недостатньо історії для сезонної траєкторії.",
      latestLabel: (value: number) => `${roundOne(value)} USD/t`,
      marketRegime: "Режим ринку",
      normalRange: "нормальний діапазон",
      noSeasonalData: "н/д",
      periodMove: "Рух періоду",
      periodMoveBody: (days: number) => `Зміна за останні ${days} точок архіву.`,
      priceAnalysis: "Price Analysis",
      publishedLine: "опублікована історія",
      seasonalProjection: "сезонна траєкторія, наступні 30 днів",
      recentWindow: "останні точки",
      regimeCompression: "Spread compression",
      regimeCompressionBody:
        "Різниця між позиціями стискається, що може означати вирівнювання попиту або логістичного тиску.",
      regimePressure: "Market pressure",
      regimePressureBody:
        "AI-read визначає ознаки ринкового тиску, порівнюючи поточний рівень і останній імпульс з історичними даними.",
      regimeRebound: "Rebound / strength",
      regimeReboundBody:
        "Поточний рух виглядає сильнішим за середній тон вибраного архівного вікна.",
      regimeStable: "Stable range",
      regimeStableBody:
        "Поточне значення залишається близьким до нормального архівного діапазону.",
      regimeVolatile: "High volatility",
      regimeVolatileBody:
        "Короткострокові зміни вищі за нормальний фон, тому сигнал треба читати обережно.",
      regimeWidening: "Spread widening",
      regimeWideningBody:
        "Різниця між позиціями розширюється, що підсвічує зміну відносної сили.",
      spreadLabel: "Конкретний спред",
      spreadMode: "Спред",
      seasonalAverage: "Сезонність 3Y",
      seasonalAverageBody: (years: number) =>
        years > 0
          ? `Середній рух наступних 30 днів за ${years} попередні роки.`
          : "Потрібно більше історії для сезонного сценарію.",
      similarYear: "Схожий рік",
      similarYearBody: (year: number | null) =>
        year === null
          ? "Схожий сезонний рік ще не визначено."
          : `Найближча форма сезонності зараз: ${year}.`,
      similarity: "Схожість",
      summaryCurrent: (value: number, range: { lower: number; upper: number } | null) =>
        range
          ? `Поточна ціна ${roundOne(value)} USD/t ${describeSeasonalPosition(value, range, "uk")} сезонного діапазону ${roundOne(range.lower)}-${roundOne(range.upper)} USD/t за попередні 3 роки.`
          : `Поточна ціна ${roundOne(value)} USD/t: сезонний діапазон поки недоступний через недостатню історію.`,
      summaryMonth: (change: number) =>
        `30-денний імпульс: ${formatSigned(change)}. AI читає це як структурний рух, якщо він підтверджений кількома точками.`,
      summarySeasonal: (move7: number | null, move30: number | null, years: number) =>
        move30 === null
          ? "Очікування сезонного руху на наступні 30 днів поки не показується через коротку опубліковану історію."
          : `За сезонністю ${years} попередніх років очікуваний рух: ${formatSigned(move7 ?? 0)} за 7 днів і ${formatSigned(move30)} за 30 днів.`,
      summarySeasonContext: (context: string) => context,
      summaryMediaHub: (highlight: string | undefined) =>
        highlight
          ? `Актуальний MediaHub-контекст: ${trimSentence(highlight)}`
          : "Актуальних повідомлень MediaHub за останні 2 дні немає.",
      summarySimilarYear: (
        year: number | null,
        move: number | null,
        confidence: number | null,
      ) =>
        year === null || move === null
          ? "AI ще не бачить достатньо близького історичного року для окремого сценарію."
          : `Найближча форма до поточного руху: ${year} (${Math.round(confidence ?? 0)}% схожості); її наступний 30-денний рух: ${formatSigned(move)}.`,
      title: "AI Market Read",
      volatility: "Volatility",
      volatilityBody:
        "Показник читає середню амплітуду коротких змін у вибраному вікні.",
    };
  }

  return {
    aiContext: "AI context",
    commodityLabel: "Commodity",
    commodityMode: "Commodity",
    confidenceHigh: "high confidence",
    confidenceLimited: "limited confidence",
    confidenceNormal: "normal confidence",
    contextBody: (mode: "commodity" | "spread") =>
      mode === "spread"
        ? "The spread is read as a signal between two market baskets."
        : "MediaHub context can explain movement, but does not change official values.",
    days: "days",
    chartWindow: "30 days + next 30 days",
    description:
      "AI Market Read explains current market context and index moves. This block is planned to become part of the paid analytics subscription.",
    indexMove: "Daily move",
    indexMoveBody: (change: number) =>
      Math.abs(change) < 0.05
        ? "The latest value does not show a meaningful daily impulse."
        : "The latest change gives a short signal for reading the current tone.",
    next7Days: "Next 7 days",
    next30Days: "Next 30 days",
    nextSeasonalMoveBody: (days: number, years: number) =>
      years > 0
        ? `Seasonal path for ${days} days across ${years} prior years.`
        : "History is insufficient for a seasonal path.",
    latestLabel: (value: number) => `${roundOne(value)} USD/t`,
    marketRegime: "Market regime",
    normalRange: "normal range",
    noSeasonalData: "n/a",
    periodMove: "Period move",
    periodMoveBody: (days: number) => `Change across the latest ${days} archive points.`,
    priceAnalysis: "Price Analysis",
    publishedLine: "published history",
    seasonalProjection: "seasonal path, next 30 days",
    recentWindow: "recent window",
    regimeCompression: "Spread compression",
    regimeCompressionBody:
      "The gap between positions is narrowing, which can signal a relative demand or logistics reset.",
    regimePressure: "Market pressure",
    regimePressureBody:
      "The AI read identifies signs of market pressure by comparing the current level and latest impulse with historical data.",
    regimeRebound: "Rebound / strength",
    regimeReboundBody:
      "The current move looks stronger than the average tone of the selected archive window.",
    regimeStable: "Stable range",
    regimeStableBody:
      "The current value remains close to the normal historical range for this window.",
    regimeVolatile: "High volatility",
    regimeVolatileBody:
      "Short-term changes are above the normal background, so the signal should be read carefully.",
    regimeWidening: "Spread widening",
    regimeWideningBody:
      "The gap between positions is widening, highlighting a change in relative strength.",
    spreadLabel: "Specific spread",
    spreadMode: "Spread",
    seasonalAverage: "Seasonality 3Y",
    seasonalAverageBody: (years: number) =>
      years > 0
        ? `Average next-30-day move across ${years} prior years.`
        : "More history is needed for a seasonal scenario.",
    similarYear: "Similar year",
    similarYearBody: (year: number | null) =>
      year === null
        ? "A comparable seasonal year is not available yet."
        : `Closest seasonal shape right now: ${year}.`,
    similarity: "Similarity",
    summaryCurrent: (value: number, range: { lower: number; upper: number } | null) =>
      range
        ? `Current price ${roundOne(value)} USD/t is ${describeSeasonalPosition(value, range, "en")} the ${roundOne(range.lower)}-${roundOne(range.upper)} USD/t seasonal range across the prior three years.`
        : `Current price ${roundOne(value)} USD/t: the seasonal range is unavailable because history is insufficient.`,
    summaryMonth: (change: number) =>
      `30-day impulse: ${formatSigned(change)}. The AI read treats it as structural only when confirmed by several points.`,
    summarySeasonal: (move7: number | null, move30: number | null, years: number) =>
      move30 === null
        ? "The expected next-30-day seasonal move is not shown yet because the published history is still short."
        : `Across ${years} prior seasonal years, the expected move is ${formatSigned(move7 ?? 0)} in 7 days and ${formatSigned(move30)} in 30 days.`,
    summarySeasonContext: (context: string) => context,
    summaryMediaHub: (highlight: string | undefined) =>
      highlight
        ? `Current MediaHub context: ${trimSentence(highlight)}`
        : "There are no current MediaHub updates from the last two days.",
    summarySimilarYear: (
      year: number | null,
      move: number | null,
      confidence: number | null,
    ) =>
      year === null || move === null
        ? "The AI read does not yet find a close enough historical year for a separate scenario."
        : `Closest current seasonal shape: ${year} (${Math.round(confidence ?? 0)}% similarity); its next-30-day move was ${formatSigned(move)}.`,
    title: "AI Market Read",
    volatility: "Volatility",
    volatilityBody:
      "This reads the average amplitude of short moves in the selected window.",
  };
}
