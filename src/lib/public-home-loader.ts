import type { Locale } from "@/lib/i18n";
import { getFxRates } from "@/lib/fx-rates";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory-lazy";

export async function loadPublicHomePageData(locale: Locale) {
  const activeIndex = getActiveIndexConfig();
  const [snapshot, fxRates, respondentCount] = await Promise.all([
    getPublicIndexSnapshot(),
    getFxRates(),
    getActiveRespondentCountData(),
  ]);
  const updatedAt = new Intl.DateTimeFormat(
    locale === "uk" ? "uk-UA" : "en-US",
    {
      dateStyle: "medium",
    },
  ).format(new Date(snapshot.updatedAt));

  return {
    activeIndex,
    fxRates,
    respondentCount,
    snapshot,
    updatedAt,
  };
}
