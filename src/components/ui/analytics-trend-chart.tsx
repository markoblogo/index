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
  showLegendControls?: boolean;
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
  showLegendControls = true,
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
        const fullHistory = history
          .filter((point) => point.commodityId === commodity.id)
          .sort((left, right) => left.date.localeCompare(right.date));
        const points = fullHistory.slice(-CHART_WINDOW_DAYS);
        const colorIndex = commodities.findIndex((item) => item.id === commodity.id);

        return {
          color: chartColors[Math.max(colorIndex, 0) % chartColors.length],
          commodity,
          points,
        };
      });
  }, [commodities, history, selectedIds]);

  const dateDomain = useMemo(() => {
    return Array.from(
      new Set(series.flatMap((item) => item.points.map((point) => point.date))),
    )
      .sort((left, right) => left.localeCompare(right))
      .slice(-CHART_WINDOW_DAYS);
  }, [series]);
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
  const legendPoint = hoverPoint ??
    getLatestTrendPoint(series, dateDomain, paddedRange.min, paddedRange.max);

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
      dateDomain,
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
                item.points,
                dateDomain,
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
            </g>
          ) : null}
        </svg>
        {hoverPoint
          ? hoverPoint.entries.map((entry) => (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_0_12px_rgba(57,255,20,0.45)]"
                key={entry.commodity.id}
                style={{
                  background: getMarkerBackground(entry.color),
                  left: `${entry.x}%`,
                  top: `${entry.y}%`,
                }}
              />
            ))
          : null}
        <div className="pointer-events-none absolute inset-0 top-1 text-[0.65rem] font-black uppercase leading-4 text-white/58">
          <p className="text-right">{paddedRange.max.toFixed(0)} USD/t</p>
          <p className="absolute left-0 top-[14rem] text-left">{paddedRange.min.toFixed(0)} USD/t</p>
        </div>
      </div>
      {legendPoint ? (
        <div className="mt-2 rounded-lg border border-uga-green/40 bg-[#07120b] p-2 shadow-sm shadow-black/30">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-uga-green">
            {formatHoverDate(legendPoint.date, locale)}
          </p>
          <div className="mt-1.5 grid gap-1">
            {legendPoint.entries.map((entry) => (
              <div
                className="grid grid-cols-[0.55rem_minmax(0,1fr)_7rem] items-center gap-1.5 text-[0.58rem] font-black uppercase leading-tight"
                key={entry.commodity.id}
              >
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/35"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="min-w-0 break-words text-white/74">
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
      {showLegendControls ? (
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
                <span className="whitespace-nowrap">
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
      ) : null}
    </div>
  );
}

function getLatestTrendPoint(
  series: TrendSeries[],
  dateDomain: string[],
  min: number,
  max: number,
): TrendHoverPoint | null {
  for (const date of [...dateDomain].reverse()) {
    const entries = buildTrendEntriesForDate({
      date,
      dateDomain,
      max,
      min,
      series,
    });

    if (entries.length > 0) {
      return {
        date,
        entries: entries.sort((a, b) => b.value - a.value),
        x: entries[0]?.x ?? 0,
        y: entries[0]?.y ?? 0,
      };
    }
  }

  return null;
}

function getCommodityLegendLabel(commodity: Commodity, locale: Locale) {
  const name = commodity.shortName?.[locale] ?? commodity.name[locale];
  const basis = getDeliveryBasisConfigForCommodityId(commodity.id);
  return `${name} · ${getTrendBasisLabel(basis.code, basis.name)}`;
}

function getTrendBasisLabel(code: string, fallbackName: string) {
  switch (code) {
    case "CPT_ODESA_EXPORT":
      return "CPT ODESA";
    case "FCA_CHOP_EXPORT":
      return "FCA CHOP";
    case "CPT_PARITY_ODESA_PROCESSING":
      return "CPT CRUSH";
    default:
      return fallbackName.toUpperCase();
  }
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

function toChartPoints(points: AnalyticsTrendPoint[], dateDomain: string[], min: number, max: number) {
  return points
    .map((point) => {
      const { x, y } = getChartCoordinate({
        date: point.date,
        dateDomain,
        max,
        min,
        value: point.value,
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
  dateDomain,
}: {
  max: number;
  min: number;
  pointerX: number;
  pointerY: number;
  series: TrendSeries[];
  dateDomain: string[];
}): TrendHoverPoint | null {
  if (dateDomain.length === 0) {
    return null;
  }
  const referenceIndex =
    dateDomain.length <= 1
      ? 0
      : Math.round(
          (Math.min(Math.max(pointerX, 0), 100) / 100) *
            (dateDomain.length - 1),
        );
  const referenceDate = dateDomain[referenceIndex];

  if (!referenceDate) {
    return null;
  }

  const entries = buildTrendEntriesForDate({
    date: referenceDate,
    dateDomain,
    max,
    min,
    series,
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
    date: referenceDate,
    entries: entries.sort((a, b) => b.value - a.value),
    x: getDateX(referenceDate, dateDomain),
    y: anchor.y,
  };
}

function buildTrendEntriesForDate({
  date,
  dateDomain,
  max,
  min,
  series,
}: {
  date: string;
  dateDomain: string[];
  max: number;
  min: number;
  series: TrendSeries[];
}) {
  return series.flatMap((item) => {
    const point = item.points.find((entry) => entry.date === date);

    if (!point) {
      return [];
    }

    const coordinate = getChartCoordinate({
      date,
      dateDomain,
      max,
      min,
      value: point.value,
    });

    return [{
      color: item.color,
      commodity: item.commodity,
      date: point.date,
      value: point.value,
      x: coordinate.x,
      y: coordinate.y,
    }];
  });
}

function getChartCoordinate({
  date,
  dateDomain,
  max,
  min,
  value,
}: {
  date: string;
  dateDomain: string[];
  max: number;
  min: number;
  value: number;
}) {
  const range = Math.max(max - min, 1);

  return {
    x: getDateX(date, dateDomain),
    y: 82 - ((value - min) / range) * 64,
  };
}

function getDateX(date: string, dateDomain: string[]) {
  const index = dateDomain.indexOf(date);
  return dateDomain.length <= 1 || index < 0
    ? 0
    : (index / (dateDomain.length - 1)) * 100;
}

function getMarkerBackground(color: string) {
  return `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.98) 0 10%, ${color} 34%, ${color} 58%, rgba(0,0,0,0.42) 100%)`;
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
