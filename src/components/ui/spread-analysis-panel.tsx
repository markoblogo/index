"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { CommodityId } from "@/lib/mock-data";

type SpreadPointSource = {
  commodityId: CommodityId;
  date: string;
  value: number;
};

type SpreadAnalysisPanelProps = {
  history: SpreadPointSource[];
  locale: Locale;
};

type SpreadDefinition = {
  id: string;
  a: CommodityId;
  b: CommodityId;
  label: Record<Locale, string>;
};

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

const SPREAD_WINDOW_DAYS = 180;
const MAX_ISOLATED_SPREAD_JUMP = 30;
const MAX_ABSOLUTE_SPREAD = 250;

export function SpreadAnalysisPanel({
  history,
  locale,
}: SpreadAnalysisPanelProps) {
  const [spreadId, setSpreadId] = useState(spreadDefinitions[0].id);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  const spreadSeries = useMemo(() => buildSpreadSeries(history), [history]);
  const activeSpread =
    spreadDefinitions.find((spread) => spread.id === spreadId) ?? spreadDefinitions[0];
  const activeSeries = spreadSeries[activeSpread.id] ?? [];
  const chartSeries = activeSeries.slice(-SPREAD_WINDOW_DAYS);
  const rangeSeries = chartSeries;
  const currentPoint = chartSeries.at(-1) ?? activeSeries.at(-1);
  const rangeValues = rangeSeries.map((point) => point.value);
  const rangeMin = rangeValues.length ? Math.min(...rangeValues) : 0;
  const rangeMax = rangeValues.length ? Math.max(...rangeValues) : 0;
  const markerPosition =
    !currentPoint || rangeMax === rangeMin
      ? 50
      : ((currentPoint.value - rangeMin) / (rangeMax - rangeMin)) * 100;
  const chartValues = chartSeries.map((point) => point.value);
  const chartRange = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
  const hoveredPoint =
    hoveredChartIndex === null ? null : chartSeries[hoveredChartIndex] ?? null;
  const hoveredPosition =
    hoveredPoint && hoveredChartIndex !== null
      ? getChartPointPosition(
          hoveredPoint.value,
          hoveredChartIndex,
          chartSeries.length,
          chartRange.min,
          chartRange.max,
        )
      : null;
  const text = getCopy(locale);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="border border-black bg-white p-4">
          <div className="border-b border-black pb-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {text.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-black uppercase leading-6 text-black">
              {text.chartTitle}
            </h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
              {text.chartDescription}
            </p>
          </div>

          <div className="mt-4">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
              {text.spreadLabel}
              <select
                className="w-full rounded-[3px] border border-black bg-white px-3 py-2 text-sm font-semibold text-black"
                onChange={(event) => setSpreadId(event.target.value)}
                value={activeSpread.id}
              >
                {spreadDefinitions.map((spread) => (
                  <option key={spread.id} value={spread.id}>
                    {spread.label[locale]}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <div
            className="relative mt-5 h-72 w-full touch-none"
            onPointerLeave={() => setHoveredChartIndex(null)}
            onPointerMove={(event) => {
              if (chartSeries.length === 0) {
                return;
              }

              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = Math.min(
                Math.max((event.clientX - bounds.left) / bounds.width, 0),
                1,
              );
              setHoveredChartIndex(Math.round(ratio * (chartSeries.length - 1)));
            }}
          >
            <svg
              aria-label={text.chartTitle}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <GridLines />
              <polyline
                fill="none"
                points={toChartPoints(
                  chartSeries.map((point) => point.value),
                  chartRange.min,
                  chartRange.max,
                )}
                stroke="var(--color-green)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {hoveredPoint && hoveredPosition ? (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2 bg-uga-green shadow-[0_0_16px_rgba(57,255,20,0.7)]"
                  style={{ left: `${hoveredPosition.x}%` }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_0_12px_rgba(57,255,20,0.55)]"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.98) 0 10%, var(--color-green) 34%, var(--color-green) 58%, rgba(0,0,0,0.42) 100%)",
                    left: `${hoveredPosition.x}%`,
                    top: `${hoveredPosition.y}%`,
                  }}
                />
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-full border px-2.5 py-1 text-center text-[0.68rem] font-black leading-none shadow-lg"
                  style={{
                    backgroundColor: "#f8f8f2",
                    borderColor: "var(--color-green)",
                    boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45)",
                    color: "#07100c",
                    left: `${Math.min(Math.max(hoveredPosition.x, 10), 90)}%`,
                    top: `${Math.min(Math.max(hoveredPosition.y - 4, 12), 88)}%`,
                  }}
                >
                  <span className="block whitespace-nowrap">{formatSigned(hoveredPoint.value)} USD/t</span>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-black uppercase text-black/50">
            <span>{formatDate(chartSeries[0]?.date, locale)}</span>
            <span>{formatDate(chartSeries.at(-1)?.date, locale)}</span>
          </div>
        </article>

        <article className="border border-black bg-white p-4">
          <div className="border-b border-black pb-3">
            <h2 className="text-xl font-black uppercase leading-6 text-black">
              {text.rangeTitle}
            </h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-black/55">
              {text.rangeDescription}
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="border border-black bg-uga-mist p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-black/45">
                {activeSpread.label[locale]}
              </p>
              <p className="mt-2 text-3xl font-black text-uga-green">
                {currentPoint ? `${formatSigned(currentPoint.value)} USD/t` : "—"}
              </p>
              <p className="mt-1 text-xs font-semibold text-black/50">
                {currentPoint ? formatDate(currentPoint.date, locale) : "—"}
              </p>
              <div className="relative mt-5 h-3 border border-black bg-white">
                <div
                  className="absolute -top-2 h-7 w-0.5 bg-uga-green"
                  style={{ left: `${Math.min(Math.max(markerPosition, 0), 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs font-black text-black/55">
                <span>{rangeMin.toFixed(1)}</span>
                <span>{rangeMax.toFixed(1)} USD/t</span>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-black/55">
                {text.rangeNote}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function buildSpreadSeries(history: SpreadPointSource[]) {
  const byDate = new Map<string, Map<CommodityId, number>>();

  for (const point of history) {
    const values = byDate.get(point.date) ?? new Map<CommodityId, number>();
    values.set(point.commodityId, point.value);
    byDate.set(point.date, values);
  }

  const result: Record<string, Array<{ date: string; value: number }>> = {};
  const sortedEntries = Array.from(byDate.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const spread of spreadDefinitions) {
    let latestFirst: number | undefined;
    let latestSecond: number | undefined;

    result[spread.id] = normalizeSpreadSeries(sortedEntries.flatMap(([date, values]) => {
      latestFirst = values.get(spread.a) ?? latestFirst;
      latestSecond = values.get(spread.b) ?? latestSecond;

      if (latestFirst === undefined || latestSecond === undefined) {
        return [];
      }

      return [{
        date,
        value: roundOne(latestFirst - latestSecond),
      }];
    }));
  }

  return result;
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

    if (isAbsoluteOutlier || isIsolatedJump) {
      return {
        ...point,
        value: previous.value,
      };
    }

    return point;
  });
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      chartDescription:
        "Динаміка вибраного спреду за останні 180 опублікованих днів.",
      chartTitle: "Динаміка спреду",
      eyebrow: "Спреди",
      rangeDescription:
        "Поточне значення спреду всередині min/max за останні 180 опублікованих днів.",
      rangeNote: "Маркер показує, де поточне значення знаходиться всередині 180-денного діапазону.",
      rangeTitle: "Поточна позиція в діапазоні",
      spreadLabel: "Спред",
    };
  }

  return {
    chartDescription:
      "Selected spread dynamics over the last 180 published days.",
    chartTitle: "Spread dynamics",
    eyebrow: "Spreads",
    rangeDescription:
      "Current spread value inside the min/max across the last 180 published days.",
    rangeNote: "The marker shows where the current value sits inside the 180-day range.",
    rangeTitle: "Current range position",
    spreadLabel: "Spread",
  };
}

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.12, 1);

  return {
    max: max + padding,
    min: min - padding,
  };
}

function toChartPoints(values: number[], min: number, max: number) {
  return values
    .map((value, index) => {
      const { x, y } = getChartPointPosition(
        value,
        index,
        values.length,
        min,
        max,
      );
      return `${x},${y}`;
    })
    .join(" ");
}

function getChartPointPosition(
  value: number,
  index: number,
  length: number,
  min: number,
  max: number,
) {
  const range = Math.max(max - min, 1);

  return {
    x: length === 1 ? 0 : (index / (length - 1)) * 100,
    y: 82 - ((value - min) / range) * 64,
  };
}

function GridLines() {
  return (
    <>
      {[18, 34, 50, 66, 82].map((y) => (
        <line
          key={y}
          stroke="rgba(0,0,0,0.1)"
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

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatDate(date: string | undefined, locale: Locale) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatCompactDate(date: string | undefined) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
