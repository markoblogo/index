import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getPlatformSiteUrl, isPlatformSite, normalizePublicUrl } from "@/lib/platform-site";
import "./globals.css";

const platformSite = isPlatformSite();
const activeIndex = platformSite ? null : getActiveIndexConfig();
const appIcon = activeIndex?.id === "spike-ua" ? "/spike-icon.svg" : "/icon.png";

export const metadata: Metadata = {
  title: platformSite ? "1d3x" : activeIndex?.name,
  description: platformSite
    ? "Commodity index infrastructure for local agricultural markets, built with institutional partners and market leaders."
    : activeIndex?.id === "spike-ua"
      ? "Daily SPIKE SPOT INDEX for export and processing commodity markets."
      : "Daily spot export price index for the Ukrainian Grain Association.",
  icons: {
    icon: appIcon,
    shortcut: appIcon,
    apple: appIcon,
  },
  metadataBase: new URL(
    platformSite
      ? getPlatformSiteUrl()
      : normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL, "https://uga.1d3x.com"),
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" data-index={activeIndex?.theme.dataAttribute ?? "platform"}>
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
