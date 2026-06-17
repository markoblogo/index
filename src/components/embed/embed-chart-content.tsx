"use client";

import type { Commodity } from "@/lib/mock-data";
import { SITE_CONFIG } from "@/lib/constants";
import { EmbedAttribution } from "@/components/embed/embed-shell";

export function EmbedChartContent({
  commodity,
  locale,
  values,
  positive,
}: {
  commodity: Commodity;
  locale: "uk" | "en";
  positive: boolean;
  values: number[];
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-uga-green">
            UGA Index · {SITE_CONFIG.defaultDeliveryBasis}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-uga-dark">
            {commodity.name[locale]}
          </h1>
        </div>
        <div className="text-right">
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
      </div>

      <svg
        aria-label={`${commodity.name[locale]} UGA Index chart`}
        className="mt-5 h-44 w-full overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {[18, 34, 50, 66, 82].map((y) => (
          <line
            key={y}
            stroke="#111111"
            strokeOpacity="0.08"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            x1="0"
            x2="100"
            y1={y}
            y2={y}
          />
        ))}
        <polyline
          fill="none"
          points={toChartPoints(values)}
          stroke={positive ? "#0b6b3a" : "#111111"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-xs font-semibold text-black/45">
        <span>{locale === "uk" ? "30 днів" : "30 days"}</span>
        <span>{SITE_CONFIG.currency}/{SITE_CONFIG.unit}</span>
      </div>
      <EmbedAttribution locale={locale} />
    </section>
  );
}

function toChartPoints(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 82 - ((value - min) / range) * 64;
      return `${x},${y}`;
    })
    .join(" ");
}
