export const PLATFORM_TENANT_ID = "1d3x";

const PLATFORM_DOMAINS = [
  "1d3x",
  "day.1d3x.com",
];

const SPIKE_DOMAINS = [
  "spike",
  "pop",
  "uga",
  "index-uga",
  "index.uga",
  "1d3x-basket",
  "basket",
];

function getHost(value?: string) {
  if (!value) return "";
  try {
    const normalized = value
      .split(",")
      .map((item) => item.trim())
      .find((item) => item.length > 0) ?? "";

    if (!normalized) return "";

    const candidate = normalized.includes("://")
      ? normalized
      : `https://${normalized}`;
    return new URL(candidate).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isPlatformByHost(host: string) {
  if (SPIKE_DOMAINS.some((needle) => host.includes(needle))) {
    return false;
  }

  if (PLATFORM_DOMAINS.some((needle) => host.includes(needle))) {
    return true;
  }

  return false;
}

export function isPlatformSite(requestHost?: string) {
  const tenant = process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT;
  const host = getHost(requestHost ?? process.env.NEXT_PUBLIC_SITE_URL);

  if (host) {
    return isPlatformByHost(host) &&
      !(tenant === "spike-ua" || tenant === "uga-ua");
  }

  return tenant === PLATFORM_TENANT_ID || tenant === "platform";
}

export function getPlatformSiteUrl() {
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://1d3x.com");
}

export function normalizePublicUrl(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}
