import type { Locale } from "@/lib/i18n";
import { getFxRates } from "@/lib/fx-rates";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";

export async function loadPublicHomePageData(
  locale: Locale,
  requestHost?: string,
) {
  const activeIndex = getActiveIndexConfig(requestHost);
  const [snapshot, fxRates, respondentCount] = await Promise.all([
    getPublicIndexSnapshot(),
    getFxRates(),
    getActiveRespondentCountData(),
  ]);
  const latestQuoteDate =
    activeIndex.id === "spike-ua"
      ? snapshot.latestQuotes
          .map((quote) => quote.date)
          .sort((first, second) => second.localeCompare(first))[0] ?? null
      : null;
  const updatedAt = new Intl.DateTimeFormat(
    locale === "uk" ? "uk-UA" : "en-US",
    {
      dateStyle: "medium",
    },
  ).format(
    new Date(
      latestQuoteDate
        ? `${latestQuoteDate}T00:00:00.000Z`
        : snapshot.updatedAt,
    ),
  );

  return {
    activeIndex,
    fxRates,
    respondentCount,
    snapshot,
    updatedAt,
  };
}
