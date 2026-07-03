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
  getMediaHubReportArchive,
  getMediaHubPublicationPlan,
  type MediaHubPublicationKind,
} from "@/lib/media-hub-publication-scheduler";
import { get1d3xRssWindows } from "@/lib/media-hub-rss";
import { isPlatformSite } from "@/lib/platform-site";

export const dynamic = "force-dynamic";

type PlatformMediaHubPageProps = {
  searchParams: Promise<{ date?: string; kind?: string; q?: string; window?: string }>;
};

export default async function PlatformMediaHubPage({
  searchParams,
}: PlatformMediaHubPageProps) {
  if (!isPlatformSite()) {
    redirect("/en/media-hub");
  }

  const search = await searchParams;
  const requestedKind = search.kind ? normalizeKind(search.kind) : undefined;
  const requestedWindow = search.window ? normalizeWindow(search.window) : undefined;
  const requestedDate = normalizeDate(search.date);
  const requestedQuery = normalizeQuery(search.q);
  const summaryKind = requestedKind ?? (requestedWindow ? windowToKind(requestedWindow) : undefined);
  const [liveWindows, publishedSummary, archive] = await Promise.all([
    get1d3xRssWindows(),
    getLatestPublishedMediaHubReportSummary({
      kind: summaryKind,
      locale: "en",
      periodEndDate: requestedDate,
      tenantId: "1d3x",
    }),
    getMediaHubReportArchive({
      date: requestedDate,
      kind: summaryKind,
      locale: "en",
      query: requestedQuery,
      tenantId: "1d3x",
    }),
  ]);
  const selectedWindow = requestedWindow
    ? requestedWindow
    : requestedKind
      ? kindToWindow(requestedKind)
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
        archive={archive}
        archiveQuery={{
          date: requestedDate,
          kind: requestedKind,
          q: requestedQuery,
        }}
        archiveHref={(filter) => {
          const params = new URLSearchParams();
          if (filter.kind) params.set("kind", filter.kind);
          if (filter.date) params.set("date", filter.date);
          if (filter.q) params.set("q", filter.q);
          const query = params.toString();
          return query ? `/media-hub?${query}` : "/media-hub";
        }}
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

function normalizeKind(value: string): Exclude<MediaHubPublicationKind, "none"> {
  return value === "weekly" || value === "monthly" ? value : "daily";
}

function normalizeDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeQuery(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 120) : undefined;
}

function kindToWindow(kind: string | undefined): MediaHubWindowKey {
  return kind === "weekly" ? "week" : kind === "monthly" ? "month" : "day";
}

function applyPublishedSummary(
  window: MediaHubWindowSnapshot,
  summary: { dailyReport?: MediaHubWindowSnapshot["dailyReport"]; kind?: string; periodEndDate?: string; summaryBody: string[]; summaryTitle: string } | null,
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
