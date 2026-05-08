import Link from "next/link";
import { connection } from "next/server";
import { IndexCard } from "@/components/ui/index-card";
import { LatestQuotesTable } from "@/components/ui/latest-quotes-table";
import { MainIndexChart } from "@/components/ui/main-index-chart";
import { PartnerStrip } from "@/components/ui/partner-strip";
import { SectionHeader } from "@/components/ui/section-header";
import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";

export const dynamic = "force-dynamic";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  await connection();

  const { locale } = await params;
  const dict = getDictionary(locale);
  const snapshot = await getPublicIndexSnapshot();
  const updatedAt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl border-x border-black lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid min-h-[30rem] content-between border-b border-black p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div>
              <p className="inline-flex rounded-full border border-black px-4 py-2 text-sm font-semibold lowercase tracking-tight">
                <span className="mr-2 mt-1 inline-block h-2 w-2 rounded-full bg-uga-lime" />
                {dict.home.liveStatus}
              </p>
              <h1 className="mt-8 max-w-4xl text-[clamp(2.75rem,7.4vw,6.6rem)] font-black uppercase leading-[0.88] tracking-normal text-black">
                {dict.home.boardTitle}
              </h1>
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-xs text-sm leading-5 text-black/70">
                {dict.home.boardDescription}
              </p>
              <div className="text-left md:text-right">
                <p className="text-3xl font-black tracking-tight text-black">
                  ${snapshot.commodities[0]?.latest ?? "n/a"}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
                  {SITE_CONFIG.currency}/{SITE_CONFIG.unit}
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-rows-[1fr_auto]">
            <div className="grid min-h-[20rem] border-b border-black md:grid-cols-2">
              <div className="relative flex items-center justify-center overflow-hidden bg-uga-lime">
                <span className="text-8xl font-black text-black/15 sm:text-9xl">
                  UGA
                </span>
              </div>
              <div className="border-t border-black bg-[radial-gradient(circle_at_30%_30%,rgba(11,107,58,0.16),transparent_38%),linear-gradient(135deg,#f7f7f7,#ffffff)] p-6 md:border-l md:border-t-0">
                <p className="max-w-[12rem] text-sm font-semibold uppercase leading-5 text-black">
                  {dict.home.partnerLine}
                </p>
                <dl className="mt-10 grid gap-4 text-sm">
                  <StatusRow label={dict.home.updatedLabel} value={updatedAt} />
                  <StatusRow
                    label={dict.home.basisLabel}
                    value={SITE_CONFIG.defaultDeliveryBasis}
                  />
                  <StatusRow
                    label={dict.home.deliveryPeriodLabel}
                    value={SITE_CONFIG.defaultDeliveryPeriod}
                  />
                </dl>
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr_15rem]">
              <div className="border-b border-black p-6 md:border-b-0 md:border-r">
                <p className="text-sm italic text-black/70">
                  daily, weekly and monthly export pricing metrics
                </p>
                <p className="mt-10 text-5xl font-black tracking-tight text-black">
                  {snapshot.commodities.length}
                </p>
                <p className="mt-1 max-w-[13rem] text-xs leading-4 text-black/55">
                  published commodity baskets on FOB Black Sea basis
                </p>
              </div>
              <CommoditySelector
                locale={locale}
                title={dict.home.selectorTitle}
                commodities={snapshot.commodities}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <SectionHeader
          description={dict.home.description}
          label={dict.home.cardsLabel}
          title={dict.home.cardsLabel}
        />
        <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-3 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-4">
          {snapshot.commodities.map((commodity) => (
            <IndexCard
              commodity={commodity}
              key={commodity.id}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-uga-mist">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <SectionHeader
            description={dict.home.chartsDescription}
            label={dict.home.chartsLabel}
            title={dict.home.chartsTitle}
          />
          <div className="mt-8">
            <MainIndexChart locale={locale} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 lg:px-6">
        <SectionHeader
          description={dict.home.quotesDescription}
          label={dict.home.quotesLabel}
          title={dict.home.quotesTitle}
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-[18rem_1fr]">
          <ReportCta
            action={dict.home.reportAction}
            description={dict.home.reportDescription}
            title={dict.home.reportTitle}
          />
          <div>
            <LatestQuotesTable
              commodities={snapshot.commodities}
              labels={dict.home.table}
              locale={locale}
              quotes={snapshot.latestQuotes}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-uga-mist">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <SectionHeader
            description={dict.home.partnersDescription}
            label={dict.home.partnersLabel}
            title={dict.home.partnersTitle}
          />
          <div className="mt-8">
            <PartnerStrip locale={locale} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-14 lg:grid-cols-2 lg:px-8">
        <CtaBlock
          description={dict.home.methodologyCtaDescription}
          href={`/${locale}/methodology`}
          label={dict.home.readMore}
          title={dict.home.methodologyCtaTitle}
        />
        <CtaBlock
          description={dict.home.analyticsCtaDescription}
          href={`/${locale}/analytics`}
          label={dict.home.viewAnalytics}
          title={dict.home.analyticsCtaTitle}
        />
      </section>
    </>
  );
}

function CtaBlock({
  description,
  href,
  label,
  title,
}: {
  description: string;
  href: string;
  label: string;
  title: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-uga-dark p-7 text-white shadow-soft">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
      <Link
        className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-uga-dark transition hover:bg-uga-lime"
        href={href}
      >
        {label}
      </Link>
    </article>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-black/15 pt-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-black">{value}</dd>
    </div>
  );
}

function CommoditySelector({
  commodities,
  locale,
  title,
}: {
  commodities: Awaited<ReturnType<typeof getPublicIndexSnapshot>>["commodities"];
  locale: Locale;
  title: string;
}) {
  return (
    <div>
      <p className="border-b border-black bg-uga-lime px-6 py-4 text-sm font-black uppercase tracking-normal text-black">
        {title}
      </p>
      <div className="divide-y divide-black border-b border-black md:border-b-0">
        {commodities.map((commodity) => (
          <div
            className="flex items-center justify-between gap-4 px-6 py-4 text-sm font-black uppercase text-black"
            key={commodity.id}
          >
            <span>{commodity.name[locale]}</span>
            <span className="text-black/45">{commodity.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCta({
  action,
  description,
  title,
}: {
  action: string;
  description: string;
  title: string;
}) {
  return (
    <aside className="grid min-h-56 content-between border border-black bg-white p-6">
      <div>
        <h2 className="text-2xl font-black uppercase leading-none text-black">
          {title}
        </h2>
        <p className="mt-4 max-w-[13rem] text-sm leading-5 text-black/65">
          {description}
        </p>
      </div>
      <button
        className="mt-8 w-fit rounded-full border border-black bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-uga-lime"
        type="button"
      >
        {action}
      </button>
    </aside>
  );
}
