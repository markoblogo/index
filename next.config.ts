import type { NextConfig } from "next";

const allowedEmbedOrigins =
  process.env.ALLOWED_EMBED_ORIGINS ??
  "'self' http://localhost:* http://127.0.0.1:*";
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
const baselineSecurityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];
const defaultImageRemoteHosts = [
  "1d3x.com",
  "spike.1d3x.com",
  "uga.1d3x.com",
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "github.com",
];

export function buildImageRemotePatterns(extraHosts = process.env.NEXT_IMAGE_ALLOWED_HOSTS) {
  return [...new Set([...defaultImageRemoteHosts, ...parseImageRemoteHosts(extraHosts)])]
    .map((hostname) => ({
      hostname,
      protocol: "https" as const,
    }));
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
  async headers() {
    const frameAncestors = allowedEmbedOrigins.includes("'self'")
      ? allowedEmbedOrigins
      : `'self' ${allowedEmbedOrigins}`;

    return [
      {
        source: "/:path*",
        headers: baselineSecurityHeaders,
      },
      {
        source: "/embed/:path*",
        headers: [
          ...baselineSecurityHeaders,
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "connect-src 'self'",
              `frame-ancestors ${frameAncestors}`,
              "base-uri 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

function parseImageRemoteHosts(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => normalizeImageRemoteHost(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeImageRemoteHost(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).hostname;
    }
  } catch {
    return "";
  }

  const host = trimmed.split("/")[0];
  if (!/^[a-z0-9.*-]+$/.test(host)) return "";
  if (host === "**" || host === "*") return "";
  return host;
}
