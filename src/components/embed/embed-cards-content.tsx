"use client";

import type { Commodity } from "@/lib/mock-data";
import { IndexSparkline } from "@/components/ui/index-sparkline";

export function EmbedCardsContent({
  commodities,
  compact,
  locale,
}: {
  commodities: Commodity[];
  compact: boolean;
  locale: "uk" | "en";
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div
        className={
          compact
            ? "mt-4 grid gap-2"
            : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {commodities.map((commodity) => {
          const positive = commodity.absoluteChange >= 0;

          return (
            <article
              className={
                compact
                  ? "grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-uga-mist p-3"
                  : "rounded-xl bg-uga-mist p-4"
              }
              key={commodity.id}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-uga-green ring-1 ring-uga-green/15">
                    {commodity.marker}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-uga-dark">
                      {commodity.name[locale]}
                    </p>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-black/45">
                      {commodity.code}
                    </p>
                  </div>
                </div>
                {!compact ? (
                  <div className="mt-3">
                    <IndexSparkline
                      heightClassName="h-12"
                      trend={positive ? "up" : "down"}
                      values={commodity.sparkline}
                    />
                  </div>
                ) : null}
              </div>
              <div className={compact ? "text-right" : "mt-3"}>
                <p className="text-2xl font-semibold tracking-tight text-uga-dark">
                  {commodity.latest === null ? "-" : `$${commodity.latest.toFixed(1)}`}
                </p>
                <p
                  className={
                    positive
                      ? "text-xs font-semibold text-uga-green"
                      : "text-xs font-semibold text-black"
                  }
                >
                  {positive ? "+" : ""}
                  {commodity.absoluteChange.toFixed(1)} USD · {positive ? "+" : ""}
                  {commodity.percentChange.toFixed(1)}%
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
