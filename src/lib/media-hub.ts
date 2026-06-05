import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";

export function getMediaHubConfig() {
  return getActiveIndexConfig().mediaHub;
}

export function isMediaHubEnabled() {
  return getMediaHubConfig().enabled;
}

export function getMediaHubLocalePolicy(locale: Locale) {
  return getMediaHubConfig().localePolicies.find((policy) => policy.locale === locale) ?? null;
}
