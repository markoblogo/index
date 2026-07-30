"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";

type VolatilityPoint = {
  commodityId: CommodityId;
  date: string;
  percentChange: number;
  value: number;
};

type VolatilityRangePanelProps = {
  commodities: Commodity[];
  history: VolatilityPoint[];
  locale: Locale;
};

const VOLATILITY_WINDOW_DAYS = 30;

export function VolatilityRangePanel({
  commodities,
  history,
  locale,
}: VolatilityRangePanelProps) {
  const rows = useMemo(() => {
    return commodities.flatMap((commodity) => {
      const commodityHistory = history
        .filter((point) => point.commodityId === commodity.id)
        .sort((left, right) => left.date.localeCompare(right.date))
        .slice(-VOLATILITY_WINDOW_DAYS);

      if (commodityHistory.length === 0) {
        return [];
      }

      const volatility = standardDeviation(
        commodityHistory.map((point) => point.percentChange),
      );
      const min = Math.min(...commodityHistory.map((point) => point.value));
      const max = Math.max(...commodityHistory.map((point) => point.value));
      const current = commodityHistory.at(-1)?.value ?? min;
      const position = getRangePosition(current, min, max);

      return [{ commodity, current, max, min, position, volatility }];
    });
  }, [commodities, history]);

  return (
    <div>
      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.commodity.id}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-black text-black">
                {row.commodity.name[locale]}
              </span>
              <span className="font-black text-black/60">
                {row.volatility.toFixed(2)}% · {row.current.toFixed(0)} / {row.min.toFixed(0)}-
                {row.max.toFixed(0)} USD/t
              </span>
            </div>
            <div className="relative h-3 border border-black bg-white">
              <div
                className="h-full bg-uga-green"
                style={{
                  width: `${row.position}%`,
                }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_0_12px_rgba(57,255,20,0.45)]"
                style={{
                  background:
                    "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.98) 0 10%, var(--color-green) 34%, var(--color-green) 58%, rgba(0,0,0,0.42) 100%)",
                  left: `${row.position}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRangePosition(current: number, min: number, max: number) {
  const range = max - min;

  if (range <= 0) {
    return 50;
  }

  return Math.min(Math.max(((current - min) / range) * 100, 0), 100);
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
