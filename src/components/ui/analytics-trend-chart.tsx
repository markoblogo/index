"use client";

import { useMemo, useState } from "react";
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

  const series = useMemo(() => {
    return commodities
      .filter((commodity) => selectedIds.includes(commodity.id))
      .map((commodity, index) => {
        const fullHistory = history.filter((point) => point.commodityId === commodity.id);
        const points = period === "all" ? fullHistory : fullHistory.slice(-period);

        return {
          color: chartColors[index % chartColors.length],
          commodity,
          points,
        };
      });
  }, [commodities, history, period, selectedIds]);

  const visibleValues = series.flatMap((item) => item.points.map((point) => point.value));
  const minValue = Math.min(...visibleValues);
  const maxValue = Math.max(...visibleValues);
  const paddedRange = getPaddedRange(minValue, maxValue);

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

  return (
    <div>
      <div className="relative">
        <svg
          aria-label={locale === "uk" ? "Динаміка індексу" : "Index dynamics"}
          className="h-72 w-full overflow-visible"
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
                    : "border-black/20 bg-transparent text-black/40 hover:border-black/45 hover:text-black"
                }`}
                key={commodity.id}
                onClick={() => toggleCommodity(commodity.id)}
                type="button"
              >
                <span
                  className="h-2.5 w-2.5 border border-black"
                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
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

function getPaddedRange(min: number, max: number) {
  const range = Math.max(max - min, 1);
  const padding = Math.max(range * 0.12, 2);

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
