import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EverydayIndexDashboard } from "@/components/everyday-index/dashboard";
import { getEverydayIndexDashboard } from "@/lib/everyday-index/dashboard";
import { PlatformLanding } from "@/components/platform/platform-landing";
import {
  detectLocaleFromCountry,
  isLocale,
  LOCALE_COOKIE,
} from "@/lib/i18n";
import { isEverydayIndexSite, isPlatformSite } from "@/lib/platform-site";

export default async function HomeRedirect({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  if (isPlatformSite()) {
    return <PlatformLanding />;
  }

  const headerStore = await headers();

  if (isEverydayIndexSite()) {
    const params = await searchParams;
    const dashboard = await getEverydayIndexDashboard({
      country: params.country ?? null,
      geoCountry: getCountryHeader(headerStore),
    });

    return <EverydayIndexDashboard data={dashboard} />;
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  if (cookieLocale && isLocale(cookieLocale)) {
    redirect(`/${cookieLocale}`);
  }

  const locale = detectLocaleFromCountry(getCountryHeader(headerStore));

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
