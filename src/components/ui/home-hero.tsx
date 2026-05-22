import Link from "next/link";
import { CurrencyToggle, CurrencyValue } from "@/components/ui/currency-toggle";
import { IndexSparkline } from "@/components/ui/index-sparkline";
import { SITE_CONFIG } from "@/lib/constants";
import type { FxRates } from "@/lib/fx-rates";
import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import type { Commodity } from "@/lib/mock-data";

type HomeHeroProps = {
  commodities: Commodity[];
  fxRates: FxRates;
  locale: Locale;
  respondentCount: number;
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
  respondentCount,
  updatedAt,
}: HomeHeroProps) {
  const activeIndex = getActiveIndexConfig();
  const copy = getHeroCopy(locale);
  const facts = copy.facts.map((fact) =>
    fact.kind === "respondents"
      ? { ...fact, value: String(respondentCount) }
      : fact,
  );

  if (activeIndex.id === "spike-ua") {
    return (
      <SpikeHomeHero
        commodities={commodities}
        fxRates={fxRates}
        labels={labels}
        locale={locale}
        respondentCount={respondentCount}
        updatedAt={updatedAt}
      />
    );
  }

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
                {SITE_CONFIG.name}
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
                {facts.map((fact) => (
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
            respondentCount={respondentCount}
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

function SpikeHomeHero({
  commodities,
  fxRates,
  locale,
  updatedAt,
}: HomeHeroProps) {
  const activeIndex = getActiveIndexConfig();
  const copy = getHeroCopy(locale);
  const facts = [
    { label: "index", value: "live" },
    ...activeIndex.home.facts[locale],
  ];

  return (
    <section className="max-w-full overflow-x-hidden text-white [background:var(--spike-hero-bg)] lg:min-h-[calc(100svh-57px)]">
      <div className="mx-auto flex max-w-[1900px] flex-col px-4 py-5 sm:px-6 lg:min-h-[calc(100svh-57px)] lg:px-8">
        <div className="grid gap-5 border-b border-white/18 pb-5 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-end">
          <div className="min-w-0">
            <SpikeHeroSubtitle locale={locale} text={activeIndex.home.subtitle[locale]} />
            <h1 className="mt-3 max-w-[calc(100vw-2rem)] break-words text-[clamp(2rem,8.4vw,3.35rem)] font-black uppercase leading-[0.9] tracking-normal sm:text-[clamp(2.6rem,7vw,4.9rem)] lg:max-w-5xl lg:text-[clamp(3.4rem,5.25vw,6.25rem)]">
              <SpikeHeroTitle />
            </h1>
          </div>

          <div className="grid gap-4 lg:justify-items-end lg:text-right">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-white/55">
                {activeIndex.home.boardKicker[locale]}
              </p>
              <p className="mt-1 text-base font-black tracking-[0.16em] text-white sm:text-xl">
                {updatedAt}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[34rem]">
              {facts.map((fact) => (
                <div
                  className="rounded-[1.15rem] border border-white/18 bg-black/20 px-4 py-3 backdrop-blur"
                  key={fact.label}
                >
                  <p className="text-2xl font-black lowercase leading-none text-white">
                    {fact.label === "index" ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full bg-[var(--spike-accent)] shadow-[0_0_18px_rgba(57,255,20,0.95)]"
                        />
                        {fact.value}
                      </span>
                    ) : (
                      fact.value
                    )}
                  </p>
                  <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-white/52">
                    {fact.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 max-w-[calc(100vw-2rem)] py-5 lg:max-w-full">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/60">
                {locale === "uk"
                  ? "CPT Одеса / CPT parity Одеса"
                  : "CPT Odesa / CPT parity Odesa"}
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-white/65">
                {activeIndex.home.officialNotice[locale]}
              </p>
            </div>
            <div className="rounded-full border border-white/18 bg-black/22 p-1.5 backdrop-blur">
              <CurrencyToggle label={copy.currencyToggleLabel} />
            </div>
          </div>

          <div className="group flex min-h-[35rem] gap-3 overflow-x-auto pb-2 pt-2 [scrollbar-width:none] sm:gap-4 lg:min-h-[37rem] xl:overflow-visible">
            {commodities.map((commodity) => (
              <SpikeCommodityCard
                commodity={commodity}
                fxRates={fxRates}
                key={commodity.id}
                locale={locale}
                officialLabel={copy.officialLabel}
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden border-t border-white/10 py-4">
          <div className="spike-marquee flex w-max gap-10 text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/45">
            {[0, 1, 2, 3].map((item) => (
              <span key={item}>{activeIndex.home.trustStrip[locale]}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SpikeHeroSubtitle({ locale, text }: { locale: Locale; text: string }) {
  if (locale !== "en") {
    return (
      <p className="max-w-[20rem] text-sm font-black leading-5 text-[var(--spike-accent)] sm:max-w-4xl sm:text-base sm:leading-6">
        {text}
      </p>
    );
  }

  return (
    <p className="max-w-[20rem] text-sm font-black leading-5 text-[var(--spike-accent)] sm:max-w-4xl sm:text-base sm:leading-6">
      <span className="block sm:inline">Daily Spike Brokers spot indices</span>{" "}
      <span className="block sm:inline">
        for Ukrainian export and processing bases.
      </span>
    </p>
  );
}

function SpikeHeroTitle() {
  return (
    <>
      <span className="block">SPIKE SPOT</span>
      <span className="block">COMMODITY</span>
      <span className="block sm:hidden">INDEX</span>
      <span className="block sm:hidden">UKRAINE</span>
      <span className="hidden sm:block">INDEX UKRAINE</span>
    </>
  );
}

function SpikeCommodityCard({
  commodity,
  fxRates,
  locale,
  officialLabel,
}: {
  commodity: Commodity;
  fxRates: FxRates;
  locale: Locale;
  officialLabel: string;
}) {
  const isPositive = commodity.absoluteChange > 0;
  const isFlat = commodity.absoluteChange === 0;
  const trend = isFlat ? "flat" : isPositive ? "up" : "down";
  const changePrefix = isPositive ? "+" : "";
  const changeLabel = isFlat
    ? "0"
    : `${changePrefix}${commodity.absoluteChange}`;
  const isProcessing = commodity.group === "processing";
  const tone = isProcessing
    ? {
        border: "hover:border-[var(--spike-pink)]",
        chip: "text-[var(--spike-pink)]",
        glow:
          "bg-[radial-gradient(circle_at_30%_0%,rgba(255,63,115,0.34),transparent_58%)]",
        label: "text-[var(--spike-pink)]",
        line: "border-white/14",
      }
    : {
        border: "hover:border-[var(--spike-accent)]",
        chip: "text-[var(--spike-accent)]",
        glow:
          "bg-[radial-gradient(circle_at_30%_0%,rgba(143,124,255,0.34),transparent_58%)]",
        label: "text-[var(--spike-accent)]",
        line: "border-white/10",
      };

  return (
    <article
      className={`relative flex min-w-[15.5rem] flex-[1_1_0] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#050505] p-5 text-[#f8f8f2] transition-[flex-grow,transform,border-color] duration-500 ease-out hover:flex-[1.75_1_0] hover:-translate-y-1 sm:min-w-[17rem] lg:min-w-0 ${tone.border}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-36 opacity-80 ${tone.glow}`}
      />
      <div className="relative z-10">
        <p className={`text-[0.68rem] font-black uppercase tracking-[0.24em] ${tone.label}`}>
          {commodity.group === "processing" ? "Processing" : "Export"}
        </p>
        <div className="mt-5 flex items-start justify-between gap-3">
          <h3 className="max-w-[11rem] text-2xl font-black uppercase leading-none tracking-normal text-[#f8f8f2]">
            {commodity.name[locale]}
          </h3>
          <span className={`rounded-full bg-white/10 px-2 py-1 text-[0.66rem] font-black ${tone.chip}`}>
            USD
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-9">
        <CurrencyValue
          className="block max-w-full overflow-hidden text-[clamp(3.6rem,7vw,6.4rem)] font-black leading-[0.84] tracking-normal text-white data-[currency=EUR]:text-[clamp(3rem,5vw,5.6rem)] data-[currency=UAH]:text-[clamp(2.15rem,3.45vw,4.05rem)] [&_.currency-unit]:text-base [&_.currency-unit]:text-white/45"
          fxRates={fxRates}
          locale={locale}
          officialLabel={officialLabel}
          officialUsd={commodity.latest}
        />
        <div
          className={`mt-5 inline-flex rounded-full px-4 py-2 text-sm font-black ${
            isFlat
              ? "bg-white/12 text-[#f8f8f2]/70"
              : isPositive
                ? isProcessing
                  ? "bg-[var(--spike-pink)] text-[#050505]"
                  : "bg-[var(--spike-accent)] text-[#050505]"
                : "bg-red-500 text-[#050505]"
          }`}
        >
          <span aria-hidden="true">{isFlat ? "→" : isPositive ? "↗" : "↘"}</span>
          <span className="ml-2">{changeLabel}$</span>
        </div>
      </div>

      <div className="relative z-10 my-7">
        <IndexSparkline
          heightClassName="h-12"
          values={commodity.sparkline}
          trend={trend}
        />
      </div>

      <div className={`relative z-10 mt-auto grid gap-3 border-t pt-5 opacity-75 transition-opacity duration-500 hover:opacity-100 ${tone.line}`}>
        {(commodity.detailMetrics ?? []).map((metric) => (
          <div className="grid grid-cols-[1fr_auto] gap-5" key={metric.label.en}>
            <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-white/38">
              {metric.label[locale]}
            </p>
            <p className="text-sm font-black text-[#f8f8f2]">
              {metric.value[locale]}
            </p>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_auto] gap-5">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-white/38">
            {locale === "uk" ? "ПДВ" : "VAT"}
          </p>
          <p className="text-sm font-black text-[#f8f8f2]">
            {commodity.vatIncluded
              ? locale === "uk"
                ? "в т.ч."
                : "included"
              : locale === "uk"
                ? "без позначки"
                : "n/a"}
          </p>
        </div>
      </div>
    </article>
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
  respondentCount,
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
  respondentCount: number;
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
            {updatedLabel}: {updatedAt} · {SITE_CONFIG.heroDeliveryBasis} ·{" "}
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
            respondentCount={respondentCount}
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
  respondentCount,
}: {
  commodity: Commodity;
  fxRates: FxRates;
  locale: Locale;
  officialLabel: string;
  respondentLabel: string;
  respondentCount: number;
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
          {` ${respondentCount} `}
          {respondentLabel}
        </p>
      </div>
    </article>
  );
}

function getHeroCopy(locale: Locale) {
  const activeIndex = getActiveIndexConfig();

  if (locale === "uk") {
    return {
      editorialLine: activeIndex.home.editorialLine.uk,
      boardKicker: activeIndex.home.boardKicker.uk,
      facts: withRespondentFactKind(activeIndex.home.facts.uk),
      kicker: "Spot export price index",
      methodologyPrefix: "Методологія",
      methodologyShort: activeIndex.home.trustStrip.uk,
      currencyToggleLabel: "Валюта відображення",
      fxLabel: "FX",
      officialLabel: "офіційно",
      officialNotice: activeIndex.home.officialNotice.uk,
      respondents: "респондентів",
    };
  }

  return {
    editorialLine: activeIndex.home.editorialLine.en,
    boardKicker: activeIndex.home.boardKicker.en,
    facts: withRespondentFactKind(activeIndex.home.facts.en),
    kicker: "Spot export price index",
    methodologyPrefix: "Methodology",
    methodologyShort: activeIndex.home.trustStrip.en,
    currencyToggleLabel: "Display currency",
    fxLabel: "FX",
    officialLabel: "official",
    officialNotice: activeIndex.home.officialNotice.en,
    respondents: "respondents",
  };
}

function formatFxSource(source: FxRates["source"], locale: Locale) {
  if (source === "NBU" && locale === "uk") {
    return "НБУ";
  }

  return source === "demo" ? "FX fallback" : source;
}

function withRespondentFactKind(
  facts: Array<{ label: string; value: string }>,
) {
  return facts.map((fact) => ({
    ...fact,
    kind:
      fact.label.toLowerCase().includes("respondent") ||
      fact.label.toLowerCase().includes("респондент")
        ? "respondents"
        : "default",
  }));
}
