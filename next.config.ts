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

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  images: {
    remotePatterns: [
      { hostname: "**", protocol: "https" },
      { hostname: "**", protocol: "http" },
    ],
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
