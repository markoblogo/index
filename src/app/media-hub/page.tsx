import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import { PlatformShell } from "@/components/platform/platform-shell";
import {
  getMediaHubProfile,
  type MediaHubWindowKey,
  type MediaHubWindowSnapshot,
} from "@/lib/media-hub";
import { getLatestPublishedMediaHubReportSummary } from "@/lib/media-hub-publication-scheduler";
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
  const selectedWindow = normalizeWindow(search.window);
  const profile = getMediaHubProfile("en", selectedWindow);
  const [liveWindows, publishedSummary] = await Promise.all([
    get1d3xRssWindows(),
    getLatestPublishedMediaHubReportSummary({
      kind: windowToKind(selectedWindow),
      locale: "en",
      tenantId: "1d3x",
    }),
  ]);
  const active = liveWindows.find((window) => window.window === selectedWindow) ?? liveWindows[0];
  const activeWithPublishedSummary = applyPublishedSummary(active, publishedSummary);
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
