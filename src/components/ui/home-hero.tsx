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
  const identity = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-black px-3 py-1.5 text-xs font-black lowercase tracking-tight text-black">
          <span className="mr-2 h-2 w-2 rounded-full bg-uga-lime" />
          {labels.liveStatus}
        </span>
        <span className="rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold text-black/65">
          {labels.updated}: {updatedAt}
        </span>
      </div>

      <h1 className="mt-5 max-w-[calc(100vw-2.5rem)] break-words text-[clamp(2.85rem,7.25vw,6.15rem)] font-black uppercase leading-[0.88] tracking-normal text-black sm:max-w-full lg:mt-6">
        UGA Index
      </h1>
    </div>
  );

  const details = (
    <div className="min-w-0">
      <p className="max-w-[calc(100vw-2.5rem)] text-base font-semibold leading-6 text-black sm:max-w-xl sm:text-lg sm:leading-7">
        {labels.subtitle}
      </p>
      <p className="mt-3 max-w-[calc(100vw-2.5rem)] break-words text-sm leading-6 text-black/65 sm:max-w-xl">
        <span className="sm:hidden">{labels.attributionShort}</span>
        <span className="hidden sm:inline">{labels.attribution}</span>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {labels.meta.split(" · ").map((item) => (
          <span
            className="rounded-full border border-black/45 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-normal text-black/75"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );

  const actions = (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-[3px] border border-black bg-uga-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-uga-green"
          href={`/${locale}/methodology`}
        >
          {labels.methodology}
        </Link>
        <Link
          className="inline-flex rounded-[3px] border border-black/60 bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-uga-lime"
          href={`/${locale}/analytics`}
        >
          {labels.analytics}
        </Link>
      </div>
      <p className="mt-4 max-w-[calc(100vw-2.5rem)] break-words border-t border-black/10 pt-3 text-[0.68rem] font-semibold uppercase leading-5 tracking-normal text-black/55 sm:max-w-full">
        <span className="sm:hidden">{labels.trustStripShort}</span>
        <span className="hidden sm:inline">{labels.trustStrip}</span>
      </p>
    </div>
  );

  return (
    <section className="overflow-x-hidden border-b border-black bg-white">
      <div className="mx-auto grid min-h-[calc(100svh-65px)] w-full min-w-0 max-w-[1440px] border-x border-black lg:grid-cols-[0.78fr_1.22fr]">
        <div className="contents lg:flex lg:min-w-0 lg:max-w-full lg:flex-col lg:border-r lg:border-black lg:p-8 xl:p-9">
          <div className="border-b border-black p-5 sm:p-7 lg:border-b-0 lg:p-0">
            {identity}
          </div>
          <div className="order-2 border-b border-black p-5 sm:p-7 lg:order-none lg:mt-9 lg:border-b-0 lg:p-0">
            {details}
          </div>
          <div className="order-3 border-b border-black p-5 sm:p-7 lg:order-none lg:mt-auto lg:border-b-0 lg:p-0">
            {actions}
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
    <div className="order-1 min-w-0 max-w-[100vw] bg-uga-mist/35 p-4 sm:max-w-none sm:p-6 lg:order-none lg:p-7 xl:p-8">
      <div className="mb-3 flex items-center justify-between gap-4 lg:mb-4">
        <h2 className="text-xs font-black uppercase tracking-[0.16em] text-black/55 sm:text-sm">
          {currentValues}
        </h2>
        <span className="hidden rounded-full border border-black/40 bg-white px-3 py-1.5 text-xs font-black uppercase text-black sm:inline-flex">
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
  const changePrefix = isPositive ? "+" : "";

  return (
    <article className="grid min-h-[11.75rem] border border-black border-b-4 border-b-uga-green bg-white p-4 sm:min-h-[13.5rem] lg:min-h-[14.25rem] 2xl:min-h-[15rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
            {commodity.code}
          </p>
          <h3 className="mt-1.5 text-lg font-black leading-5 text-black">
            {commodity.name[locale]}
          </h3>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-uga-lime text-xs font-black text-black ring-1 ring-black">
          {commodity.marker}
        </span>
      </div>

      <div className="my-2 sm:my-2.5">
        <IndexSparkline
          heightClassName="h-8 sm:h-10"
          values={commodity.sparkline}
          trend={trend}
        />
      </div>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div>
          <p className="text-[2.1rem] font-black leading-none tracking-tight text-black sm:text-[2.25rem] lg:text-[2.35rem]">
            ${commodity.latest}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-black/15 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black/45">
              {SITE_CONFIG.defaultDeliveryBasis}
            </span>
            <span className="rounded-full border border-black/15 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black/45">
              {SITE_CONFIG.defaultDeliveryPeriod}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className={
              isPositive
                ? "text-sm font-black text-uga-green"
                : "text-sm font-black text-red-700"
            }
          >
            <span aria-hidden="true">{isPositive ? "↑ " : "↓ "}</span>
            {changePrefix}
            {commodity.absoluteChange} USD
          </p>
          <p className="mt-1 text-sm font-semibold text-black/55">
            {changePrefix}
            {commodity.percentChange}%
          </p>
        </div>
      </div>
    </article>
  );
}
