import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  getBasketSiteUrl,
  getPlatformSiteUrl,
  isBasketSite,
  isPlatformSite,
  normalizePublicUrl,
} from "@/lib/platform-site";
import "./globals.css";

const platformSite = isPlatformSite();
const basketSite = isBasketSite();
const activeIndex = platformSite || basketSite ? null : getActiveIndexConfig();
const appIcon = basketSite
  ? "/brand/1d-icon.png"
  : platformSite
  ? "/brand/1d-icon.png"
  : activeIndex?.id === "spike-ua"
    ? "/spike-icon.svg"
    : "/icon.png";

export const metadata: Metadata = {
  title: basketSite
    ? {
        default: "1D3X Basket | Consumer basket indices",
        template: "%s | 1D3X Basket",
      }
    : platformSite
    ? {
        default: "1d3x | Local Commodity Index Infrastructure",
        template: "%s | 1d3x",
      }
    : activeIndex?.name,
  description: basketSite
    ? "Big Mac, Starbucks Latte and iPhone prices turned into consumer basket indices for the real world."
    : platformSite
    ? "Commodity index infrastructure for local agricultural markets, built with institutional partners and market leaders."
    : activeIndex?.id === "spike-ua"
      ? "Daily SPIKE SPOT INDEX for export and processing commodity markets."
      : "Daily spot export price index for the Ukrainian Grain Association.",
  keywords: basketSite
    ? [
        "1D3X Basket",
        "Big Mac Index",
        "Starbucks Latte Index",
        "iPhone Index",
        "consumer basket index",
        "global price index",
      ]
    : platformSite
    ? [
        "commodity index infrastructure",
        "agricultural commodity indices",
        "local market benchmarks",
        "agri-market infrastructure",
        "price index platform",
        "1d3x",
      ]
    : undefined,
  alternates: platformSite || basketSite ? { canonical: "/" } : undefined,
  robots: {
    follow: true,
    index: true,
  },
  openGraph: basketSite
    ? {
        description:
          "Big Mac, Starbucks Latte and iPhone prices turned into consumer basket indices for the real world.",
        images: [
          {
            alt: "1D3X Basket",
            height: 1520,
            url: "/basket/assets/og-basket.webp",
            width: 2048,
          },
        ],
        siteName: "1D3X Basket",
        title: "1D3X Basket | Consumer basket indices",
        type: "website",
        url: "/",
      }
    : platformSite
    ? {
        description:
          "1d3x builds local commodity index products with institutional partners and market leaders.",
        images: [
          {
            alt: "1d3x",
            height: 736,
            url: "/brand/1d3x-logo.webp",
            width: 2140,
          },
        ],
        siteName: "1d3x",
        title: "1d3x | Local Commodity Index Infrastructure",
        type: "website",
        url: "/",
      }
    : undefined,
  twitter: basketSite
    ? {
        card: "summary_large_image",
        description:
          "Big Mac, Starbucks Latte and iPhone prices turned into consumer basket indices.",
        images: ["/basket/assets/og-basket.webp"],
        title: "1D3X Basket | Consumer basket indices",
      }
    : platformSite
    ? {
        card: "summary_large_image",
        description:
          "Local commodity index infrastructure built with institutional partners and market leaders.",
        images: ["/brand/1d3x-logo.webp"],
        title: "1d3x | Local Commodity Index Infrastructure",
      }
    : undefined,
  icons: {
    icon: appIcon,
    shortcut: appIcon,
    apple: appIcon,
  },
  metadataBase: new URL(
    basketSite
      ? getBasketSiteUrl()
      : platformSite
      ? getPlatformSiteUrl()
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
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        data-index={basketSite ? "basket" : activeIndex?.theme.dataAttribute ?? "platform"}
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
