import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import type { Locale } from "@/lib/i18n";
import { getSpikeMediaHubLiveWindows } from "@/lib/media-hub-monitoring";
import {
  getMediaHubProfile,
  isMediaHubEnabled,
  type MediaHubWindowKey,
  type MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import {
  getLatestPublishedMediaHubReportSummary,
  getMediaHubPublicationPlan,
} from "@/lib/media-hub-publication-scheduler";

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

  const [liveWindows, publishedSummary] = await Promise.all([
    getSpikeMediaHubLiveWindows(locale),
    getLatestPublishedMediaHubReportSummary({
      kind: search.window ? windowToKind(normalizeWindow(search.window)) : undefined,
      locale,
      tenantId: "spike-ua",
    }),
  ]);
  const selectedWindow = search.window
    ? normalizeWindow(search.window)
    : kindToWindow(publishedSummary?.kind ?? getMediaHubPublicationPlan().kind);
  const profile = getMediaHubProfile(locale, selectedWindow);
  const active = liveWindows.find((window) => window.window === selectedWindow) ?? liveWindows[0];
  const activeWithPublishedSummary = applyPublishedSummary(active, publishedSummary);
  const rest = liveWindows.filter((window) => window.window !== active.window);
  const mergedProfile = {
    ...profile,
    windows: [activeWithPublishedSummary, ...rest],
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

function windowToKind(window: MediaHubWindowKey) {
  return window === "week" ? "weekly" : window === "month" ? "monthly" : "daily";
}

function kindToWindow(kind: string | undefined): MediaHubWindowKey {
  return kind === "weekly" ? "week" : kind === "monthly" ? "month" : "day";
}

function applyPublishedSummary(
  window: MediaHubWindowSnapshot,
  summary: Awaited<ReturnType<typeof getLatestPublishedMediaHubReportSummary>>,
): MediaHubWindowSnapshot {
  if (!summary?.summaryBody.length) {
    return window;
  }

  return {
    ...window,
    summaryBody: summary.summaryBody,
    summaryTitle: summary.summaryTitle,
  };
}
