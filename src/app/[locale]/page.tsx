import { connection } from "next/server";
import Link from "next/link";
import { HomeHero } from "@/components/ui/home-hero";
import { getDictionary, type Locale } from "@/lib/i18n";
import { loadPublicHomePageData } from "@/lib/public-home-loader";

export const dynamic = "force-dynamic";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  await connection();

  const { locale } = await params;
  const dict = getDictionary(locale);
  const { activeIndex, fxRates, respondentCount, snapshot, updatedAt } =
    await loadPublicHomePageData(locale);

  return (
    <>
      <HomeHero
        commodities={snapshot.commodities}
        fxRates={fxRates}
        labels={{
          analytics: dict.home.viewAnalytics,
          currentValues: dict.home.currentValuesTitle,
          methodology: dict.home.readMore,
          subtitle: activeIndex.home.subtitle[locale],
          trustStrip: activeIndex.home.trustStrip[locale],
          updated: dict.home.updatedLabel,
        }}
        locale={locale}
        respondentCount={respondentCount}
        updatedAt={updatedAt}
      />
      {activeIndex.id === "spike-ua" ? <HomeAiBriefBlock locale={locale} /> : null}
    </>
  );
}

function HomeAiBriefBlock({ locale }: { locale: Locale }) {
  const copy =
    locale === "uk"
      ? {
          body:
            "SPIKE додає AI-assisted аналітичний шар поверх опублікованих spot index values. Система читає перевірені рухи індексу, волатильність, спреди та покриття респондентів і формує короткий daily market brief.",
          cta: "Відкрити AI brief",
          disclaimer:
            "AI не встановлює і не коригує офіційні значення індексу. Офіційні значення залишаються методологічними.",
          eyebrow: "AI-assisted market brief",
          title: "AI пояснює ринок, але не замінює методологію",
        }
      : {
          body:
            "SPIKE is adding an AI-assisted analytical layer above published spot index values. The system reads verified index movement, volatility, spreads and respondent coverage, then generates a compact daily market brief.",
          cta: "Open AI brief",
          disclaimer:
            "AI does not set or adjust official index values. Official values remain methodology-driven.",
          eyebrow: "AI-assisted market brief",
          title: "AI explains the market, but does not replace methodology",
        };

  return (
    <section className="bg-[#050505] px-4 py-8 text-[#f8f8f2] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1900px] gap-4 rounded-[1.15rem] border border-white/18 bg-[#101010] px-5 py-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-center lg:px-6">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 max-w-5xl text-2xl font-black uppercase leading-[0.98] tracking-normal text-white sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-6xl text-sm leading-6 text-white/64">
            {copy.body}
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/48">
            {copy.disclaimer}
          </p>
        </div>
        <Link
          className="inline-flex justify-center rounded-full border border-white/22 bg-[#f8f8f2] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#050505] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)]"
          href={`/${locale}/media-hub`}
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
