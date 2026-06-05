import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import type { Locale } from "@/lib/i18n";
import { getSpikeMediaHubLiveWindows } from "@/lib/media-hub-monitoring";
import {
  getMediaHubProfile,
  isMediaHubEnabled,
  type MediaHubWindowKey,
} from "@/lib/media-hub";

export const revalidate = 3600;

type MediaHubPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ window?: string }>;
};

export default async function MediaHubPage({
  params,
  searchParams,
}: MediaHubPageProps) {
  const { locale } = await params;
  const search = await searchParams;

  if (!isMediaHubEnabled()) {
    redirect(`/${locale}/analytics`);
  }

  const selectedWindow = normalizeWindow(search.window);
  const profile = getMediaHubProfile(locale, selectedWindow);
  const liveWindows = await getSpikeMediaHubLiveWindows(locale);
  const active = liveWindows.find((window) => window.window === selectedWindow) ?? liveWindows[0];
  const rest = liveWindows.filter((window) => window.window !== active.window);
  const mergedProfile = {
    ...profile,
    windows: [active, ...rest],
  };

  return (
    <PublicMediaHub
      locale={locale}
      profile={mergedProfile}
      selectedWindow={selectedWindow}
      windowHref={(window) => `/${locale}/media-hub?window=${window}`}
    />
  );
}

function normalizeWindow(value: string | undefined): MediaHubWindowKey {
  return value === "week" || value === "month" ? value : "day";
}
