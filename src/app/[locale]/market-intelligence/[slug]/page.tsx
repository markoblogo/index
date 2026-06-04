import { notFound, redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { getPublishedWeeklyEditorialPostBySlug } from "@/lib/weekly-editorial-posts";

export const revalidate = 3600;

export default async function MarketIntelligenceDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;

  const post = await getPublishedWeeklyEditorialPostBySlug(slug, locale);

  if (!post) {
    notFound();
  }
  redirect(`/${locale}/analytics/weekly-reports/${post.relatedReportSlug}`);
}
