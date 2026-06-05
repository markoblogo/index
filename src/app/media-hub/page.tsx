import { redirect } from "next/navigation";
import { PublicMediaHub } from "@/components/media-hub/public-media-hub";
import { getMediaHubProfile, type MediaHubWindowKey } from "@/lib/media-hub";
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

  return (
    <PublicMediaHub
      locale="en"
      profile={profile}
      selectedWindow={selectedWindow}
      windowHref={(window) => `/media-hub?window=${window}`}
    />
  );
}

function normalizeWindow(value: string | undefined): MediaHubWindowKey {
  return value === "week" || value === "month" ? value : "day";
}
