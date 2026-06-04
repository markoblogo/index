import "server-only";

import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/constants";

export type WeeklyEditorialPostSnapshot = {
  coverImageAlt: string;
  coverImageUrl: string | null;
  intro: string;
  language: string;
  relatedReportId: string;
  relatedReportSlug: string;
  relatedReportTitle: string;
  sections: Array<{ body: string; title: string }>;
  seoDescription: string;
  slug: string;
  subtitle: string;
  title: string;
  weekEndDate: string;
};

export type WeeklyEditorialPostRow = {
  coverImageAlt: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
  id: string;
  intro: string;
  language: string;
  publishedAt: Date | null;
  relatedReportId: string;
  relatedReportSlug: string;
  relatedReportTitle: string;
  sectionsJson: unknown;
  seoDescription: string;
  slug: string;
  status: string;
  subtitle: string;
  title: string;
  updatedAt: Date;
  weekEndDate: Date;
};

let weeklyEditorialStorageReady: Promise<void> | null = null;

export async function ensureWeeklyEditorialPostStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  weeklyEditorialStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WeeklyEditorialPost" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "relatedReportId" TEXT NOT NULL,
        "relatedReportSlug" TEXT NOT NULL,
        "relatedReportTitle" TEXT NOT NULL,
        "weekEndDate" DATE NOT NULL,
        "language" TEXT NOT NULL DEFAULT 'uk',
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "subtitle" TEXT NOT NULL DEFAULT '',
        "intro" TEXT NOT NULL DEFAULT '',
        "sectionsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "seoDescription" TEXT NOT NULL DEFAULT '',
        "coverImageUrl" TEXT,
        "coverImageAlt" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "publishedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WeeklyEditorialPost_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      ALTER TABLE "WeeklyEditorialPost"
      ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft'
    `);
    await db.$executeRawUnsafe(`
      ALTER TABLE "WeeklyEditorialPost"
      ALTER COLUMN "publishedAt" DROP NOT NULL
    `);
    await db.$executeRawUnsafe(`
      UPDATE "WeeklyEditorialPost"
      SET "status" = 'published'
      WHERE "status" IS NULL OR "status" = ''
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyEditorialPost_tenantId_report_key"
      ON "WeeklyEditorialPost"("tenantId", "relatedReportId")
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyEditorialPost_tenantId_language_slug_key"
      ON "WeeklyEditorialPost"("tenantId", "language", "slug")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "WeeklyEditorialPost_tenantId_language_publishedAt_idx"
      ON "WeeklyEditorialPost"("tenantId", "language", "publishedAt" DESC)
    `);
  })();

  await weeklyEditorialStorageReady;
}

export async function upsertWeeklyEditorialPostFromSnapshot(
  snapshot: WeeklyEditorialPostSnapshot,
  options: {
    preserveStatus?: boolean;
    publishedAt?: string | null;
    status?: "draft" | "published";
  } = {},
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyEditorialPostStorage();
  const tenantId = SITE_CONFIG.tenantId;
  const postId = `weekly-editorial:${snapshot.relatedReportId}`;
  const existing = await getWeeklyEditorialPostRowByReportId(snapshot.relatedReportId);
  const nextStatus =
    options.status ??
    (options.preserveStatus
      ? normalizeEditorialStatus(existing?.status)
      : "draft");
  const nextPublishedAt =
    nextStatus === "published"
      ? options.publishedAt ?? existing?.publishedAt?.toISOString() ?? new Date().toISOString()
      : null;
  await db.$executeRawUnsafe(
    `
      INSERT INTO "WeeklyEditorialPost" (
        "id",
        "tenantId",
        "relatedReportId",
        "relatedReportSlug",
        "relatedReportTitle",
        "weekEndDate",
        "language",
        "slug",
        "title",
        "subtitle",
        "intro",
        "sectionsJson",
        "seoDescription",
        "coverImageUrl",
        "coverImageAlt",
        "status",
        "publishedAt",
        "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::date, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17::timestamp, NOW()
      )
      ON CONFLICT ("tenantId", "relatedReportId")
      DO UPDATE SET
        "relatedReportSlug" = EXCLUDED."relatedReportSlug",
        "relatedReportTitle" = EXCLUDED."relatedReportTitle",
        "weekEndDate" = EXCLUDED."weekEndDate",
        "language" = EXCLUDED."language",
        "slug" = EXCLUDED."slug",
        "title" = EXCLUDED."title",
        "subtitle" = EXCLUDED."subtitle",
        "intro" = EXCLUDED."intro",
        "sectionsJson" = EXCLUDED."sectionsJson",
        "seoDescription" = EXCLUDED."seoDescription",
        "coverImageUrl" = EXCLUDED."coverImageUrl",
        "coverImageAlt" = EXCLUDED."coverImageAlt",
        "status" = EXCLUDED."status",
        "publishedAt" = EXCLUDED."publishedAt",
        "updatedAt" = NOW()
    `,
    postId,
    tenantId,
    snapshot.relatedReportId,
    snapshot.relatedReportSlug,
    snapshot.relatedReportTitle,
    snapshot.weekEndDate,
    snapshot.language,
    snapshot.slug,
    snapshot.title,
    snapshot.subtitle,
    snapshot.intro,
    JSON.stringify(snapshot.sections),
    snapshot.seoDescription,
    snapshot.coverImageUrl,
    snapshot.coverImageAlt,
    nextStatus,
    nextPublishedAt,
  );

  revalidateWeeklyEditorialPostViews(snapshot.language, snapshot.slug);
  return getWeeklyEditorialPostRowByReportId(snapshot.relatedReportId);
}

export async function listWeeklyEditorialPostRows(
  language?: string,
  options: { onlyPublished?: boolean } = {},
) {
  if (!hasDatabaseUrl()) {
    return [];
  }

  await ensureWeeklyEditorialPostStorage();
  const publishedFilter = options.onlyPublished
    ? ` AND "status" = 'published'`
    : "";
  if (language) {
    return db.$queryRawUnsafe<WeeklyEditorialPostRow[]>(
      `
        SELECT *
        FROM "WeeklyEditorialPost"
        WHERE "tenantId" = $1
          AND "language" = $2
          ${publishedFilter}
        ORDER BY "publishedAt" DESC
      `,
      SITE_CONFIG.tenantId,
      language,
    );
  }

  return db.$queryRawUnsafe<WeeklyEditorialPostRow[]>(
    `
      SELECT *
      FROM "WeeklyEditorialPost"
      WHERE "tenantId" = $1
      ${publishedFilter}
      ORDER BY "publishedAt" DESC
    `,
    SITE_CONFIG.tenantId,
  );
}

export async function getWeeklyEditorialPostRowBySlug(
  slug: string,
  language?: string,
  options: { onlyPublished?: boolean } = {},
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyEditorialPostStorage();
  const publishedFilter = options.onlyPublished
    ? ` AND "status" = 'published'`
    : "";
  const rows = language
    ? await db.$queryRawUnsafe<WeeklyEditorialPostRow[]>(
        `
          SELECT *
          FROM "WeeklyEditorialPost"
          WHERE "tenantId" = $1
            AND "slug" = $2
            AND "language" = $3
            ${publishedFilter}
          ORDER BY "publishedAt" DESC
          LIMIT 1
        `,
        SITE_CONFIG.tenantId,
        slug,
        language,
      )
    : await db.$queryRawUnsafe<WeeklyEditorialPostRow[]>(
        `
          SELECT *
          FROM "WeeklyEditorialPost"
          WHERE "tenantId" = $1
            AND "slug" = $2
            ${publishedFilter}
          ORDER BY "publishedAt" DESC
          LIMIT 1
        `,
        SITE_CONFIG.tenantId,
        slug,
      );

  return rows[0] ?? null;
}

export async function getWeeklyEditorialPostRowByReportId(reportId: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureWeeklyEditorialPostStorage();
  const rows = await db.$queryRawUnsafe<WeeklyEditorialPostRow[]>(
    `
      SELECT *
      FROM "WeeklyEditorialPost"
      WHERE "tenantId" = $1
        AND "relatedReportId" = $2
      LIMIT 1
    `,
    SITE_CONFIG.tenantId,
    reportId,
  );
  return rows[0] ?? null;
}

export async function publishWeeklyEditorialPostByReportId(reportId: string) {
  const row = await getWeeklyEditorialPostRowByReportId(reportId);
  if (!row) {
    return null;
  }

  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyEditorialPost"
      SET "status" = 'published',
          "publishedAt" = COALESCE("publishedAt", NOW()),
          "updatedAt" = NOW()
      WHERE "tenantId" = $1
        AND "relatedReportId" = $2
    `,
    SITE_CONFIG.tenantId,
    reportId,
  );

  revalidateWeeklyEditorialPostViews(row.language, row.slug);
  return getWeeklyEditorialPostRowByReportId(reportId);
}

export async function unpublishWeeklyEditorialPostByReportId(reportId: string) {
  const row = await getWeeklyEditorialPostRowByReportId(reportId);
  if (!row) {
    return null;
  }

  await db.$executeRawUnsafe(
    `
      UPDATE "WeeklyEditorialPost"
      SET "status" = 'draft',
          "updatedAt" = NOW()
      WHERE "tenantId" = $1
        AND "relatedReportId" = $2
    `,
    SITE_CONFIG.tenantId,
    reportId,
  );

  revalidateWeeklyEditorialPostViews(row.language, row.slug);
  return getWeeklyEditorialPostRowByReportId(reportId);
}

function normalizeEditorialStatus(value: string | null | undefined) {
  return value === "published" ? "published" : "draft";
}

function revalidateWeeklyEditorialPostViews(language: string, slug: string) {
  const locale = language === "uk" ? "uk" : "en";
  revalidatePath(`/${locale}/market-intelligence`);
  revalidatePath(`/${locale}/market-intelligence/${slug}`);
  revalidatePath("/sitemap.xml");
}
