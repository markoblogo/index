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
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
                {dict.home.partnerLine}
              </p>
              <h1 className="mt-5 text-6xl font-semibold tracking-tight text-uga-dark sm:text-7xl lg:text-8xl">
                {dict.home.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-black/70">
                {dict.home.description}
              </p>
            </div>

            <aside className="rounded-[1.5rem] border border-black/10 bg-uga-mist p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-uga-green">
                {dict.home.statusLabel}
              </p>
              <dl className="mt-5 grid gap-4 text-sm">
                <div>
                  <dt className="text-black/50">{dict.home.updatedLabel}</dt>
                  <dd className="mt-1 font-semibold text-uga-dark">
                    {updatedAt}
                  </dd>
                </div>
                <div>
                  <dt className="text-black/50">{dict.home.basisLabel}</dt>
                  <dd className="mt-1 font-semibold text-uga-dark">
                    {SITE_CONFIG.defaultDeliveryBasis}
                  </dd>
                </div>
                <div>
                  <dt className="text-black/50">
                    {dict.home.deliveryPeriodLabel}
                  </dt>
                  <dd className="mt-1 font-semibold text-uga-dark">
                    {SITE_CONFIG.defaultDeliveryPeriod}
                  </dd>
                </div>
                <div>
                  <dt className="text-black/50">{dict.home.statusLabel}</dt>
                  <dd className="mt-1 inline-flex rounded-full bg-uga-green px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                    {dict.home.marketOpen}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <SectionHeader
          description={dict.home.description}
          label={dict.home.cardsLabel}
          title={dict.home.cardsLabel}
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <SectionHeader
          description={dict.home.quotesDescription}
          label={dict.home.quotesLabel}
          title={dict.home.quotesTitle}
        />
        <div className="mt-8">
            <LatestQuotesTable
              commodities={snapshot.commodities}
              labels={dict.home.table}
              locale={locale}
              quotes={snapshot.latestQuotes}
            />
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
