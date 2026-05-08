import Link from "next/link";
import { CurrencyToggle, CurrencyValue } from "@/components/ui/currency-toggle";
import { IndexSparkline } from "@/components/ui/index-sparkline";
import { SITE_CONFIG } from "@/lib/constants";
import type { FxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import type { Commodity } from "@/lib/mock-data";

type HomeHeroProps = {
  commodities: Commodity[];
  fxRates: FxRates;
  locale: Locale;
  updatedAt: string;
  labels: {
    analytics: string;
    currentValues: string;
    methodology: string;
    subtitle: string;
    trustStrip: string;
    updated: string;
  };
};

export function HomeHero({
  commodities,
  fxRates,
  labels,
  locale,
  updatedAt,
}: HomeHeroProps) {
  const copy = getHeroCopy(locale);
  return (
    <section className="overflow-hidden border-b border-black bg-white">
      <div className="relative mx-auto min-h-[calc(100svh-61px)] max-w-[1440px] border-x border-black">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(var(--color-ink)_1px,transparent_1px),linear-gradient(90deg,var(--color-ink)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-6 right-6 hidden text-[8rem] font-black uppercase leading-none text-black/[0.035] xl:block"
        >
          INDEX
        </div>

        <div className="relative z-10 grid lg:grid-cols-[0.78fr_1.22fr]">
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:border-r lg:border-black lg:p-8 xl:p-9">
            <div className="border-b border-black p-5 sm:p-7 lg:border-b-0 lg:p-0">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-uga-green">
                {copy.kicker}
              </p>
              <h1 className="mt-3 max-w-[calc(100vw-2.5rem)] break-words text-[clamp(2.8rem,7vw,5.9rem)] font-black uppercase leading-[0.88] tracking-normal text-black sm:max-w-full">
                UGA Index
              </h1>
              <p className="mt-2 text-lg font-black leading-6 text-black/60 sm:text-xl">
                {copy.editorialLine}
              </p>
            </div>

            <div className="order-2 border-b border-black p-5 sm:p-7 lg:order-none lg:mt-7 lg:border-b-0 lg:p-0">
              <p className="max-w-xl text-base font-semibold leading-6 text-black sm:text-lg sm:leading-7">
                {labels.subtitle}
              </p>

              <div className="mt-5 grid grid-cols-3 border border-black">
                {copy.facts.map((fact) => (
                  <div
                    className="border-r border-black p-3 last:border-r-0"
                    key={fact.label}
                  >
                    <p className="text-xl font-black leading-none text-black sm:text-2xl">
                      {fact.value}
                    </p>
                    <p className="mt-1 text-[0.64rem] font-black uppercase tracking-[0.12em] text-black/50">
                      {fact.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-3 border-b border-black p-5 sm:p-7 lg:order-none lg:mt-auto lg:border-b-0 lg:p-0">
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
            </div>
          </div>

          <HeroIndexBoard
            commodities={commodities}
            currentValues={labels.currentValues}
            fxRates={fxRates}
            locale={locale}
            boardKicker={copy.boardKicker}
            currencyToggleLabel={copy.currencyToggleLabel}
            fxLabel={copy.fxLabel}
            officialLabel={copy.officialLabel}
            officialNotice={copy.officialNotice}
            respondentLabel={copy.respondents}
            updatedAt={updatedAt}
            updatedLabel={labels.updated}
          />
        </div>

        <div className="relative z-10 border-t border-black bg-uga-mist/45 px-5 py-3 sm:px-7 lg:px-8">
          <p className="text-[0.68rem] font-semibold uppercase leading-5 tracking-normal text-black/60">
            <span className="sm:hidden">{copy.methodologyShort}</span>
            <span className="hidden sm:inline">
              {copy.methodologyPrefix}: {labels.trustStrip}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function HeroIndexBoard({
  commodities,
  currentValues,
  currencyToggleLabel,
  fxLabel,
  fxRates,
  locale,
  officialLabel,
  officialNotice,
  boardKicker,
  respondentLabel,
  updatedAt,
  updatedLabel,
}: {
  commodities: Commodity[];
  currentValues: string;
  currencyToggleLabel: string;
  fxLabel: string;
  fxRates: FxRates;
  locale: Locale;
  officialLabel: string;
  officialNotice: string;
  boardKicker: string;
  respondentLabel: string;
  updatedAt: string;
  updatedLabel: string;
}) {
  return (
    <div className="order-1 min-w-0 max-w-full bg-uga-mist/35 p-4 sm:p-5 lg:order-none lg:p-6 xl:p-7">
      <div className="border-b border-black pb-3">
        <div>
          <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-uga-green">
            {boardKicker}
          </p>
          <h2 className="mt-1 text-base font-black uppercase tracking-[0.08em] text-black">
            {currentValues}
          </h2>
          <p className="mt-2 text-[0.68rem] font-black uppercase leading-5 tracking-normal text-black/50">
            {updatedLabel}: {updatedAt} · {SITE_CONFIG.defaultDeliveryBasis} ·{" "}
            {SITE_CONFIG.defaultDeliveryPeriod} · {fxLabel}:{" "}
            {formatFxSource(fxRates.source, locale)} USD/UAH{" "}
            {fxRates.usdUah.toFixed(2)}, EUR/UAH {fxRates.eurUah.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <p className="max-w-[24rem] text-[0.65rem] font-semibold leading-4 text-black/45">
          {officialNotice}
        </p>
        <CurrencyToggle label={currencyToggleLabel} />
      </div>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:gap-4">
        {commodities.map((commodity) => (
          <HeroIndexCard
            commodity={commodity}
            fxRates={fxRates}
            key={commodity.id}
            locale={locale}
            officialLabel={officialLabel}
            respondentLabel={respondentLabel}
          />
        ))}
      </div>
    </div>
  );
}

function HeroIndexCard({
  commodity,
  fxRates,
  locale,
  officialLabel,
  respondentLabel,
}: {
  commodity: Commodity;
  fxRates: FxRates;
  locale: Locale;
  officialLabel: string;
  respondentLabel: string;
}) {
  const isPositive = commodity.absoluteChange >= 0;
  const trend = isPositive ? "up" : "down";
  const changePrefix = isPositive ? "+" : "";
  const changeClass = isPositive ? "text-uga-green" : "text-red-700";

  return (
    <article className="grid min-h-[11.5rem] border border-black border-b-4 border-b-uga-green bg-white p-4 sm:min-h-[12.5rem] lg:min-h-[13rem] xl:min-h-[13.5rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-black/45">
            {commodity.code}
          </p>
          <h3 className="mt-1 text-lg font-black leading-5 text-black">
            {commodity.name[locale]}
          </h3>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-uga-lime text-xs font-black text-black ring-1 ring-black">
          {commodity.marker}
        </span>
      </div>

      <div className="my-2">
        <IndexSparkline
          heightClassName="h-7 sm:h-8"
          values={commodity.sparkline}
          trend={trend}
        />
      </div>

      <div className="mt-auto">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[clamp(3.05rem,4.3vw,4.9rem)] font-black leading-[0.9] tracking-tight text-black">
            <CurrencyValue
              className="[&>span:first-child]:leading-[0.9] [&_.currency-unit]:text-base"
              fxRates={fxRates}
              locale={locale}
              officialLabel={officialLabel}
              officialUsd={commodity.latest}
            />
          </p>
          <div className="text-right">
            <p className={`text-sm font-black ${changeClass}`}>
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
        <p className="mt-2 truncate text-[0.65rem] font-black tracking-[0.12em] text-black/45">
          {SITE_CONFIG.defaultDeliveryBasis} · {SITE_CONFIG.defaultDeliveryPeriod} ·
          {" 8 "}
          {respondentLabel}
        </p>
      </div>
    </article>
  );
}

function getHeroCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      editorialLine: "/ експортний ціновий бенчмарк",
      boardKicker: "Щоденний бюлетень",
      facts: [
        { value: "4", label: "культури" },
        { value: "8", label: "респондентів" },
        { value: "EOD", label: "перевірка" },
      ],
      kicker: "Spot export price index",
      methodologyPrefix: "Методологія",
      methodologyShort: "Методологія: EOD · медіана · ±2% · 5+ · фіксація",
      currencyToggleLabel: "Валюта відображення",
      fxLabel: "FX",
      officialLabel: "офіційно",
      officialNotice:
        "Офіційні значення: USD/т. UAH та EUR — перерахунок для відображення.",
      respondents: "респондентів",
    };
  }

  return {
    editorialLine: "/ export pricing benchmark",
    boardKicker: "Daily bulletin",
    facts: [
      { value: "4", label: "commodities" },
      { value: "8", label: "respondents" },
      { value: "EOD", label: "review" },
    ],
    kicker: "Spot export price index",
    methodologyPrefix: "Methodology",
    methodologyShort: "Methodology: EOD · median · ±2% · 5+ · locked",
    currencyToggleLabel: "Display currency",
    fxLabel: "FX",
    officialLabel: "official",
    officialNotice:
      "Official values: USD/t. UAH and EUR are display conversions.",
    respondents: "respondents",
  };
}

function formatFxSource(source: FxRates["source"], locale: Locale) {
  if (source === "NBU" && locale === "uk") {
    return "НБУ";
  }

  return source === "demo" ? "demo FX" : source;
}
