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

const chartPeriods = [
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "90", value: 90 },
  { label: "180", value: 180 },
  { label: "All period", value: "all" },
] as const;

const rangePeriods = [30, 90, 180, 360] as const;

export function SpreadAnalysisPanel({
  history,
  locale,
}: SpreadAnalysisPanelProps) {
  const [spreadId, setSpreadId] = useState(spreadDefinitions[0].id);
  const [chartPeriod, setChartPeriod] =
    useState<(typeof chartPeriods)[number]["value"]>(90);
  const [rangePeriod, setRangePeriod] = useState<(typeof rangePeriods)[number]>(90);

  const spreadSeries = useMemo(() => buildSpreadSeries(history), [history]);
  const activeSpread =
    spreadDefinitions.find((spread) => spread.id === spreadId) ?? spreadDefinitions[0];
  const activeSeries = spreadSeries[activeSpread.id] ?? [];
  const latestDate = activeSeries.at(-1)?.date ?? "";
  const [selectedDate, setSelectedDate] = useState(latestDate);
  const effectiveDate = activeSeries.some((point) => point.date === selectedDate)
    ? selectedDate
    : latestDate;
  const selectedIndex = Math.max(
    activeSeries.findIndex((point) => point.date === effectiveDate),
    0,
  );
  const chartSeries =
    chartPeriod === "all"
      ? activeSeries.slice(0, selectedIndex + 1)
      : activeSeries.slice(Math.max(selectedIndex - chartPeriod + 1, 0), selectedIndex + 1);
  const rangeSeries = activeSeries.slice(
    Math.max(selectedIndex - rangePeriod + 1, 0),
    selectedIndex + 1,
  );
  const currentPoint = activeSeries[selectedIndex] ?? activeSeries.at(-1);
  const rangeMin = Math.min(...rangeSeries.map((point) => point.value));
  const rangeMax = Math.max(...rangeSeries.map((point) => point.value));
  const markerPosition =
    rangeMax === rangeMin
      ? 50
      : ((currentPoint.value - rangeMin) / (rangeMax - rangeMin)) * 100;
  const chartValues = chartSeries.map((point) => point.value);
  const chartRange = getPaddedRange(Math.min(...chartValues), Math.max(...chartValues));
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

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
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

            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {chartPeriods.map((option) => (
                <PeriodButton
                  active={chartPeriod === option.value}
                  key={option.label}
                  label={option.label}
                  onClick={() => setChartPeriod(option.value)}
                />
              ))}
            </div>
          </div>

          <svg
            aria-label={text.chartTitle}
            className="mt-5 h-72 w-full overflow-visible"
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
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.1em] text-black/55">
              {text.dateLabel}
              <input
                className="rounded-[3px] border border-black bg-white px-3 py-2 text-sm font-semibold text-black"
                max={latestDate}
                min={activeSeries[0]?.date}
                onChange={(event) => setSelectedDate(event.target.value)}
                type="date"
                value={effectiveDate}
              />
            </label>

            <div className="flex flex-wrap gap-1.5">
              {rangePeriods.map((option) => (
                <PeriodButton
                  active={rangePeriod === option}
                  key={option}
                  label={String(option)}
                  onClick={() => setRangePeriod(option)}
                />
              ))}
            </div>

            <div className="border border-black bg-uga-mist p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-black/45">
                {activeSpread.label[locale]}
              </p>
              <p className="mt-2 text-3xl font-black text-uga-green">
                {formatSigned(currentPoint.value)} USD/t
              </p>
              <p className="mt-1 text-xs font-semibold text-black/50">
                {formatDate(currentPoint.date, locale)}
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

  for (const spread of spreadDefinitions) {
    result[spread.id] = Array.from(byDate.entries())
      .map(([date, values]) => ({
        date,
        value: roundOne((values.get(spread.a) ?? 0) - (values.get(spread.b) ?? 0)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return result;
}

function PeriodButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`border px-2.5 py-1.5 text-[0.68rem] font-black uppercase transition ${
        active
          ? "border-black bg-uga-dark text-white"
          : "border-black/25 bg-white text-black/50 hover:border-black hover:text-black"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function getCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      chartDescription:
        "Оберіть конкретний спред і період, щоб побачити його історичну динаміку.",
      chartTitle: "Динаміка спреду",
      dateLabel: "Дата значення",
      eyebrow: "Спреди",
      rangeDescription:
        "Оберіть період діапазону та дату, щоб побачити позицію спреду всередині історичного min/max.",
      rangeNote: "Маркер показує, де вибране значення знаходиться всередині діапазону.",
      rangeTitle: "Позиція в діапазоні",
      spreadLabel: "Спред",
    };
  }

  return {
    chartDescription:
      "Select a specific spread and period to review its historical movement.",
    chartTitle: "Spread dynamics",
    dateLabel: "Value date",
    eyebrow: "Spreads",
    rangeDescription:
      "Select the range period and date to see where the spread sits inside historical min/max.",
    rangeNote: "The marker shows where the selected value sits inside the range.",
    rangeTitle: "Range position",
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
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");
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
