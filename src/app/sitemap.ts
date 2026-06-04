import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/constants";
import { locales } from "@/lib/i18n";
import { spikeBlogPosts } from "@/lib/blog-posts";
import { listPublishedWeeklyEditorialPosts } from "@/lib/weekly-editorial-posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.publicSiteUrl.replace(/\/+$/, "");
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) => [
    {
      url: `${baseUrl}/${locale}`,
    },
    {
      url: `${baseUrl}/${locale}/analytics`,
    },
    {
      url: `${baseUrl}/${locale}/blog`,
    },
    {
      url: `${baseUrl}/${locale}/market-intelligence`,
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

  const editorialPosts = await listPublishedWeeklyEditorialPosts();
  const editorialEntries: MetadataRoute.Sitemap = editorialPosts.map((post) => ({
    lastModified: post.publishedAt,
    url: `${baseUrl}/${post.language}/market-intelligence/${post.slug}`,
  }));

  return [...staticEntries, ...blogEntries, ...editorialEntries];
}
