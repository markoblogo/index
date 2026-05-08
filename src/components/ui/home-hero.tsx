import Link from "next/link";
import { IndexSparkline } from "@/components/ui/index-sparkline";
import { SITE_CONFIG } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";
import type { Commodity } from "@/lib/mock-data";

type HomeHeroProps = {
  commodities: Commodity[];
  locale: Locale;
  updatedAt: string;
  labels: {
    analytics: string;
    attribution: string;
    attributionShort: string;
    currentValues: string;
    liveStatus: string;
    methodology: string;
    meta: string;
    subtitle: string;
    trustStrip: string;
    trustStripShort: string;
    updated: string;
  };
};

export function HomeHero({
  commodities,
  labels,
  locale,
  updatedAt,
}: HomeHeroProps) {
  return (
    <section className="overflow-x-hidden border-b border-black bg-white">
      <div className="mx-auto grid min-h-[calc(100svh-65px)] w-full min-w-0 max-w-[1440px] border-x border-black lg:grid-cols-[0.82fr_1.18fr]">
        <div className="flex min-w-0 max-w-full flex-col justify-between gap-8 border-b border-black p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8 xl:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-black px-3 py-1.5 text-xs font-black lowercase tracking-tight text-black">
                <span className="mr-2 h-2 w-2 rounded-full bg-uga-lime" />
                {labels.liveStatus}
              </span>
              <span className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold text-black/65">
                {labels.updated}: {updatedAt}
              </span>
            </div>

            <h1 className="mt-7 max-w-[calc(100vw-2.5rem)] break-words text-[clamp(3rem,8vw,6.75rem)] font-black uppercase leading-[0.86] tracking-normal text-black sm:max-w-full lg:mt-8">
              UGA Index
            </h1>
            <p className="mt-5 max-w-[calc(100vw-2.5rem)] text-lg font-semibold leading-7 text-black sm:max-w-xl sm:text-xl">
              {labels.subtitle}
            </p>
            <p className="mt-4 max-w-[calc(100vw-2.5rem)] break-words text-sm leading-6 text-black/65 sm:max-w-xl">
              <span className="sm:hidden">{labels.attributionShort}</span>
              <span className="hidden sm:inline">{labels.attribution}</span>
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {labels.meta.split(" · ").map((item) => (
                <span
                  className="rounded-full border border-black px-3 py-2 text-xs font-black uppercase tracking-normal text-black"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-green"
                href={`/${locale}/methodology`}
              >
                {labels.methodology}
              </Link>
              <Link
                className="inline-flex rounded-full border border-black bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-uga-lime"
                href={`/${locale}/analytics`}
              >
                {labels.analytics}
              </Link>
            </div>
            <p className="mt-5 max-w-[calc(100vw-2.5rem)] break-words border-t border-black/10 pt-4 text-xs font-semibold uppercase leading-5 tracking-normal text-black/55 sm:max-w-full">
              <span className="sm:hidden">{labels.trustStripShort}</span>
              <span className="hidden sm:inline">{labels.trustStrip}</span>
            </p>
          </div>
        </div>

        <HeroIndexBoard
          commodities={commodities}
          currentValues={labels.currentValues}
          locale={locale}
        />
      </div>
    </section>
  );
}

function HeroIndexBoard({
  commodities,
  currentValues,
  locale,
}: {
  commodities: Commodity[];
  currentValues: string;
  locale: Locale;
}) {
  return (
    <div className="min-w-0 max-w-[100vw] bg-uga-mist/45 p-4 sm:max-w-none sm:p-6 lg:p-7 xl:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-black uppercase tracking-[0.14em] text-black/55">
          {currentValues}
        </h2>
        <span className="hidden rounded-full bg-uga-lime px-3 py-1.5 text-xs font-black uppercase text-black ring-1 ring-black sm:inline-flex">
          {SITE_CONFIG.currency}/{SITE_CONFIG.unit}
        </span>
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:gap-4 2xl:grid-cols-4">
        {commodities.map((commodity) => (
          <HeroIndexCard
            commodity={commodity}
            key={commodity.id}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function HeroIndexCard({
  commodity,
  locale,
}: {
  commodity: Commodity;
  locale: Locale;
}) {
  const isPositive = commodity.absoluteChange >= 0;
  const trend = isPositive ? "up" : "down";

  return (
    <article className="grid min-h-[13.25rem] border border-black bg-white p-4 shadow-[4px_4px_0_#0b6b3a] sm:min-h-[14.25rem] lg:min-h-[15rem]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
            {commodity.code}
          </p>
          <h3 className="mt-2 text-lg font-black leading-5 text-black">
            {commodity.name[locale]}
          </h3>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-uga-lime text-xs font-black text-black ring-1 ring-black">
          {commodity.marker}
        </span>
      </div>

      <div className="my-3">
        <IndexSparkline
          heightClassName="h-12"
          values={commodity.sparkline}
          trend={trend}
        />
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div>
          <p className="text-[2.15rem] font-black leading-none tracking-tight text-black">
            ${commodity.latest}
          </p>
          <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
            {SITE_CONFIG.defaultDeliveryBasis}
          </p>
        </div>
        <div className="text-right">
          <p
            className={
              isPositive
                ? "text-sm font-black text-uga-green"
                : "text-sm font-black text-black"
            }
          >
            {isPositive ? "+" : ""}
            {commodity.absoluteChange} USD
          </p>
          <p className="mt-1 text-sm font-semibold text-black/55">
            {isPositive ? "+" : ""}
            {commodity.percentChange}%
          </p>
        </div>
      </div>
    </article>
  );
}
