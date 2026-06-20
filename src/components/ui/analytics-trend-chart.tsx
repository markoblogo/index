"use client";

import { useMemo, useState, type PointerEvent } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";

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

const periodOptions = [
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "90", value: 90 },
  { label: "180", value: 180 },
  { label: "All period", value: "all" },
] as const;

export function AnalyticsTrendChart({
  commodities,
  history,
  locale,
}: AnalyticsTrendChartProps) {
  const [selectedIds, setSelectedIds] = useState<CommodityId[]>(
    commodities.map((commodity) => commodity.id),
  );
  const [period, setPeriod] = useState<(typeof periodOptions)[number]["value"]>(30);
  const [hoverPoint, setHoverPoint] = useState<TrendHoverPoint | null>(null);

  const series = useMemo(() => {
    return commodities
      .filter((commodity) => selectedIds.includes(commodity.id))
      .map((commodity) => {
        const fullHistory = history.filter((point) => point.commodityId === commodity.id);
        const points = period === "all" ? fullHistory : fullHistory.slice(-period);
        const colorIndex = commodities.findIndex((item) => item.id === commodity.id);

        return {
          color: chartColors[Math.max(colorIndex, 0) % chartColors.length],
          commodity,
          points,
        };
      });
  }, [commodities, history, period, selectedIds]);

  const visibleValues = series.flatMap((item) => item.points.map((point) => point.value));
  const minValue = Math.min(...visibleValues);
  const maxValue = Math.max(...visibleValues);
  const paddedRange = getPaddedRange(minValue, maxValue);
  const hasVisibleSeries = series.some((item) => item.points.length > 0);

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
    const nearest = findNearestPoint({
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
                stroke="rgba(0,0,0,0.55)"
                strokeDasharray="3 3"
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                x1={hoverPoint.x}
                x2={hoverPoint.x}
                y1="14"
                y2="88"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                fill={hoverPoint.color}
                r="1.7"
                stroke="#050505"
                strokeWidth="0.7"
                vectorEffect="non-scaling-stroke"
              />
              <text
                fill="#050505"
                fontSize="4"
                fontWeight="900"
                textAnchor={hoverPoint.x > 72 ? "end" : "start"}
                x={hoverPoint.x > 72 ? hoverPoint.x - 2 : hoverPoint.x + 2}
                y={Math.max(10, hoverPoint.y - 4)}
              >
                {hoverPoint.value.toFixed(0)} USD/t
              </text>
              <text
                fill="rgba(0,0,0,0.58)"
                fontSize="3.3"
                fontWeight="900"
                textAnchor="middle"
                x={hoverPoint.x}
                y="98"
              >
                {formatHoverDate(hoverPoint.date, locale)}
              </text>
            </g>
          ) : null}
        </svg>
        <div className="pointer-events-none absolute right-0 top-1 text-right text-[0.65rem] font-black uppercase leading-4 text-black/40">
          <p>{paddedRange.max.toFixed(0)} USD/t</p>
          <p className="mt-[13.9rem]">{paddedRange.min.toFixed(0)} USD/t</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {commodities.map((commodity, index) => {
            const active = selectedIds.includes(commodity.id);

            return (
              <button
                aria-pressed={active}
                className={`inline-flex items-center gap-2 border px-2.5 py-1.5 text-xs font-black uppercase transition ${
                  active
                    ? "border-black bg-white text-black"
                    : "border-black/15 bg-transparent text-black/35 grayscale hover:border-black/35 hover:text-black/55"
                }`}
                key={commodity.id}
                onClick={() => toggleCommodity(commodity.id)}
                type="button"
              >
                <span
                  className={
                    active
                      ? "h-2.5 w-2.5 border border-black"
                      : "h-2.5 w-2.5 border border-black/20 bg-[#d7d7d7]"
                  }
                  style={
                    active
                      ? { backgroundColor: chartColors[index % chartColors.length] }
                      : undefined
                  }
                />
                {commodity.name[locale]}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-start gap-1.5 lg:justify-end">
          {periodOptions.map((option) => {
            const active = period === option.value;

            return (
              <button
                className={`border px-2.5 py-1.5 text-[0.68rem] font-black uppercase transition ${
                  active
                    ? "border-black bg-uga-dark text-white"
                    : "border-black/25 bg-white text-black/50 hover:border-black hover:text-black"
                }`}
                key={option.label}
                onClick={() => setPeriod(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TrendSeries = {
  color: string;
  commodity: Commodity;
  points: AnalyticsTrendPoint[];
};

type TrendHoverPoint = {
  color: string;
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

function findNearestPoint({
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
  let nearest: (TrendHoverPoint & { distance: number }) | null = null;

  for (const item of series) {
    const candidateIndexes = getCandidateIndexes(pointerX, item.points.length);

    for (const index of candidateIndexes) {
      const point = item.points[index];

      if (!point) {
        continue;
      }

      const coordinate = getChartCoordinate({
        index,
        length: item.points.length,
        max,
        min,
        value: point.value,
      });
      const distance =
        Math.abs(coordinate.x - pointerX) * 0.45 +
        Math.abs(coordinate.y - pointerY);

      if (!nearest || distance < nearest.distance) {
        nearest = {
          color: item.color,
          date: point.date,
          distance,
          value: point.value,
          x: coordinate.x,
          y: coordinate.y,
        };
      }
    }
  }

  if (!nearest) {
    return null;
  }

  return {
    color: nearest.color,
    date: nearest.date,
    value: nearest.value,
    x: nearest.x,
    y: nearest.y,
  };
}

function getCandidateIndexes(pointerX: number, length: number) {
  if (length <= 1) {
    return [0];
  }

  const centerIndex = Math.round(
    (Math.min(Math.max(pointerX, 0), 100) / 100) * (length - 1),
  );
  return [centerIndex - 1, centerIndex, centerIndex + 1].filter(
    (index) => index >= 0 && index < length,
  );
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
