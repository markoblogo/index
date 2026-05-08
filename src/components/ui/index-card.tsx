import { IndexSparkline } from "@/components/ui/index-sparkline";
import { SITE_CONFIG } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";
import type { Commodity } from "@/lib/mock-data";

export function IndexCard({
  commodity,
  locale,
}: {
  commodity: Commodity;
  locale: Locale;
}) {
  const isPositive = commodity.absoluteChange >= 0;
  const trend = isPositive ? "up" : "down";

  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
            {commodity.code}
          </p>
          <h2 className="mt-2 min-h-14 text-xl font-semibold leading-7 text-uga-dark">
            {commodity.name[locale]}
          </h2>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-uga-mist text-sm font-black text-uga-green ring-1 ring-uga-green/15">
          {commodity.marker}
        </span>
      </div>

      <div className="mt-5">
        <IndexSparkline values={commodity.sparkline} trend={trend} />
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold tracking-tight">
            ${commodity.latest}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-black/45">
            {SITE_CONFIG.currency}/{SITE_CONFIG.unit}
          </p>
        </div>
        <div className="text-right">
          <p
            className={
              isPositive
                ? "text-sm font-semibold text-uga-green"
                : "text-sm font-semibold text-black"
            }
          >
            {isPositive ? "+" : ""}
            {commodity.absoluteChange} USD
          </p>
          <p className="mt-1 text-sm font-medium text-black/55">
            {isPositive ? "+" : ""}
            {commodity.percentChange}%
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <p className="rounded-full bg-uga-mist px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
          {SITE_CONFIG.defaultDeliveryBasis}
        </p>
        <p className="rounded-full bg-uga-mist px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
          {SITE_CONFIG.defaultDeliveryPeriod}
        </p>
      </div>
    </article>
  );
}
