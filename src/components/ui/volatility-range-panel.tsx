"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Commodity, CommodityId } from "@/lib/mock-data";

type VolatilityPoint = {
  commodityId: CommodityId;
  percentChange: number;
  value: number;
};

type VolatilityRangePanelProps = {
  commodities: Commodity[];
  history: VolatilityPoint[];
  locale: Locale;
};

const periodOptions = [30, 90, 180, 360] as const;

export function VolatilityRangePanel({
  commodities,
  history,
  locale,
}: VolatilityRangePanelProps) {
  const [period, setPeriod] = useState<(typeof periodOptions)[number]>(30);

  const rows = useMemo(() => {
    return commodities.map((commodity) => {
      const commodityHistory = history
        .filter((point) => point.commodityId === commodity.id)
        .slice(-period);
      const volatility = standardDeviation(
        commodityHistory.map((point) => point.percentChange),
      );
      const min = Math.min(...commodityHistory.map((point) => point.value));
      const max = Math.max(...commodityHistory.map((point) => point.value));

      return { commodity, max, min, volatility };
    });
  }, [commodities, history, period]);

  const maxVolatility = Math.max(...rows.map((row) => row.volatility), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-1.5">
        {periodOptions.map((option) => {
          const active = period === option;

          return (
            <button
              className={`border px-2.5 py-1.5 text-[0.68rem] font-black uppercase transition ${
                active
                  ? "border-black bg-uga-dark text-white"
                  : "border-black/25 bg-white text-black/50 hover:border-black hover:text-black"
              }`}
              key={option}
              onClick={() => setPeriod(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.commodity.id}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-black text-black">
                {row.commodity.name[locale]}
              </span>
              <span className="font-black text-black/60">
                {row.volatility.toFixed(2)}% · {row.min.toFixed(0)}-
                {row.max.toFixed(0)} USD/t
              </span>
            </div>
            <div className="h-3 border border-black bg-white">
              <div
                className="h-full bg-uga-green"
                style={{
                  width: `${Math.max((row.volatility / maxVolatility) * 100, 8)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function standardDeviation(values: number[]) {
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return Math.sqrt(variance);
}
