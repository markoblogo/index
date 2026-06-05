import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { locales } from "@/lib/i18n";
import { spikeBlogPosts } from "@/lib/blog-posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
