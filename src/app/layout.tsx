import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  getEverydayIndexSiteUrl,
  getPlatformSiteUrl,
  getSiteKind,
  isEverydayIndexSite,
  isPlatformSite,
  normalizePublicUrl,
} from "@/lib/platform-site";
import "./globals.css";

const platformSite = isPlatformSite();
const everydayIndexSite = isEverydayIndexSite();
const activeIndex = platformSite || everydayIndexSite ? null : getActiveIndexConfig();
const appIcon = platformSite
  ? "/brand/1d-icon.png"
  : everydayIndexSite
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
    : everydayIndexSite
      ? {
          default: "Everyday Index | 1d3x",
          template: "%s | Everyday Index",
        }
    : activeIndex?.name,
  description: platformSite
    ? "Commodity index infrastructure for local agricultural markets, built with institutional partners and market leaders."
    : everydayIndexSite
      ? "Everyday Index is a lightweight consumer-price dashboard for burger, latte and iPhone affordability signals across countries."
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
    : everydayIndexSite
      ? {
          description:
            "Consumer price and affordability signals across countries, published only from automatically verified sources.",
          images: [
            {
              alt: "Everyday Index",
              height: 736,
              url: "/brand/1d3x-logo.png",
              width: 2140,
            },
          ],
          siteName: "Everyday Index",
          title: "Everyday Index | 1d3x",
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
    : everydayIndexSite
      ? {
          card: "summary_large_image",
          description:
            "A consumer-price dashboard for burger, latte and iPhone signals across countries.",
          images: ["/brand/1d3x-logo.png"],
          title: "Everyday Index | 1d3x",
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
      : everydayIndexSite
        ? getEverydayIndexSiteUrl()
      : normalizePublicUrl(
          process.env.NEXT_PUBLIC_SITE_URL,
          "https://index.uga.ua",
        ),
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const siteKind = getSiteKind();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        data-index={siteKind === "everyday-index" ? "day" : activeIndex?.theme.dataAttribute ?? "platform"}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (document.body.dataset.index === 'day' || document.body.dataset.index === 'platform' || document.body.dataset.index === 'spike') {
                    document.documentElement.dataset.theme = 'light';
                    return;
                  }
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
