import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { locales } from "@/lib/i18n";
import { spikeBlogPosts } from "@/lib/blog-posts";
import { getBasketSiteUrl, getPlatformSiteUrl, isBasketSite, isPlatformSite } from "@/lib/platform-site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isBasketSite()) {
    const baseUrl = getBasketSiteUrl().replace(/\/+$/, "");

    return [
      { url: baseUrl },
      { url: `${baseUrl}/embed/basket/site` },
      { url: `${baseUrl}/embed/basket/chart` },
      { url: `${baseUrl}/embed/basket/cards` },
    ];
  }

  if (isPlatformSite()) {
    const baseUrl = getPlatformSiteUrl().replace(/\/+$/, "");

    return [{ url: baseUrl }, { url: `${baseUrl}/blog` }, { url: `${baseUrl}/media-hub` }];
  }

  const baseUrl = SITE_CONFIG.publicSiteUrl.replace(/\/+$/, "");
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
    },
    {
      url: `${baseUrl}/${locale}/analytics`,
    },
    ...(SITE_CONFIG.tenantId === "spike-ua"
      ? [
          {
            url: `${baseUrl}/${locale}/media-hub`,
          },
        ]
      : []),
    {
      url: `${baseUrl}/${locale}/blog`,
    },
  ]);

  const blogEntries: MetadataRoute.Sitemap =
    SITE_CONFIG.tenantId === "spike-ua"
      ? locales.flatMap((locale) =>
          spikeBlogPosts.map((post) => ({
            lastModified: post.publishedAt,
            url: `${baseUrl}/${locale}/blog/${post.slug}`,
          })),
        )
      : [];

  return [...staticEntries, ...blogEntries];
}
