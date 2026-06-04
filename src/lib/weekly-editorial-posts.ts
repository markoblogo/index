import "server-only";

import { SITE_CONFIG } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";
import {
  getPublishedWeeklyReportBySlug,
  getPublishedWeeklyReports,
  type WeeklyReportRecord,
} from "@/lib/weekly-ai-report";

export type WeeklyEditorialPost = {
  canonicalUrl: string;
  coverImage: string | null;
  coverImageAlt: string;
  excerpt: string;
  intro: string;
  language: Locale;
  publishedAt: string;
  relatedReportSlug: string;
  relatedReportTitle: string;
  sections: Array<{ body: string; title: string }>;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  subtitle: string;
  title: string;
  weekEndDate: string;
};

export async function listPublishedWeeklyEditorialPosts(locale?: Locale) {
  const reports = await getPublishedWeeklyReports();
  return reports
    .filter((report) => report.content?.blogDraft)
    .filter((report) => (locale ? report.language === locale : true))
    .map(mapWeeklyReportToEditorialPost)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPublishedWeeklyEditorialPostBySlug(
  slug: string,
  locale?: Locale,
) {
  const reports = await getPublishedWeeklyReports();
  const match = reports.find((report) => {
    const draftSlug = report.content?.blogDraft?.slug;
    if (!draftSlug) {
      return false;
    }
    if (draftSlug !== slug) {
      return false;
    }
    return locale ? report.language === locale : true;
  });

  return match ? mapWeeklyReportToEditorialPost(match) : null;
}

export async function getPublishedWeeklyEditorialPostByReportSlug(
  slug: string,
  locale?: Locale,
) {
  const report = await getPublishedWeeklyReportBySlug(slug);
  if (!report || !report.content?.blogDraft) {
    return null;
  }
  if (locale && report.language !== locale) {
    return null;
  }
  return mapWeeklyReportToEditorialPost(report);
}

function mapWeeklyReportToEditorialPost(report: WeeklyReportRecord): WeeklyEditorialPost {
  const blogDraft = report.content?.blogDraft;
  if (!blogDraft) {
    throw new Error("Weekly editorial post requires blogDraft");
  }

  const baseUrl = SITE_CONFIG.publicSiteUrl.replace(/\/+$/, "");
  const locale = report.language === "uk" ? "uk" : "en";
  const coverImage = report.adminEditedContent?.coverImageUrl?.trim() || null;
  const publishedAt =
    report.publishedAt?.slice(0, 10) ??
    report.publicationDate?.slice(0, 10) ??
    report.weekEndDate;

  return {
    canonicalUrl: `${baseUrl}/${locale}/market-intelligence/${blogDraft.slug}`,
    coverImage,
    coverImageAlt:
      report.adminEditedContent?.coverImageAlt?.trim() || blogDraft.coverAlt,
    excerpt: blogDraft.intro,
    intro: blogDraft.intro,
    language: locale,
    publishedAt,
    relatedReportSlug: report.slug,
    relatedReportTitle: report.title,
    sections: blogDraft.sections,
    seoDescription: blogDraft.seoDescription,
    seoTitle: blogDraft.title,
    slug: blogDraft.slug,
    subtitle: blogDraft.subtitle,
    title: blogDraft.title,
    weekEndDate: report.weekEndDate,
  };
}
