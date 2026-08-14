import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformLanding } from "@/components/platform/platform-landing";
import {
  detectLocaleFromCountry,
  isLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n";
import { isPlatformSite } from "@/lib/platform-site";

export default async function HomeRedirect() {
  const headerStore = await headers();
  const requestHost =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    undefined;

  if (isPlatformSite(requestHost ?? undefined)) {
    return <PlatformLanding />;
  }

  const [cookieStore, requestHeaderStore] = await Promise.all([
    cookies(),
    headers(),
  ]);
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    redirect(`/${cookieLocale}`);
  }

  const locale = detectLocaleFromCountry(getCountryHeader(requestHeaderStore));

  redirect(`/${locale}`);
}

function getCountryHeader(headerStore: Headers) {
  return (
    headerStore.get("x-vercel-ip-country") ??
    headerStore.get("cf-ipcountry") ??
    headerStore.get("cloudfront-viewer-country") ??
    headerStore.get("x-country") ??
    headerStore.get("x-country-code")
  );
}
