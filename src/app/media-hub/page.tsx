import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getMediaHubProfile,
  type MediaHubWindowKey,
  type MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import {
  getLatestPublishedMediaHubReportSummary,
  getMediaHubPublicationPlan,
} from "@/lib/media-hub-publication-scheduler";
import { get1d3xRssWindows } from "@/lib/media-hub-rss";
import { isPlatformSite } from "@/lib/platform-site";

export const revalidate = 3600;

type PlatformMediaHubPageProps = {
  searchParams: Promise<{ window?: string }>;
};

export default async function PlatformMediaHubPage({
  searchParams,
}: PlatformMediaHubPageProps) {
  if (!isPlatformSite()) {
    redirect("/en/media-hub");
  }

  const search = await searchParams;
  const [liveWindows, publishedSummary] = await Promise.all([
    get1d3xRssWindows(),
    getLatestPublishedMediaHubReportSummary({
      kind: search.window ? windowToKind(normalizeWindow(search.window)) : undefined,
      locale: "en",
      tenantId: "1d3x",
    }),
  ]);
  const selectedWindow = search.window
    ? normalizeWindow(search.window)
    : kindToWindow(publishedSummary?.kind ?? getMediaHubPublicationPlan().kind);
  const profile = getMediaHubProfile("en", selectedWindow);
  const active = liveWindows.find((window) => window.window === selectedWindow) ?? liveWindows[0];
  const activeWithPublishedSummary = applyPublishedSummary(
    active,
    publishedSummary ?? buildLiveFallbackReport(active, selectedWindow),
  );
  const rest = liveWindows.filter((window) => window.window !== active.window);
  const mergedProfile = {
    ...profile,
    windows: [activeWithPublishedSummary, ...rest],
  };

  return (
    <PlatformShell>
      <PublicMediaHub
        locale="en"
        profile={mergedProfile}
        selectedWindow={selectedWindow}
        windowHref={(window) => `/media-hub?window=${window}`}
      />
    </PlatformShell>
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
  summary: { kind?: string; summaryBody: string[]; summaryTitle: string } | null,
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

function buildLiveFallbackReport(
  window: MediaHubWindowSnapshot,
  selectedWindow: MediaHubWindowKey,
) {
  const periodLabel = formatFallbackPeriodLabel(selectedWindow);
  const title =
    selectedWindow === "day"
      ? `Daily report · ${periodLabel}`
      : selectedWindow === "week"
        ? `Weekly report · ${periodLabel}`
        : `Monthly report · ${periodLabel}`;

  return {
    summaryBody: window.summaryBody,
    summaryTitle: title,
  };
}

function formatFallbackPeriodLabel(window: MediaHubWindowKey) {
  const now = new Date();
  const end = new Date(now);

  if (window === "day") {
    end.setDate(end.getDate() - 1);
  }

  if (window === "week") {
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  if (window === "month") {
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }

  return formatShortDate(end);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(date);
}
