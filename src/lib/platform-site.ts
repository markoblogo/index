export const PLATFORM_TENANT_ID = "1d3x";

export function isPlatformSite() {
  const tenant = process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT;

  return tenant === PLATFORM_TENANT_ID || tenant === "platform";
}

export function getPlatformSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://1d3x.com");
}

export function normalizePublicUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}
