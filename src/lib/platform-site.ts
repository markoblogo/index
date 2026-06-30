export const PLATFORM_TENANT_ID = "1d3x";
export const BASKET_TENANT_ID = "1d3x-basket";

export function isPlatformSite() {
  const tenant = process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT;

  return tenant === PLATFORM_TENANT_ID || tenant === "platform";
}

export function isBasketSite() {
  const tenant = process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT;

  return tenant === BASKET_TENANT_ID || tenant === "basket" || tenant === "pop";
}

export function getPlatformSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://1d3x.com");
}

export function getBasketSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://pop.1d3x.com");
}

export function normalizePublicUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}
