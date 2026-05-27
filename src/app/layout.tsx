import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  getPlatformSiteUrl,
  isPlatformSite,
  normalizePublicUrl,
} from "@/lib/platform-site";
import "./globals.css";

const platformSite = isPlatformSite();
const activeIndex = platformSite ? null : getActiveIndexConfig();
const appIcon = platformSite
  ? "/brand/1d-icon.png"
  : activeIndex?.id === "spike-ua"
    ? "/spike-icon.svg"
    : "/icon.png";

export const metadata: Metadata = {
  title: platformSite
    ? {
        default: "1d3x | Local Commodity Index Infrastructure",
        template: "%s | 1d3x",
      }
    : activeIndex?.name,
  description: platformSite
    ? "Commodity index infrastructure for local agricultural markets, built with institutional partners and market leaders."
    : activeIndex?.id === "spike-ua"
      ? "Daily SPIKE SPOT INDEX for export and processing commodity markets."
      : "Daily spot export price index for the Ukrainian Grain Association.",
  keywords: platformSite
    ? [
        "commodity index infrastructure",
        "agricultural commodity indices",
        "local market benchmarks",
        "agri-market infrastructure",
        "price index platform",
        "1d3x",
      ]
    : undefined,
  alternates: platformSite ? { canonical: "/" } : undefined,
  robots: {
    follow: true,
    index: true,
  },
  openGraph: platformSite
    ? {
        description:
          "1d3x builds local commodity index products with institutional partners and market leaders.",
        images: [
          {
            alt: "1d3x",
            height: 736,
            url: "/brand/1d3x-logo.png",
            width: 2140,
          },
        ],
        siteName: "1d3x",
        title: "1d3x | Local Commodity Index Infrastructure",
        type: "website",
        url: "/",
      }
    : undefined,
  twitter: platformSite
    ? {
        card: "summary_large_image",
        description:
          "Local commodity index infrastructure built with institutional partners and market leaders.",
        images: ["/brand/1d3x-logo.png"],
        title: "1d3x | Local Commodity Index Infrastructure",
      }
    : undefined,
  icons: {
    icon: appIcon,
    shortcut: appIcon,
    apple: appIcon,
  },
  metadataBase: new URL(
    platformSite
      ? getPlatformSiteUrl()
      : normalizePublicUrl(
          process.env.NEXT_PUBLIC_SITE_URL,
          "https://uga.1d3x.com",
        ),
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        data-index={activeIndex?.theme.dataAttribute ?? "platform"}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('uga_theme');
                  var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.dataset.theme = theme;
                } catch (_) {
                  document.documentElement.dataset.theme = 'light';
                }
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
