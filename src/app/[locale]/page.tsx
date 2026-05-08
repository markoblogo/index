import Link from "next/link";
import { connection } from "next/server";
import { HomeHero } from "@/components/ui/home-hero";
import { LatestQuotesTable } from "@/components/ui/latest-quotes-table";
import { MainIndexChart } from "@/components/ui/main-index-chart";
import { PartnerStrip } from "@/components/ui/partner-strip";
import { SectionHeader } from "@/components/ui/section-header";
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
      <HomeHero
        commodities={snapshot.commodities}
        labels={{
          analytics: dict.home.viewAnalytics,
          attribution: dict.home.heroAttribution,
          attributionShort: dict.home.heroAttributionShort,
          currentValues: dict.home.currentValuesTitle,
          liveStatus: dict.home.liveStatus,
          methodology: dict.home.readMore,
          meta: dict.home.heroMeta,
          subtitle: dict.home.heroSubtitle,
          trustStrip: dict.home.heroTrustStrip,
          trustStripShort: dict.home.heroTrustStripShort,
          updated: dict.home.updatedLabel,
        }}
        locale={locale}
        updatedAt={updatedAt}
      />

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
    <article className="rounded-[3px] border border-black bg-uga-dark p-7 text-white">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
      <Link
        className="mt-6 inline-flex rounded-[3px] border border-white bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-uga-lime"
        href={href}
      >
        {label}
      </Link>
    </article>
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
        className="mt-8 w-fit rounded-[3px] border border-black bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-uga-lime"
        type="button"
      >
        {action}
      </button>
    </aside>
  );
}
