import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getActiveIndexConfig } from "@/lib/index-platform";
import "./globals.css";

const activeIndex = getActiveIndexConfig();

export const metadata: Metadata = {
  title: activeIndex.name,
  description:
    activeIndex.id === "spike-ua"
      ? "Daily SPIKE Spot Commodity Index Ukraine for export and processing commodity markets."
      : "Daily spot export price index demo for the Ukrainian Grain Association.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" data-index={activeIndex.theme.dataAttribute}>
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
