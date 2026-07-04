"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";

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

const periods = [30, 60, 90, 180] as const;
const HISTORY_END_X = 82;
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
}: ScenarioModelPanelProps) {
  const [mode, setMode] = useState<"commodity" | "spread">("commodity");
  const [commodityId, setCommodityId] = useState<CommodityId>(
    commodities[0]?.id ?? "corn",
  );
  const [spreadId, setSpreadId] = useState(spreadDefinitions[0].id);
  const [period, setPeriod] = useState<(typeof periods)[number]>(90);
  const text = getCopy(locale);

  const series = useMemo(() => {
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
  }, [commodityId, history, mode, spreadId]);

  const sample = useMemo(
    () => series.slice(-Math.min(period, series.length)),
    [period, series],
  );
  const read = useMemo(
    () => buildMarketRead(series, sample, text, mode),
    [mode, sample, series, text],
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
        ])
      : [0, read.normalLower, read.normalUpper];
  const range = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
  const title =
    mode === "commodity"
      ? commodities.find((commodity) => commodity.id === commodityId)?.name[locale]
      : spreadDefinitions.find((spread) => spread.id === spreadId)?.label[locale];

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.4rem] border border-black bg-white p-4 shadow-[0_28px_80px_rgba(0,0,0,0.12)]">
      <div className="border-b border-black pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase leading-6 text-black">
              {text.title}
            </h2>
            <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-black/55">
              {text.description}
            </p>
          </div>
          <span className="rounded-full border border-black bg-uga-green px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] !text-[#050505]">
            {read.confidence}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[auto_1fr_1fr_auto] lg:items-end">
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

        <div className="flex flex-wrap gap-1.5 lg:justify-end">
          {periods.map((item) => (
            <button
              className={`rounded-full border px-2.5 py-2 text-[0.68rem] font-black uppercase transition ${
                period === item
                  ? "border-black bg-uga-dark text-white"
                  : "border-black/25 bg-white text-black/50 hover:border-black hover:text-black"
              }`}
              key={item}
              onClick={() => setPeriod(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1rem] border border-black bg-uga-mist p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">
            {text.marketRegime}
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase leading-tight text-black">
            {read.regime}
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
            <span>
              {period} {text.days}
            </span>
          </div>
          <svg
            aria-label={text.title}
            className="h-64 w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <GridLines />
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
                  latest={sample.at(-1)?.value ?? 0}
                  range={range}
                  seasonality={read.seasonality}
                />
              </>
            ) : null}
          </svg>
          <div className="mt-3 flex flex-wrap gap-3 text-[0.68rem] font-black uppercase text-white/62">
            <span>{text.publishedLine}</span>
            <span>{text.normalRange}</span>
            <span>{text.recentWindow}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {read.drivers.map((driver) => (
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
  mode: "commodity" | "spread",
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
  const seasonality = buildSeasonalityRead(series);
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
        body: text.seasonalAverageBody(seasonality.lookbackYears),
        label: text.seasonalAverage,
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
      {
        body: text.similarYearBody(seasonality.bestYear),
        label: text.similarYear,
        tone:
          (seasonality.bestMove ?? 0) > 0
            ? "green"
            : (seasonality.bestMove ?? 0) < 0
              ? "amber"
              : "blue",
        value:
          seasonality.bestMove === null
            ? text.noSeasonalData
            : formatSigned(seasonality.bestMove),
      },
      {
        body: text.contextBody(mode),
        label: text.similarity,
        tone: "blue",
        value:
          seasonality.confidence === null
            ? text.noSeasonalData
            : `${Math.round(seasonality.confidence)}%`,
      },
    ] satisfies MarketDriver[],
    latestLabel: text.latestLabel(latest),
    normalLower,
    normalUpper,
    regime: regime.title,
    seasonality,
    summary: [
      text.summaryCurrent(latest),
      text.summarySeasonal(seasonality.averageMove, seasonality.lookbackYears),
      text.summarySimilarYear(
        seasonality.bestYear,
        seasonality.bestMove,
        seasonality.confidence,
      ),
      regime.body,
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
  latest,
  range,
  seasonality,
}: {
  latest: number;
  range: { max: number; min: number };
  seasonality: SeasonalityRead;
}) {
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

function GridLines() {
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
    </>
  );
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
      description:
        "Публічний preview читає архів індексів, короткий імпульс, volatility та спреди. Це пояснення опублікованих даних, не прогноз.",
      indexMove: "Денний рух",
      indexMoveBody: (change: number) =>
        Math.abs(change) < 0.05
          ? "Останнє значення не показує суттєвого денного імпульсу."
          : "Остання зміна дає короткий сигнал для читання поточного тону.",
      latestLabel: (value: number) => `${roundOne(value)} USD/t`,
      marketRegime: "Режим ринку",
      normalRange: "нормальний діапазон",
      noSeasonalData: "н/д",
      periodMove: "Рух періоду",
      periodMoveBody: (days: number) => `Зміна за останні ${days} точок архіву.`,
      publishedLine: "опублікована історія",
      recentWindow: "останні точки",
      regimeCompression: "Spread compression",
      regimeCompressionBody:
        "Різниця між позиціями стискається, що може означати вирівнювання попиту або логістичного тиску.",
      regimePressure: "Market pressure",
      regimePressureBody:
        "AI-read бачить тиск у поточному рівні або останньому імпульсі відносно архіву.",
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
      summaryCurrent: (value: number) =>
        `Поточна ціна ${roundOne(value)} USD/t знаходиться біля нижньої межі історичного діапазону цін (3 роки).`,
      summaryMonth: (change: number) =>
        `30-денний імпульс: ${formatSigned(change)}. AI читає це як структурний рух, якщо він підтверджений кількома точками.`,
      summarySeasonal: (move: number | null, years: number) =>
        move === null
          ? "Сезонний сценарій поки не рахується: у verified archive недостатньо зіставних майбутніх точок."
          : `За сезонністю ${years} попередніх років наступні 30 днів давали середній рух ${formatSigned(move)}.`,
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
    description:
      "Public preview reads index history, short momentum, volatility and spreads. It explains published data; it is not a forecast.",
    indexMove: "Daily move",
    indexMoveBody: (change: number) =>
      Math.abs(change) < 0.05
        ? "The latest value does not show a meaningful daily impulse."
        : "The latest change gives a short signal for reading the current tone.",
    latestLabel: (value: number) => `${roundOne(value)} USD/t`,
    marketRegime: "Market regime",
    normalRange: "normal range",
    noSeasonalData: "n/a",
    periodMove: "Period move",
    periodMoveBody: (days: number) => `Change across the latest ${days} archive points.`,
    publishedLine: "published history",
    recentWindow: "recent window",
    regimeCompression: "Spread compression",
    regimeCompressionBody:
      "The gap between positions is narrowing, which can signal a relative demand or logistics reset.",
    regimePressure: "Market pressure",
    regimePressureBody:
      "The AI read sees pressure in the current level or recent impulse relative to the archive.",
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
    summaryCurrent: (value: number) =>
      `Current price ${roundOne(value)} USD/t is near the lower boundary of the historical price range (3 years).`,
    summaryMonth: (change: number) =>
      `30-day impulse: ${formatSigned(change)}. The AI read treats it as structural only when confirmed by several points.`,
    summarySeasonal: (move: number | null, years: number) =>
      move === null
        ? "The seasonal scenario is not calculated yet: the verified archive lacks comparable forward points."
        : `Across ${years} prior seasonal years, the next 30 days averaged ${formatSigned(move)}.`,
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
