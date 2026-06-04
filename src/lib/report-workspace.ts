import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";

export type ReportKind = "daily" | "weekly";
export type ReportResourceRole = "analysis_source" | "format_reference";
export type ReportResourceType =
  | "telegram_channel"
  | "website"
  | "blog"
  | "file"
  | "note"
  | "prompt";
export type ReportResourceScope = "permanent" | "one_off";

export type ReportWorkspaceConfig = {
  adminPromptEn: string;
  adminPromptUk: string;
  collectionWindowLabel: string;
  enabled: boolean;
  id: string;
  publishAt: string;
  reportKind: ReportKind;
  reviewStartsAt: string;
  sourceProcessingNotes: string;
  telegramTemplateEn: string;
  telegramTemplateUk: string;
  timezone: string;
  updatedAt: string;
};

export type ReportWorkspaceResource = {
  createdAt: string;
  enabled: boolean;
  id: string;
  language: string;
  notes: string;
  reportId: string | null;
  reportKind: ReportKind;
  role: ReportResourceRole;
  scope: ReportResourceScope;
  title: string;
  type: ReportResourceType;
  updatedAt: string;
  url: string;
};

type WorkspaceConfigRow = {
  configJson: unknown;
  createdAt: Date;
  enabled: boolean;
  id: string;
  reportKind: string;
  updatedAt: Date;
};

type WorkspaceResourceRow = {
  createdAt: Date;
  enabled: boolean;
  id: string;
  language: string;
  notes: string | null;
  reportId: string | null;
  reportKind: string;
  role: string;
  scope: string;
  title: string;
  type: string;
  updatedAt: Date;
  url: string | null;
};

let workspaceStorageReady: Promise<void> | null = null;

const SPIKE_DEFAULT_RESOURCE_SEEDS: Array<{
  language: string;
  notes: string;
  reportKind: ReportKind;
  role: ReportResourceRole;
  scope: ReportResourceScope;
  title: string;
  type: ReportResourceType;
  url: string;
}> = buildSpikeDefaultResourceSeeds();

const DEFAULT_CONFIG: Record<ReportKind, Omit<ReportWorkspaceConfig, "id" | "reportKind" | "updatedAt">> = {
  daily: {
    adminPromptEn: [
      "Use published SPIKE daily index values together with configured external sources.",
      "Ignore outbound links inside Telegram posts and focus on the post text itself.",
      "Produce a concise editor-friendly summary before publication.",
    ].join(" "),
    adminPromptUk: [
      "Use published SPIKE daily index values together with configured external sources.",
      "Ignore outbound links inside Telegram posts and focus on the post text itself.",
      "Produce a concise editor-friendly summary before publication.",
    ].join(" "),
    collectionWindowLabel: "Collect source posts from 18:00 yesterday to 18:00 today (Europe/Kyiv).",
    enabled: true,
    publishAt: "19:00",
    reviewStartsAt: "18:00",
    sourceProcessingNotes:
      "Telegram channels are treated as text sources. Ignore embedded links unless the editor explicitly adds them as separate sources.",
    telegramTemplateEn: [
      "<b>SPIKE SPOT INDEX · Daily update</b>",
      "{{index_summary}}",
      "",
      "{{ai_summary}}",
    ].join("\n"),
    telegramTemplateUk: [
      "<b>SPIKE SPOT INDEX · Daily update</b>",
      "{{index_summary}}",
      "",
      "{{ai_summary}}",
    ].join("\n"),
    timezone: "Europe/Kyiv",
  },
  weekly: {
    adminPromptEn: [
      "Use the seven-day SPIKE data pack together with configured external sources and editorial notes.",
      "Treat format references as style guidance only, not factual inputs.",
      "Prepare a reviewable weekly digest before publication.",
    ].join(" "),
    adminPromptUk: [
      "Use the seven-day SPIKE data pack together with configured external sources and editorial notes.",
      "Treat format references as style guidance only, not factual inputs.",
      "Prepare a reviewable weekly digest before publication.",
    ].join(" "),
    collectionWindowLabel:
      "Collect source posts from the previous Saturday 12:00 to the current Saturday 12:00 (Europe/Kyiv).",
    enabled: true,
    publishAt: "15:00",
    reviewStartsAt: "12:00",
    sourceProcessingNotes:
      "Weekly references can include Telegram channels, websites, blogs, files, editor notes and style references.",
    telegramTemplateEn: [
      "Weekly Telegram distribution uses the generated three-message pack.",
      "Use format references as tone and structure guidance.",
    ].join("\n"),
    telegramTemplateUk: [
      "Weekly Telegram distribution uses the generated three-message pack.",
      "Use format references as tone and structure guidance.",
    ].join("\n"),
    timezone: "Europe/Kyiv",
  },
};

export async function getReportWorkspaceConfig(
  reportKind: ReportKind,
): Promise<ReportWorkspaceConfig> {
  if (!hasDatabaseUrl()) {
    return buildDefaultConfig(reportKind);
  }

  await ensureReportWorkspaceStorage();
  await ensureSpikeDefaultWorkspaceData(reportKind);
  const rows = await db.$queryRawUnsafe<WorkspaceConfigRow[]>(
    `
      SELECT *
      FROM "ReportWorkspaceConfig"
      WHERE "tenantId" = $1 AND "reportKind" = $2
      LIMIT 1
    `,
    getActiveIndexConfig().id,
    reportKind,
  );

  return rows[0] ? mapWorkspaceConfigRow(rows[0]) : buildDefaultConfig(reportKind);
}

export async function saveReportWorkspaceConfig(
  reportKind: ReportKind,
  payload: Partial<Omit<ReportWorkspaceConfig, "id" | "reportKind" | "updatedAt">>,
) {
  if (!hasDatabaseUrl()) {
    return buildDefaultConfig(reportKind);
  }

  await ensureReportWorkspaceStorage();
  const existing = await getReportWorkspaceConfig(reportKind);
  const nextConfig = {
    adminPromptEn: payload.adminPromptEn ?? existing.adminPromptEn,
    adminPromptUk: payload.adminPromptUk ?? existing.adminPromptUk,
    collectionWindowLabel:
      payload.collectionWindowLabel ?? existing.collectionWindowLabel,
    enabled: payload.enabled ?? existing.enabled,
    publishAt: payload.publishAt ?? existing.publishAt,
    reviewStartsAt: payload.reviewStartsAt ?? existing.reviewStartsAt,
    sourceProcessingNotes:
      payload.sourceProcessingNotes ?? existing.sourceProcessingNotes,
    telegramTemplateEn:
      payload.telegramTemplateEn ?? existing.telegramTemplateEn,
    telegramTemplateUk:
      payload.telegramTemplateUk ?? existing.telegramTemplateUk,
    timezone: payload.timezone ?? existing.timezone,
  };
  const id = existing.id || randomUUID();

  await db.$executeRawUnsafe(
    `
      INSERT INTO "ReportWorkspaceConfig" (
        "id", "tenantId", "reportKind", "enabled", "configJson", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
      ON CONFLICT ("tenantId", "reportKind")
      DO UPDATE SET
        "enabled" = EXCLUDED."enabled",
        "configJson" = EXCLUDED."configJson",
        "updatedAt" = NOW()
    `,
    id,
    getActiveIndexConfig().id,
    reportKind,
    nextConfig.enabled,
    JSON.stringify(nextConfig),
  );

  revalidateReportWorkspaceViews();
  return getReportWorkspaceConfig(reportKind);
}

export async function listReportWorkspaceResources({
  reportId,
  reportKind,
}: {
  reportId?: string | null;
  reportKind: ReportKind;
}) {
  if (!hasDatabaseUrl()) {
    return [] as ReportWorkspaceResource[];
  }

  await ensureReportWorkspaceStorage();
  await ensureSpikeDefaultWorkspaceData(reportKind);
  const rows = await db.$queryRawUnsafe<WorkspaceResourceRow[]>(
    `
      SELECT *
      FROM "ReportWorkspaceResource"
      WHERE "tenantId" = $1
        AND "reportKind" = $2
        AND (
          "scope" = 'permanent'
          OR ("scope" = 'one_off' AND "reportId" = $3)
        )
      ORDER BY
        CASE WHEN "role" = 'analysis_source' THEN 0 ELSE 1 END,
        CASE WHEN "scope" = 'permanent' THEN 0 ELSE 1 END,
        "createdAt" ASC
    `,
    getActiveIndexConfig().id,
    reportKind,
    reportId ?? "",
  );

  return rows.map(mapWorkspaceResourceRow);
}

export async function addReportWorkspaceResource(payload: {
  language?: string;
  notes?: string;
  reportId?: string | null;
  reportKind: ReportKind;
  role: ReportResourceRole | "both";
  scope: ReportResourceScope;
  title: string;
  type: ReportResourceType;
  url?: string;
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureReportWorkspaceStorage();
  const roles =
    payload.role === "both"
      ? (["analysis_source", "format_reference"] as const)
      : [payload.role];

  for (const role of roles) {
    const id = randomUUID();
    await db.$executeRawUnsafe(
      `
        INSERT INTO "ReportWorkspaceResource" (
          "id", "tenantId", "reportKind", "role", "scope", "reportId",
          "type", "title", "url", "notes", "language", "enabled",
          "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, TRUE,
          NOW(), NOW()
        )
      `,
      id,
      getActiveIndexConfig().id,
      payload.reportKind,
      role,
      payload.scope,
      payload.reportId ?? null,
      payload.type,
      payload.title.trim(),
      (payload.url ?? "").trim(),
      (payload.notes ?? "").trim(),
      payload.language ?? "uk",
    );
  }

  revalidateReportWorkspaceViews();
  return true;
}

export async function setReportWorkspaceResourceEnabled(
  id: string,
  enabled: boolean,
) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureReportWorkspaceStorage();
  await db.$executeRawUnsafe(
    `
      UPDATE "ReportWorkspaceResource"
      SET "enabled" = $3, "updatedAt" = NOW()
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    id,
    enabled,
  );

  revalidateReportWorkspaceViews();
  return { enabled, id };
}

export async function deleteReportWorkspaceResource(id: string) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureReportWorkspaceStorage();
  await db.$executeRawUnsafe(
    `
      DELETE FROM "ReportWorkspaceResource"
      WHERE "tenantId" = $1 AND "id" = $2
    `,
    getActiveIndexConfig().id,
    id,
  );

  revalidateReportWorkspaceViews();
  return { id };
}

function buildDefaultConfig(reportKind: ReportKind): ReportWorkspaceConfig {
  const base = DEFAULT_CONFIG[reportKind];
  return {
    ...base,
    id: `default-${reportKind}`,
    reportKind,
    updatedAt: new Date(0).toISOString(),
  };
}

function mapWorkspaceConfigRow(row: WorkspaceConfigRow): ReportWorkspaceConfig {
  const config = parseJsonRecord(row.configJson);
  const reportKind = normalizeReportKind(row.reportKind);
  const base = DEFAULT_CONFIG[reportKind];

  return {
    adminPromptEn: readString(
      config.adminPromptEn,
      readString(config.adminPrompt, base.adminPromptEn),
    ),
    adminPromptUk: readString(
      config.adminPromptUk,
      readString(config.adminPrompt, base.adminPromptUk),
    ),
    collectionWindowLabel: readString(
      config.collectionWindowLabel,
      base.collectionWindowLabel,
    ),
    enabled: typeof row.enabled === "boolean" ? row.enabled : base.enabled,
    id: row.id,
    publishAt: readString(config.publishAt, base.publishAt),
    reportKind,
    reviewStartsAt: readString(config.reviewStartsAt, base.reviewStartsAt),
    sourceProcessingNotes: readString(
      config.sourceProcessingNotes,
      base.sourceProcessingNotes,
    ),
    telegramTemplateEn: readString(
      config.telegramTemplateEn,
      readString(config.telegramTemplate, base.telegramTemplateEn),
    ),
    telegramTemplateUk: readString(
      config.telegramTemplateUk,
      readString(config.telegramTemplate, base.telegramTemplateUk),
    ),
    timezone: readString(config.timezone, base.timezone),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapWorkspaceResourceRow(row: WorkspaceResourceRow): ReportWorkspaceResource {
  return {
    createdAt: row.createdAt.toISOString(),
    enabled: row.enabled,
    id: row.id,
    language: row.language,
    notes: row.notes ?? "",
    reportId: row.reportId,
    reportKind: normalizeReportKind(row.reportKind),
    role: normalizeResourceRole(row.role),
    scope: normalizeResourceScope(row.scope),
    title: row.title,
    type: normalizeResourceType(row.type),
    updatedAt: row.updatedAt.toISOString(),
    url: row.url ?? "",
  };
}

async function ensureReportWorkspaceStorage() {
  if (!hasDatabaseUrl()) {
    return;
  }

  workspaceStorageReady ??= (async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ReportWorkspaceConfig" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "reportKind" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "configJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ReportWorkspaceConfig_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ReportWorkspaceConfig_tenantId_reportKind_key"
      ON "ReportWorkspaceConfig"("tenantId", "reportKind")
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ReportWorkspaceResource" (
        "id" TEXT NOT NULL,
        "tenantId" TEXT NOT NULL,
        "reportKind" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "scope" TEXT NOT NULL DEFAULT 'permanent',
        "reportId" TEXT,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "url" TEXT,
        "notes" TEXT,
        "language" TEXT NOT NULL DEFAULT 'uk',
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "ReportWorkspaceResource_pkey" PRIMARY KEY ("id")
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ReportWorkspaceResource_tenantId_kind_scope_idx"
      ON "ReportWorkspaceResource"("tenantId", "reportKind", "scope", "enabled")
    `);
    await db.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ReportWorkspaceResource_reportId_idx"
      ON "ReportWorkspaceResource"("reportId")
    `);
  })();

  await workspaceStorageReady;
}

function parseJsonRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function normalizeReportKind(value: string): ReportKind {
  return value === "weekly" ? "weekly" : "daily";
}

function normalizeResourceRole(value: string): ReportResourceRole {
  return value === "format_reference" ? "format_reference" : "analysis_source";
}

function normalizeResourceScope(value: string): ReportResourceScope {
  return value === "one_off" ? "one_off" : "permanent";
}

function normalizeResourceType(value: string): ReportResourceType {
  if (
    value === "telegram_channel" ||
    value === "website" ||
    value === "blog" ||
    value === "file" ||
    value === "note" ||
    value === "prompt"
  ) {
    return value;
  }

  return "website";
}

function revalidateReportWorkspaceViews() {
  revalidatePath("/admin/reports");
  revalidatePath("/admin/weekly-report");
}

async function ensureSpikeDefaultWorkspaceData(reportKind: ReportKind) {
  if (getActiveIndexConfig().id !== "spike-ua") {
    return;
  }

  const existingRows = await db.$queryRawUnsafe<WorkspaceResourceRow[]>(
    `
      SELECT *
      FROM "ReportWorkspaceResource"
      WHERE "tenantId" = $1
        AND "reportKind" = $2
        AND "scope" = 'permanent'
    `,
    getActiveIndexConfig().id,
    reportKind,
  );
  const existingKeys = new Set(
    existingRows.map((row) => buildSeedKey({
      reportKind: normalizeReportKind(row.reportKind),
      role: normalizeResourceRole(row.role),
      scope: normalizeResourceScope(row.scope),
      title: row.title,
      url: row.url ?? "",
    })),
  );
  const missingSeeds = SPIKE_DEFAULT_RESOURCE_SEEDS.filter((seed) => {
    return (
      seed.reportKind === reportKind &&
      !existingKeys.has(buildSeedKey(seed))
    );
  });

  for (const seed of missingSeeds) {
    await db.$executeRawUnsafe(
      `
        INSERT INTO "ReportWorkspaceResource" (
          "id", "tenantId", "reportKind", "role", "scope", "reportId",
          "type", "title", "url", "notes", "language", "enabled",
          "createdAt", "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, NULL,
          $6, $7, $8, $9, $10, TRUE,
          NOW(), NOW()
        )
      `,
      randomUUID(),
      getActiveIndexConfig().id,
      seed.reportKind,
      seed.role,
      seed.scope,
      seed.type,
      seed.title,
      seed.url,
      seed.notes,
      seed.language,
    );
  }
}

function buildSeedKey(seed: {
  reportKind: ReportKind;
  role: ReportResourceRole;
  scope: ReportResourceScope;
  title: string;
  url: string;
}) {
  return [
    seed.reportKind,
    seed.role,
    seed.scope,
    seed.title.trim().toLowerCase(),
    seed.url.trim().toLowerCase(),
  ].join("::");
}

function buildSpikeDefaultResourceSeeds() {
  const analysisChannels = [
    {
      handle: "@superagronomcom",
      note: "Core Ukrainian agri news source. Peer ID: 1091069714.",
      peerId: "1091069714",
    },
    {
      handle: "@agroportalua",
      note: "Core Ukrainian agri portal source. Peer ID: 1272426518.",
      peerId: "1272426518",
    },
    {
      handle: "@elevatorist",
      note: "Storage, logistics and elevator-market signal source. Peer ID: 1259677539.",
      peerId: "1259677539",
    },
    {
      handle: "@apk_informUA",
      note: "Market information and trading context source. Peer ID: 1780275109.",
      peerId: "1780275109",
    },
    {
      handle: "@landlord_magazine",
      note: "Broader agricultural business signal source. Peer ID: 1447882226.",
      peerId: "1447882226",
    },
    {
      handle: "@UGAua",
      note: "Industry association and policy context source. Peer ID: 1072789257.",
      peerId: "1072789257",
    },
    {
      handle: "@YaKurkul",
      note: "Producer-side market context source. Peer ID: 1156184607.",
      peerId: "1156184607",
    },
    {
      handle: "@latifundistmedia",
      note: "Broad agri market and export context source. Peer ID: 1021008671.",
      peerId: "1021008671",
    },
    {
      handle: "@mapfu2022",
      note: "Policy and ministry-level context source. Peer ID: 1714864597.",
      peerId: "1714864597",
    },
    {
      handle: "@BarvaInvest",
      note: "High-priority source. Review every relevant post explicitly. Peer ID: 1333970605.",
      peerId: "1333970605",
    },
    {
      handle: "@spike_brokers",
      note: "Use for both market aggregation and Telegram delivery standard. Peer ID: 1198567788.",
      peerId: "1198567788",
    },
    {
      handle: "@asap_agri",
      note: "Use for aggregation and especially daily content style reference. Peer ID: 1991550292.",
      peerId: "1991550292",
    },
  ] as const;
  const formatChannels = [
    {
      handle: "@spike_brokers",
      note: "Primary Telegram format reference for SPIKE index and weekly report structure. Peer ID: 1198567788.",
      peerId: "1198567788",
    },
    {
      handle: "@asap_agri",
      note: "Primary content-style reference, especially for daily summary tone and structure. Peer ID: 1991550292.",
      peerId: "1991550292",
    },
  ] as const;
  const reportKinds: ReportKind[] = ["daily", "weekly"];

  return reportKinds.flatMap((reportKind) => [
    ...analysisChannels.map((channel) => ({
      language: "uk",
      notes: [
        channel.note,
        `Telegram handle: ${channel.handle}.`,
        `Peer ID: ${channel.peerId}.`,
        "Use post text only; ignore outbound links inside posts unless separately configured.",
      ].join(" "),
      reportKind,
      role: "analysis_source" as const,
      scope: "permanent" as const,
      title: channel.handle,
      type: "telegram_channel" as const,
      url: `https://t.me/${channel.handle.slice(1)}`,
    })),
    ...formatChannels.map((channel) => ({
      language: "uk",
      notes: [
        channel.note,
        `Telegram handle: ${channel.handle}.`,
        `Peer ID: ${channel.peerId}.`,
        "Treat as a format and editorial structure reference, not as a factual override.",
      ].join(" "),
      reportKind,
      role: "format_reference" as const,
      scope: "permanent" as const,
      title: `${channel.handle} format reference`,
      type: "telegram_channel" as const,
      url: `https://t.me/${channel.handle.slice(1)}`,
    })),
  ]);
}

export function renderReportTelegramTemplate(
  template: string,
  values: Record<string, string>,
) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    return values[key] ?? "";
  });
}

export function getLocalizedReportWorkspaceText(
  config: ReportWorkspaceConfig,
  locale: "uk" | "en",
) {
  return {
    adminPrompt: locale === "uk" ? config.adminPromptUk : config.adminPromptEn,
    telegramTemplate:
      locale === "uk" ? config.telegramTemplateUk : config.telegramTemplateEn,
  };
}
