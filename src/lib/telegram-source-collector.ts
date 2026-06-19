import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  getReportWorkspaceConfig,
  listReportWorkspaceResources,
  type ReportKind,
  type ReportWorkspaceResource,
} from "@/lib/report-workspace";
import { getActiveIndexConfig } from "@/lib/index-platform";

type StoredTelegramPostRow = {
  channelHandle: string;
  channelTitle: string | null;
  createdAt: Date;
  externalPostId: string;
  fetchedAt: Date;
  id: string;
  included: boolean;
  peerId: string | null;
  postUrl: string;
  publishedAt: Date;
  rawHtml: string | null;
  text: string;
  textHash: string;
  updatedAt: Date;
};

export type TelegramCollectedPost = {
  channelHandle: string;
  channelTitle: string;
  externalPostId: string;
  id: string;
  included: boolean;
  peerId: string | null;
  postUrl: string;
  publishedAt: string;
  text: string;
};

export type TelegramSourceDigest = {
  channels: Array<{
    channelHandle: string;
    channelTitle: string;
    excludedPostCount: number;
    includedPostCount: number;
    peerId: string | null;
    postCount: number;
    posts: TelegramCollectedPost[];
  }>;
  endAt: string;
  postCount: number;
  signature: string;
  startAt: string;
};

type ParsedTelegramChannelPost = {
  channelHandle: string;
  channelTitle: string;
  externalPostId: string;
  postUrl: string;
  publishedAt: string;
  rawHtml: string;
  text: string;
};

let storageReady: Promise<void> | null = null;

export async function syncTelegramWorkspaceResources(
  reportKind: ReportKind,
  options: {
    maxPagesPerChannel?: number;
    reportId?: string | null;
    until?: Date;
  } = {},
) {
  if (!hasDatabaseUrl()) {
    return { channels: 0, posts: 0, skippedReason: "database_not_configured" };
  }

  await ensureTelegramCollectorStorage();
  const resources = await listReportWorkspaceResources({
    reportId: options.reportId ?? null,
    reportKind,
  });
  const telegramSources = dedupeTelegramResources(resources);
  let posts = 0;

  for (const source of telegramSources) {
    try {
      const result = await syncTelegramChannel(source, {
        maxPages: options.maxPagesPerChannel ?? 12,
        until: options.until,
      });
      posts += result.posts;
    } catch {
      continue;
    }
  }

  return { channels: telegramSources.length, posts, skippedReason: null };
}

export async function getDailyTelegramDigest(
  date: string,
  options: { sync?: boolean } = {},
) {
  const config = await getReportWorkspaceConfig("daily");
  const [startAt, endAt] = buildDailyWindow(date, config.reviewStartsAt, config.timezone);
  if (options.sync ?? true) {
    await syncTelegramWorkspaceResources("daily", { until: endAt });
  }
  return getTelegramDigestForWindow("daily", startAt, endAt);
}

export async function getWeeklyTelegramDigest(
  weekEndDate: string,
  reportId?: string | null,
  options: { sync?: boolean } = {},
) {
  const config = await getReportWorkspaceConfig("weekly");
  const [startAt, endAt] = buildWeeklyWindow(
    weekEndDate,
    config.reviewStartsAt,
    config.timezone,
  );
  if (options.sync ?? true) {
    await syncTelegramWorkspaceResources("weekly", { reportId, until: endAt });
  }
  return getTelegramDigestForWindow("weekly", startAt, endAt, reportId ?? null);
}

export async function syncTelegramResourcesForWindow(input: {
  resources: ReportWorkspaceResource[];
  until?: Date;
  maxPagesPerChannel?: number;
}) {
  if (!hasDatabaseUrl()) {
    return { channels: 0, posts: 0, skippedReason: "database_not_configured" };
  }

  await ensureTelegramCollectorStorage();
  const telegramSources = dedupeTelegramResources(input.resources);
  let posts = 0;

  for (const source of telegramSources) {
    try {
      const result = await syncTelegramChannel(source, {
        maxPages: input.maxPagesPerChannel ?? 12,
        until: input.until,
      });
      posts += result.posts;
    } catch {
      continue;
    }
  }

  return { channels: telegramSources.length, posts, skippedReason: null };
}

export async function getTelegramDigestForResourcesWindow(input: {
  endAt: Date;
  resources: ReportWorkspaceResource[];
  startAt: Date;
  syncUntil?: Date;
}) {
  if (input.syncUntil) {
    await syncTelegramResourcesForWindow({
      maxPagesPerChannel: 12,
      resources: input.resources,
      until: input.syncUntil,
    });
  }

  return getTelegramDigestForResources(input.resources, input.startAt, input.endAt);
}

export async function setTelegramCollectedPostIncluded(
  id: string,
  included: boolean,
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureTelegramCollectorStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "TelegramCollectedPost"
      SET "included" = $3,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    id,
    included,
  );

  revalidateTelegramCollectorViews();
  return { id, included };
}

export async function setTelegramCollectedPostsIncludedForChannel(input: {
  channelHandle: string;
  endAt: string;
  included: boolean;
  startAt: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureTelegramCollectorStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "TelegramCollectedPost"
      SET "included" = $5,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1
        AND "channelHandle" = $2
        AND "publishedAt" >= $3
        AND "publishedAt" < $4
    `,
    getActiveIndexConfig().id,
    input.channelHandle,
    input.startAt,
    input.endAt,
    input.included,
  );

  revalidateTelegramCollectorViews();
  return {
    channelHandle: input.channelHandle,
    included: input.included,
  };
}

export async function resetTelegramCollectedPostsIncludedForWindow(input: {
  endAt: string;
  startAt: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureTelegramCollectorStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "TelegramCollectedPost"
      SET "included" = TRUE,
          "updatedAt" = NOW()
      WHERE "tenantId" = $1
        AND "publishedAt" >= $2
        AND "publishedAt" < $3
    `,
    getActiveIndexConfig().id,
    input.startAt,
    input.endAt,
  );

  revalidateTelegramCollectorViews();
  return {
    endAt: input.endAt,
    startAt: input.startAt,
  };
}

async function getTelegramDigestForWindow(
  reportKind: ReportKind,
  startAt: Date,
  endAt: Date,
  reportId?: string | null,
): Promise<TelegramSourceDigest> {
  if (!hasDatabaseUrl()) {
    return { channels: [], endAt: endAt.toISOString(), postCount: 0, signature: "empty", startAt: startAt.toISOString() };
  }

  await ensureTelegramCollectorStorage();
  const resources = await listReportWorkspaceResources({ reportId, reportKind });
  return getTelegramDigestForResources(resources, startAt, endAt);
}

async function getTelegramDigestForResources(
  resources: ReportWorkspaceResource[],
  startAt: Date,
  endAt: Date,
): Promise<TelegramSourceDigest> {
  if (!hasDatabaseUrl()) {
    return { channels: [], endAt: endAt.toISOString(), postCount: 0, signature: "empty", startAt: startAt.toISOString() };
  }

  await ensureTelegramCollectorStorage();
  const telegramSources = dedupeTelegramResources(resources);
  const handles = telegramSources.map((source) => source.handle);

  if (handles.length === 0) {
    return { channels: [], endAt: endAt.toISOString(), postCount: 0, signature: "empty", startAt: startAt.toISOString() };
  }

  const rows = await db.$queryRawUnsafe<StoredTelegramPostRow[]>(
    `
      SELECT *
      FROM "TelegramCollectedPost"
      WHERE "tenantId" = $1
        AND "channelHandle" = ANY($2)
        AND "publishedAt" >= $3
        AND "publishedAt" < $4
      ORDER BY "publishedAt" ASC
    `,
    getActiveIndexConfig().id,
    handles,
    startAt.toISOString(),
    endAt.toISOString(),
  );

  const includedPostsByHandle = new Map<string, TelegramCollectedPost[]>();
  const allPostsByHandle = new Map<string, TelegramCollectedPost[]>();
  for (const row of rows) {
    const next = mapStoredTelegramPost(row);
    const allList = allPostsByHandle.get(row.channelHandle) ?? [];
    allList.push(next);
    allPostsByHandle.set(row.channelHandle, allList);

    if (next.included) {
      const includedList = includedPostsByHandle.get(row.channelHandle) ?? [];
      includedList.push(next);
      includedPostsByHandle.set(row.channelHandle, includedList);
    }
  }

  const channels = telegramSources.map((source) => {
    const posts = allPostsByHandle.get(source.handle) ?? [];
    const includedPosts = includedPostsByHandle.get(source.handle) ?? [];
    return {
      channelHandle: source.handle,
      channelTitle: source.title,
      excludedPostCount: Math.max(posts.length - includedPosts.length, 0),
      includedPostCount: includedPosts.length,
      peerId: source.peerId,
      postCount: includedPosts.length,
      posts,
    };
  });

  return {
    channels,
    endAt: endAt.toISOString(),
    postCount: rows.filter((row) => row.included).length,
    signature: buildDigestSignature(
      rows
        .filter((row) => row.included)
        .map((row) => ({
          channelHandle: row.channelHandle,
          externalPostId: row.externalPostId,
          publishedAt: row.publishedAt.toISOString(),
          textHash: row.textHash,
        })),
    ),
    startAt: startAt.toISOString(),
  };
}

async function syncTelegramChannel(
  source: { handle: string; peerId: string | null; title: string },
  options: { maxPages: number; until?: Date },
) {
  let beforePostId: string | null = null;
  let pages = 0;
  let posts = 0;

  while (pages < options.maxPages) {
    const page = await fetchTelegramChannelPage(source.handle, beforePostId);
    if (!page.posts.length) {
      break;
    }

    for (const post of page.posts) {
      if (options.until && new Date(post.publishedAt) > options.until) {
        continue;
      }
      await upsertTelegramPost({
        ...post,
        peerId: source.peerId,
      });
      posts += 1;
    }

    pages += 1;
    if (!page.nextBeforePostId) {
      break;
    }
    beforePostId = page.nextBeforePostId;
  }

  return { pages, posts };
}

async function fetchTelegramChannelPage(handle: string, beforePostId?: string | null) {
  const url = new URL(`https://t.me/s/${handle}`);
  if (beforePostId) {
    url.searchParams.set("before", beforePostId);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SpikeSpotIndexBot/1.0; +https://spike.broker)",
    },
    method: "GET",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Telegram channel fetch failed for ${handle}: ${response.status}`);
  }

  const html = await response.text();
  const posts = parseTelegramChannelHtml(handle, html);
  const beforeMatches = [...html.matchAll(new RegExp(`/s/${escapeRegExp(handle)}\\?before=(\\d+)`, "g"))];
  const nextBeforePostId = beforeMatches.at(-1)?.[1] ?? null;

  return { nextBeforePostId, posts };
}

function parseTelegramChannelHtml(handle: string, html: string) {
  const posts: ParsedTelegramChannelPost[] = [];
  const blocks =
    html.match(
      /<div class="tgme_widget_message_wrap[\s\S]*?(?=<div class="tgme_widget_message_wrap|<div class="tgme_widget_message_centered|<script|<\/main>)/g,
    ) ?? [];

  for (const block of blocks) {
    const dataPost = block.match(/data-post="([^"]+)"/)?.[1] ?? "";
    const externalPostId = dataPost.split("/").at(-1) ?? "";
    const publishedAt = block.match(/<time datetime="([^"]+)"/)?.[1] ?? "";
    const postUrl = block.match(/tgme_widget_message_date" href="([^"]+)"/)?.[1] ?? `https://t.me/${handle}/${externalPostId}`;
    const channelTitle =
      decodeHtml(block.match(/tgme_widget_message_author[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? handle).trim() ||
      handle;
    const textHtml =
      block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<span|<a|<\/article>|<\/div>)/)?.[1] ??
      "";
    const text = normalizeTelegramText(textHtml);

    if (!externalPostId || !publishedAt || !text) {
      continue;
    }

    posts.push({
      channelHandle: handle,
      channelTitle,
      externalPostId,
      postUrl,
      publishedAt,
      rawHtml: textHtml,
      text,
    });
  }

  return posts;
}

async function upsertTelegramPost(
  post: ParsedTelegramChannelPost & { peerId: string | null },
) {
  await db.$executeRawUnsafe(
    `
      INSERT INTO "TelegramCollectedPost" (
        "id", "tenantId", "channelHandle", "peerId", "channelTitle",
        "externalPostId", "postUrl", "publishedAt", "text", "rawHtml",
        "textHash", "fetchedAt", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, NOW(), NOW(), NOW()
      )
      ON CONFLICT ("tenantId", "channelHandle", "externalPostId")
      DO UPDATE SET
        "peerId" = EXCLUDED."peerId",
        "channelTitle" = EXCLUDED."channelTitle",
        "postUrl" = EXCLUDED."postUrl",
        "publishedAt" = EXCLUDED."publishedAt",
        "text" = EXCLUDED."text",
        "rawHtml" = EXCLUDED."rawHtml",
        "textHash" = EXCLUDED."textHash",
        "fetchedAt" = NOW(),
        "updatedAt" = NOW()
    `,
    randomUUID(),
    getActiveIndexConfig().id,
    post.channelHandle,
    post.peerId,
    post.channelTitle,
    post.externalPostId,
    post.postUrl,
    new Date(post.publishedAt).toISOString(),
    post.text,
    post.rawHtml,
    createHash("sha256").update(post.text).digest("hex"),
  );

  revalidateTelegramCollectorViews();
}

async function ensureTelegramCollectorStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TelegramCollectedPost" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "channelHandle" TEXT NOT NULL,
        "peerId" TEXT,
        "channelTitle" TEXT,
        "externalPostId" TEXT NOT NULL,
        "postUrl" TEXT NOT NULL,
        "publishedAt" TIMESTAMP(3) NOT NULL,
        "included" BOOLEAN NOT NULL DEFAULT TRUE,
        "text" TEXT NOT NULL,
        "rawHtml" TEXT,
        "textHash" TEXT NOT NULL,
        "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TelegramCollectedPost_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "TelegramCollectedPost_tenantId_channelHandle_externalPostId_key"
      ON "TelegramCollectedPost"("tenantId", "channelHandle", "externalPostId")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TelegramCollectedPost_tenantId_publishedAt_idx"
      ON "TelegramCollectedPost"("tenantId", "publishedAt")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "TelegramCollectedPost_tenantId_channelHandle_publishedAt_idx"
      ON "TelegramCollectedPost"("tenantId", "channelHandle", "publishedAt")
    `);
    await db.$executeRawUnsafe(`
      ALTER TABLE "TelegramCollectedPost"
      ADD COLUMN IF NOT EXISTS "included" BOOLEAN NOT NULL DEFAULT TRUE
    `);
  })();

  await storageReady;
}

function dedupeTelegramResources(resources: ReportWorkspaceResource[]) {
  const map = new Map<
    string,
    { handle: string; peerId: string | null; title: string }
  >();
  for (const resource of resources) {
    if (!resource.enabled || resource.type !== "telegram_channel") {
      continue;
    }
    const handle = normalizeTelegramHandle(resource.url || resource.title);
    if (!handle) {
      continue;
    }
    if (!map.has(handle)) {
      map.set(handle, {
        handle,
        peerId: extractPeerId(resource.notes),
        title: resource.title,
      });
    }
  }
  return [...map.values()];
}

function normalizeTelegramHandle(value: string) {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/t\.me\/([A-Za-z0-9_]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  const handleMatch = trimmed.match(/@([A-Za-z0-9_]+)/);
  if (handleMatch) {
    return handleMatch[1];
  }
  return null;
}

function extractPeerId(notes: string) {
  const match = notes.match(/peer id:\s*([0-9]+)/i);
  return match?.[1] ?? null;
}

function normalizeTelegramText(html: string) {
  return collapseWhitespace(
    decodeHtml(
      html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<a [^>]*href="[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, " "),
    )
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/t\.me\/\S+/gi, " "),
  ).trim();
}

function collapseWhitespace(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, num: string) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function buildDailyWindow(date: string, reviewStartsAt: string, timezone: string) {
  const endAt = buildZonedDate(date, reviewStartsAt, timezone);
  const startAt = new Date(endAt.getTime() - 24 * 60 * 60 * 1000);
  return [startAt, endAt] as const;
}

function buildWeeklyWindow(
  weekEndDate: string,
  reviewStartsAt: string,
  timezone: string,
) {
  const endAt = buildZonedDate(weekEndDate, reviewStartsAt, timezone);
  const startAt = new Date(endAt.getTime() - 7 * 24 * 60 * 60 * 1000);
  return [startAt, endAt] as const;
}

function buildZonedDate(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map((part) => Number(part));
  let candidate = new Date(Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0));

  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(candidate);
    const actualDate = `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
    const actualHour = Number(part(parts, "hour"));
    const actualMinute = Number(part(parts, "minute"));
    if (actualDate === date && actualHour === (hour || 0) && actualMinute === (minute || 0)) {
      return candidate;
    }
    const deltaMinutes =
      ((year - Number(part(parts, "year"))) * 0) +
      ((hour || 0) - actualHour) * 60 +
      ((minute || 0) - actualMinute);
    candidate = new Date(candidate.getTime() + deltaMinutes * 60 * 1000);
  }

  return candidate;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((item) => item.type === type)?.value ?? "00";
}

function mapStoredTelegramPost(row: StoredTelegramPostRow): TelegramCollectedPost {
  return {
    channelHandle: row.channelHandle,
    channelTitle: row.channelTitle ?? row.channelHandle,
    externalPostId: row.externalPostId,
    id: row.id,
    included: row.included,
    peerId: row.peerId,
    postUrl: row.postUrl,
    publishedAt: row.publishedAt.toISOString(),
    text: row.text,
  };
}

function buildDigestSignature(
  rows: Array<{
    channelHandle: string;
    externalPostId: string;
    publishedAt: string;
    textHash: string;
  }>,
) {
  if (rows.length === 0) {
    return "empty";
  }

  return createHash("sha1")
    .update(
      rows
        .map((row) =>
          [
            row.channelHandle,
            row.externalPostId,
            row.publishedAt,
            row.textHash,
          ].join(":"),
        )
        .join("|"),
    )
    .digest("hex")
    .slice(0, 12);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function revalidateTelegramCollectorViews() {
  revalidatePath("/admin/reports");
}
