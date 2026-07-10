"use client";

import { useMemo, useState, type PointerEvent } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";
import { getDeliveryBasisConfigForCommodityId } from "@/lib/tenant-basis";

type AnalyticsTrendPoint = {
  date: string;
  commodityId: CommodityId;
  value: number;
};

type AnalyticsTrendChartProps = {
  commodities: Commodity[];
  history: AnalyticsTrendPoint[];
  locale: Locale;
};

const chartColors = [
  "var(--color-green)",
  "var(--color-ink)",
  "#6b8f1a",
  "#2f7f68",
  "#a3d600",
  "#7c6cff",
];

const CHART_WINDOW_DAYS = 180;

export function AnalyticsTrendChart({
  commodities,
  history,
  locale,
}: AnalyticsTrendChartProps) {
  const [selectedIds, setSelectedIds] = useState<CommodityId[]>(
    commodities.map((commodity) => commodity.id),
  );
  const [hoverPoint, setHoverPoint] = useState<TrendHoverPoint | null>(null);
  const [legendExpanded, setLegendExpanded] = useState(false);

  const series = useMemo(() => {
    return commodities
      .filter((commodity) => selectedIds.includes(commodity.id))
      .map((commodity) => {
        const fullHistory = history.filter((point) => point.commodityId === commodity.id);
        const points = fullHistory.slice(-CHART_WINDOW_DAYS);
        const colorIndex = commodities.findIndex((item) => item.id === commodity.id);

        return {
          color: chartColors[Math.max(colorIndex, 0) % chartColors.length],
          commodity,
          points,
        };
      });
  }, [commodities, history, selectedIds]);

  const visibleValues = series.flatMap((item) => item.points.map((point) => point.value));
  const minValue = Math.min(...visibleValues);
  const maxValue = Math.max(...visibleValues);
  const paddedRange = getPaddedRange(minValue, maxValue);
  const hasVisibleSeries = series.some((item) => item.points.length > 0);
  const legendLimit = 4;
  const visibleLegendItems =
    legendExpanded || commodities.length <= legendLimit
      ? commodities
      : commodities.slice(0, legendLimit);
  const hiddenLegendCount = Math.max(commodities.length - visibleLegendItems.length, 0);

  function toggleCommodity(commodityId: CommodityId) {
    setSelectedIds((current) => {
      if (current.includes(commodityId)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== commodityId);
      }

      return [...current, commodityId];
    });
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!hasVisibleSeries) {
      setHoverPoint(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    const nearest = findHoverSlice({
      max: paddedRange.max,
      min: paddedRange.min,
      pointerX,
      pointerY,
      series,
    });

    setHoverPoint(nearest);
  }

  return (
    <div>
      <div className="relative">
        <svg
          aria-label={locale === "uk" ? "Динаміка індексу" : "Index dynamics"}
          className="h-72 w-full touch-none overflow-visible"
          onPointerLeave={() => setHoverPoint(null)}
          onPointerMove={handlePointerMove}
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <TrendGridLines />
          {series.map((item) => (
            <polyline
              fill="none"
              key={item.commodity.id}
              points={toChartPoints(
                item.points.map((point) => point.value),
                paddedRange.min,
                paddedRange.max,
              )}
              stroke={item.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={series.length === 1 ? "3.2" : "2.6"}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hoverPoint ? (
            <g className="pointer-events-none">
              <line
                stroke="rgba(255,255,255,0.28)"
                strokeDasharray="3 3"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                x1={hoverPoint.x}
                x2={hoverPoint.x}
                y1="14"
                y2="88"
              />
              {hoverPoint.entries.map((entry) => (
                <circle
                  cx={entry.x}
                  cy={entry.y}
                  fill={entry.color}
                  key={entry.commodity.id}
                  r="1.55"
                  stroke="#f7f7ef"
                  strokeWidth="0.65"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </g>
          ) : null}
        </svg>
        <div className="pointer-events-none absolute right-0 top-1 text-right text-[0.65rem] font-black uppercase leading-4 text-white/58">
          <p>{paddedRange.max.toFixed(0)} USD/t</p>
          <p className="mt-[13.9rem]">{paddedRange.min.toFixed(0)} USD/t</p>
        </div>
      </div>
      {hoverPoint ? (
        <div className="mt-2 rounded-lg border border-uga-green/40 bg-[#07120b] p-2 shadow-sm shadow-black/30">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-uga-green">
            {formatHoverDate(hoverPoint.date, locale)}
          </p>
          <div className="mt-1.5 grid gap-1">
            {hoverPoint.entries.map((entry) => (
              <div
                className="grid grid-cols-[0.55rem_minmax(8rem,1fr)_7rem] items-center gap-1.5 text-[0.58rem] font-black uppercase leading-tight"
                key={entry.commodity.id}
              >
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/35"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="max-w-36 truncate text-white/74">
                  {getCommodityLegendLabel(entry.commodity, locale)}
                </span>
                <span className="text-left tabular-nums text-white">
                  {entry.value.toFixed(0)} USD/t
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {visibleLegendItems.map((commodity) => {
            const active = selectedIds.includes(commodity.id);
            const colorIndex = commodities.findIndex((item) => item.id === commodity.id);

            return (
              <button
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.03em] transition ${
                  active
                    ? "border-white/18 bg-[#07120b] text-white shadow-[inset_0_0_0_1px_rgba(57,255,20,0.14)]"
                    : "border-white/10 bg-transparent text-white/32 grayscale hover:border-white/25 hover:text-white/58"
                }`}
                key={commodity.id}
                onClick={() => toggleCommodity(commodity.id)}
                title={getCommodityLegendLabel(commodity, locale)}
                type="button"
              >
                <span
                  className={
                    active
                      ? "h-2.5 w-2.5 rounded-[0.2rem] border border-white/35"
                      : "h-2.5 w-2.5 rounded-[0.2rem] border border-white/20 bg-white/25"
                  }
                  style={
                    active
                      ? { backgroundColor: chartColors[colorIndex % chartColors.length] }
                      : undefined
                  }
                />
                <span className="max-w-36 truncate">
                  {getCommodityLegendLabel(commodity, locale)}
                </span>
              </button>
            );
          })}
          {hiddenLegendCount > 0 || legendExpanded ? (
            <button
              className="inline-flex items-center rounded-full border border-black/20 px-2.5 py-1 text-[0.64rem] font-black uppercase text-black/50 transition hover:border-black/45 hover:text-black"
              onClick={() => setLegendExpanded((current) => !current)}
              type="button"
            >
              {legendExpanded
                ? locale === "uk"
                  ? "менше"
                  : "less"
                : locale === "uk"
                  ? `+${hiddenLegendCount} ще`
                  : `+${hiddenLegendCount} more`}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getCommodityLegendLabel(commodity: Commodity, locale: Locale) {
  const name = commodity.shortName?.[locale] ?? commodity.name[locale];
  const basis = getDeliveryBasisConfigForCommodityId(commodity.id).name;
  return `${name} · ${basis}`;
}

type TrendSeries = {
  color: string;
  commodity: Commodity;
  points: AnalyticsTrendPoint[];
};

type TrendHoverPoint = {
  date: string;
  entries: TrendHoverEntry[];
  x: number;
  y: number;
};

type TrendHoverEntry = {
  color: string;
  commodity: Commodity;
  date: string;
  value: number;
  x: number;
  y: number;
};

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.12, 2);

  return {
    max: max + padding,
    min: min - padding,
  };
}

function toChartPoints(values: number[], min: number, max: number) {
  return values
    .map((value, index) => {
      const { x, y } = getChartCoordinate({
        index,
        length: values.length,
        max,
        min,
        value,
      });
      return `${x},${y}`;
    })
    .join(" ");
}

function findHoverSlice({
  max,
  min,
  pointerX,
  pointerY,
  series,
}: {
  max: number;
  min: number;
  pointerX: number;
  pointerY: number;
  series: TrendSeries[];
}): TrendHoverPoint | null {
  const referenceSeries = [...series]
    .filter((item) => item.points.length > 0)
    .sort((a, b) => b.points.length - a.points.length)[0];

  if (!referenceSeries) {
    return null;
  }

  const referenceIndex =
    referenceSeries.points.length <= 1
      ? 0
      : Math.round(
          (Math.min(Math.max(pointerX, 0), 100) / 100) *
            (referenceSeries.points.length - 1),
        );
  const referencePoint = referenceSeries.points[referenceIndex];

  if (!referencePoint) {
    return null;
  }

  const referenceCoordinate = getChartCoordinate({
    index: referenceIndex,
    length: referenceSeries.points.length,
    max,
    min,
    value: referencePoint.value,
  });
  const entries = series.flatMap((item) => {
    const pointIndex = item.points.findIndex((point) => point.date === referencePoint.date);
    const index =
      pointIndex >= 0 ? pointIndex : getNearestDateIndex(item.points, referencePoint.date);
    const point = item.points[index];

    if (!point) {
      return [];
    }

    const coordinate = getChartCoordinate({
      index,
      length: item.points.length,
      max,
      min,
      value: point.value,
    });

    return [
      {
        color: item.color,
        commodity: item.commodity,
        date: point.date,
        value: point.value,
        x: coordinate.x,
        y: coordinate.y,
      },
    ];
  });

  if (entries.length === 0) {
    return null;
  }

  const anchor = entries.reduce((closest, entry) => {
    const closestDistance = Math.abs(closest.y - pointerY);
    const entryDistance = Math.abs(entry.y - pointerY);
    return entryDistance < closestDistance ? entry : closest;
  }, entries[0]);

  return {
    date: referencePoint.date,
    entries: entries.sort((a, b) => b.value - a.value),
    x: referenceCoordinate.x,
    y: anchor.y,
  };
}

function getNearestDateIndex(points: AnalyticsTrendPoint[], date: string) {
  const target = new Date(`${date}T00:00:00Z`).getTime();
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;

  points.forEach((point, index) => {
    const currentDistance = Math.abs(new Date(`${point.date}T00:00:00Z`).getTime() - target);

    if (currentDistance < distance) {
      nearest = index;
      distance = currentDistance;
    }
  });

  return nearest;
}

function getChartCoordinate({
  index,
  length,
  max,
  min,
  value,
}: {
  index: number;
  length: number;
  max: number;
  min: number;
  value: number;
}) {
  const range = Math.max(max - min, 1);

  return {
    x: length === 1 ? 0 : (index / (length - 1)) * 100,
    y: 82 - ((value - min) / range) * 64,
  };
}

function formatHoverDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

function TrendGridLines() {
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
