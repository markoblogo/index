import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import { PlatformShell } from "@/components/platform/platform-shell";
import { getMediaHubProfile, type MediaHubWindowKey } from "@/lib/media-hub";
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
  const liveWindows = await get1d3xRssWindows();
  const active = liveWindows.find((window) => window.window === selectedWindow) ?? liveWindows[0];
  const rest = liveWindows.filter((window) => window.window !== active.window);
  const mergedProfile = {
    ...profile,
    windows: [active, ...rest],
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
