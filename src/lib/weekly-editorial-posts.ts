import "server-only";

import { SITE_CONFIG } from "@/lib/constants";
import type { Locale } from "@/lib/i18n";
import {
  getWeeklyEditorialPostRowBySlug,
  listWeeklyEditorialPostRows,
  upsertWeeklyEditorialPostFromSnapshot,
  type WeeklyEditorialPostRow,
} from "@/lib/weekly-editorial-post-storage";
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
  status: "draft" | "published";
  subtitle: string;
  title: string;
  weekEndDate: string;
};

export async function listPublishedWeeklyEditorialPosts(locale?: Locale) {
  let rows = await listWeeklyEditorialPostRows(locale, { onlyPublished: true });
  if (rows.length === 0) {
    const existingRows = await listWeeklyEditorialPostRows(locale);
    if (existingRows.length === 0) {
      await backfillWeeklyEditorialPostsFromPublishedReports(locale);
    }
    rows = await listWeeklyEditorialPostRows(locale, { onlyPublished: true });
  }

  return rows
    .map(mapWeeklyEditorialPostRow)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPublishedWeeklyEditorialPostBySlug(
  slug: string,
  locale?: Locale,
) {
  let row = await getWeeklyEditorialPostRowBySlug(slug, locale, {
    onlyPublished: true,
  });
  if (!row) {
    const existingRows = await listWeeklyEditorialPostRows(locale);
    if (existingRows.length === 0) {
      await backfillWeeklyEditorialPostsFromPublishedReports(locale);
    }
    row = await getWeeklyEditorialPostRowBySlug(slug, locale, {
      onlyPublished: true,
    });
  }

  return row ? mapWeeklyEditorialPostRow(row) : null;
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
    status: "published",
    subtitle: blogDraft.subtitle,
    title: blogDraft.title,
    weekEndDate: report.weekEndDate,
  };
}

function mapWeeklyEditorialPostRow(row: WeeklyEditorialPostRow): WeeklyEditorialPost {
  const locale = row.language === "uk" ? "uk" : "en";
  const baseUrl = SITE_CONFIG.publicSiteUrl.replace(/\/+$/, "");

  return {
    canonicalUrl: `${baseUrl}/${locale}/market-intelligence/${row.slug}`,
    coverImage: row.coverImageUrl?.trim() || null,
    coverImageAlt: row.coverImageAlt?.trim() || row.title,
    excerpt: row.intro,
    intro: row.intro,
    language: locale,
    publishedAt:
      row.publishedAt?.toISOString().slice(0, 10) ??
      row.weekEndDate.toISOString().slice(0, 10),
    relatedReportSlug: row.relatedReportSlug,
    relatedReportTitle: row.relatedReportTitle,
    sections: parseSections(row.sectionsJson),
    seoDescription: row.seoDescription,
    seoTitle: row.title,
    slug: row.slug,
    status: row.status === "published" ? "published" : "draft",
    subtitle: row.subtitle,
    title: row.title,
    weekEndDate: row.weekEndDate.toISOString().slice(0, 10),
  };
}

async function backfillWeeklyEditorialPostsFromPublishedReports(locale?: Locale) {
  const reports = await getPublishedWeeklyReports();
  const eligibleReports = reports
    .filter((report) => report.content?.blogDraft)
    .filter((report) => (locale ? report.language === locale : true));

  for (const report of eligibleReports) {
    await upsertWeeklyEditorialPostFromSnapshot(buildSnapshotFromReport(report), {
      publishedAt:
        report.publishedAt ??
        report.publicationDate ??
        `${report.weekEndDate}T00:00:00.000Z`,
      status: "published",
    });
  }
}

function buildSnapshotFromReport(report: WeeklyReportRecord) {
  const blogDraft = report.content?.blogDraft;
  if (!blogDraft) {
    throw new Error("Weekly editorial post requires blogDraft");
  }

  return {
    coverImageAlt:
      report.adminEditedContent?.coverImageAlt?.trim() || blogDraft.coverAlt,
    coverImageUrl: report.adminEditedContent?.coverImageUrl?.trim() || null,
    intro: blogDraft.intro,
    language: report.language,
    relatedReportId: report.id,
    relatedReportSlug: report.slug,
    relatedReportTitle: report.title,
    sections: blogDraft.sections,
    seoDescription: blogDraft.seoDescription,
    slug: blogDraft.slug,
    subtitle: blogDraft.subtitle,
    title: blogDraft.title,
    weekEndDate: report.weekEndDate,
  };
}

function parseSections(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const body = typeof entry.body === "string" ? entry.body.trim() : "";
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      return body && title ? { body, title } : null;
    })
    .filter((entry): entry is { body: string; title: string } => Boolean(entry));
}
