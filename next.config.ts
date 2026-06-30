import type { NextConfig } from "next";

const allowedEmbedOrigins =
  process.env.ALLOWED_EMBED_ORIGINS ??
  "'self' https://1d3x.com https://www.1d3x.com https://spike.1d3x.com https://pop.1d3x.com http://localhost:* http://127.0.0.1:*";
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
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
        source: "/embed/:path*",
        headers: [
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
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
