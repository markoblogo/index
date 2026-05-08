import { connection } from "next/server";
import { HomeHero } from "@/components/ui/home-hero";
import { getFxRates } from "@/lib/fx-rates";
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
  const fxRates = await getFxRates();
  const updatedAt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));

  return (
    <>
      <HomeHero
        commodities={snapshot.commodities}
        fxRates={fxRates}
        labels={{
          analytics: dict.home.viewAnalytics,
          currentValues: dict.home.currentValuesTitle,
          methodology: dict.home.readMore,
          subtitle: dict.home.heroSubtitle,
          trustStrip: dict.home.heroTrustStrip,
          updated: dict.home.updatedLabel,
        }}
        locale={locale}
        updatedAt={updatedAt}
      />
    </>
  );
}
