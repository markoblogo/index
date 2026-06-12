export const PLATFORM_TENANT_ID = "1d3x";
export const EVERYDAY_INDEX_TENANT_ID = "day";

export type SiteKind = "platform" | "everyday-index" | "index";

export function getSiteKind(): SiteKind {
  const tenant = getRequestedTenant();

  if (
    tenant === PLATFORM_TENANT_ID ||
    tenant === "platform"
  ) {
    return "platform";
  }

  if (
    tenant === EVERYDAY_INDEX_TENANT_ID ||
    tenant === "day-1d3x" ||
    tenant === "everyday-index"
  ) {
    return "everyday-index";
  }

  return "index";
}

export function isPlatformSite() {
  return getSiteKind() === "platform";
}

export function isEverydayIndexSite() {
  return getSiteKind() === "everyday-index";
}

export function getPlatformSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://1d3x.com");
}

export function getEverydayIndexSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://day.1d3x.com");
}

export function normalizePublicUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}

function getRequestedTenant() {
  return process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT;
}
