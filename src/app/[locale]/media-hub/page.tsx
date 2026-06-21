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
  getMediaHubReportArchive,
  getMediaHubPublicationPlan,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";

export const dynamic = "force-dynamic";

type MediaHubPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ date?: string; kind?: string; window?: string }>;
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

  const requestedKind = search.kind ? normalizeKind(search.kind) : undefined;
  const requestedWindow = search.window ? normalizeWindow(search.window) : undefined;
  const requestedDate = normalizeDate(search.date);
  const summaryKind = requestedKind ?? (requestedWindow ? windowToKind(requestedWindow) : undefined);
  const [liveWindows, publishedSummary, archive] = await Promise.all([
    getSpikeMediaHubLiveWindows(locale),
    getLatestPublishedMediaHubReportSummary({
      kind: summaryKind,
      locale,
      periodEndDate: requestedDate,
      tenantId: "spike-ua",
    }),
    getMediaHubReportArchive({
      kind: summaryKind,
      locale,
      tenantId: "spike-ua",
    }),
  ]);
  const selectedWindow = requestedWindow
    ? requestedWindow
    : requestedKind
      ? kindToWindow(requestedKind)
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
      archive={archive}
      archiveHref={(filter) => {
        const params = new URLSearchParams();
        if (filter.kind) params.set("kind", filter.kind);
        if (filter.date) params.set("date", filter.date);
        const query = params.toString();
        return query ? `/${locale}/media-hub?${query}` : `/${locale}/media-hub`;
      }}
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

function normalizeKind(value: string): Exclude<MediaHubPublicationKind, "none"> {
  return value === "weekly" || value === "monthly" ? value : "daily";
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
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
    dailyReport: summary.dailyReport,
    summaryBody: summary.summaryBody,
    summaryTitle: summary.summaryTitle,
  };
}
