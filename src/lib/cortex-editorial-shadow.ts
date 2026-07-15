import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getMediaHubReportTextForValidation } from "@/lib/media-hub-evidence";

const EDITORIAL_CHANNEL_HANDLE = "@spike_brokers";
const DEFAULT_LIST_LIMIT = 14;

export type CortexEditorialShadowStatus = "awaiting_editorial" | "ambiguous" | "matched";

export type CortexEditorialShadowMetrics = {
  draftSentenceCount: number;
  draftWordCount: number;
  editorialSentenceCount: number;
  editorialWordCount: number;
  lexicalOverlap: number;
  numbersAdded: string[];
  numbersRemoved: string[];
  sentencesAdded: number;
  sentencesRemoved: number;
};

export type CortexEditorialShadowObservation = {
  candidate: "original" | "revised";
  candidateCount: number;
  editorialPost: { id: string; publishedAt: string; url: string } | null;
  generatedAt: string;
  id: string;
  kind: "daily" | "weekly" | "monthly";
  matchScore: number | null;
  matchingReason: string;
  metrics: CortexEditorialShadowMetrics | null;
  product: "1D3X Cortex";
  reportId: string;
  status: CortexEditorialShadowStatus;
  visibility: "protected";
};

export type CortexEditorialGuidance = {
  active: boolean;
  benchmarkKind: "daily" | "weekly";
  reason: string;
  sampleCount: number;
  targetSentenceRange: { max: number; min: number } | null;
  targetWordRange: { max: number; min: number } | null;
  version: string | null;
};

type ShadowReport = {
  candidate: "original" | "revised";
  createdAt: string;
  draftText: string;
  id: string;
  kind: "daily" | "weekly" | "monthly";
};

type ShadowPost = { id: string; publishedAt: string; text: string; url: string };

type MediaHubReportRow = {
  contentJson: unknown;
  createdAt: Date;
  id: string;
  kind: "daily" | "weekly" | "monthly";
  periodEnd: Date;
  periodStart: Date;
};

type TelegramPostRow = { externalPostId: string; id: string; postUrl: string; publishedAt: Date; text: string };
type EditorialShadowLedgerRow = { observationJson: CortexEditorialShadowObservation };

let storageReady: Promise<void> | null = null;

/** Deterministic observation only: never changes prompts, publication, or delivery. */
export function buildCortexEditorialShadowObservation(input: {
  posts: ShadowPost[];
  report: ShadowReport;
}): CortexEditorialShadowObservation {
  const generatedAt = validDate(input.report.createdAt) ?? new Date().toISOString();
  const endAt = new Date(new Date(generatedAt).getTime() + editorialWindowHours(input.report.kind) * 3_600_000);
  const candidates = input.posts
    .filter((post) => {
      const publishedAt = validDate(post.publishedAt);
      return publishedAt !== null && new Date(publishedAt) >= new Date(generatedAt) && new Date(publishedAt) <= endAt;
    })
    .map((post) => ({ post, score: calculateLexicalOverlap(input.report.draftText, post.text) }))
    .sort((left, right) => right.score - left.score || left.post.publishedAt.localeCompare(right.post.publishedAt));
  const best = candidates[0];
  const runnerUp = candidates[1];
  const status = getMatchStatus(best?.score, runnerUp?.score);
  const selected = status === "awaiting_editorial" ? null : best;

  return {
    candidate: input.report.candidate,
    candidateCount: candidates.length,
    editorialPost: selected ? { id: selected.post.id, publishedAt: selected.post.publishedAt, url: selected.post.url } : null,
    generatedAt,
    id: `cortex-editorial-shadow:${input.report.id}:${input.report.candidate}`,
    kind: input.report.kind,
    matchScore: selected ? round(selected.score) : null,
    matchingReason: getMatchingReason(status, best?.score, runnerUp?.score),
    metrics: selected ? buildMetrics(input.report.draftText, selected.post.text) : null,
    product: "1D3X Cortex",
    reportId: input.report.id,
    status,
    visibility: "protected",
  };
}

export async function syncCortexEditorialShadowObservations(input: {
  kind?: "daily" | "weekly" | "monthly";
  limit?: number;
  periodEndDate?: string;
} = {}) {
  if (!hasDatabaseUrl()) return { observations: [] as CortexEditorialShadowObservation[], skippedReason: "database_not_configured" };

  await ensureStorage();
  const tenantId = getActiveIndexConfig().id;
  const reports = await listReports({ ...input, tenantId });
  const observations: CortexEditorialShadowObservation[] = [];
  for (const row of reports) {
    for (const report of toShadowReports(row)) {
      const posts = await listEditorialPosts({
        endAt: new Date(new Date(report.createdAt).getTime() + editorialWindowHours(report.kind) * 3_600_000),
        startAt: new Date(report.createdAt),
        tenantId,
      });
      const observation = buildCortexEditorialShadowObservation({ posts, report });
      const editorialText = observation.editorialPost
        ? posts.find((post) => post.id === observation.editorialPost?.id)?.text ?? null
        : null;
      await persistObservation({
        draftText: report.draftText,
        editorialText,
        observation,
        periodEnd: row.periodEnd,
        periodStart: row.periodStart,
        tenantId,
      });
      observations.push(observation);
    }
  }
  return { observations, skippedReason: null };
}

export function normalizeCortexEditorialShadowListLimit(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(60, Math.trunc(value as number)));
}

export function buildCortexEditorialGuidance(input: {
  kind: "daily" | "weekly" | "monthly";
  observations: CortexEditorialShadowObservation[];
}): CortexEditorialGuidance {
  const benchmarkKind = input.kind === "monthly" ? "weekly" : input.kind;
  const samples = input.observations.filter((item) => item.status === "matched" && item.metrics !== null);
  const minimumSamples = benchmarkKind === "daily" ? 10 : 6;
  if (samples.length < minimumSamples) {
    return inactiveGuidance(benchmarkKind, `Need ${minimumSamples} matched ${benchmarkKind} editorial outcomes; found ${samples.length}.`, samples.length);
  }

  const wordCounts = samples.map((item) => item.metrics!.editorialWordCount);
  const sentenceCounts = samples.map((item) => item.metrics!.editorialSentenceCount);
  const version = createHash("sha256")
    .update(JSON.stringify(samples.map((item) => ({ id: item.id, metrics: item.metrics }))))
    .digest("hex")
    .slice(0, 16);
  return {
    active: true,
    benchmarkKind,
    reason: input.kind === "monthly"
      ? `Derived from ${samples.length} matched weekly editorial outcomes; apply as a monthly structure and density reference only.`
      : `Derived from ${samples.length} matched public editorial outcomes; style guidance only.`,
    sampleCount: samples.length,
    targetSentenceRange: percentileRange(sentenceCounts),
    targetWordRange: percentileRange(wordCounts),
    version,
  };
}

export async function getCortexEditorialGuidance(input: {
  kind: "daily" | "weekly" | "monthly";
  tenantId?: string;
}) {
  if (!hasDatabaseUrl()) return inactiveGuidance(
    input.kind === "monthly" ? "weekly" : input.kind,
    "Editorial shadow database is not configured.",
  );

  await ensureStorage();
  const rows = await db.$queryRawUnsafe<EditorialShadowLedgerRow[]>(
    `SELECT "observationJson" FROM "CortexEditorialShadowLedger" WHERE "tenantId" = $1 AND "kind" = $2 AND "status" = 'matched' AND ("observationJson"->>'candidate' IS NULL OR "observationJson"->>'candidate' = 'original') ORDER BY "updatedAt" DESC LIMIT 60`,
    input.tenantId ?? getActiveIndexConfig().id,
    input.kind === "monthly" ? "weekly" : input.kind,
  );
  return buildCortexEditorialGuidance({ kind: input.kind, observations: rows.map((row) => row.observationJson) });
}

function getMatchStatus(bestScore?: number, runnerUpScore?: number): CortexEditorialShadowStatus {
  if (bestScore === undefined) return "awaiting_editorial";
  if (bestScore >= 0.16 && (runnerUpScore === undefined || bestScore - runnerUpScore >= 0.05)) return "matched";
  return "ambiguous";
}

function getMatchingReason(status: CortexEditorialShadowStatus, bestScore?: number, runnerUpScore?: number) {
  if (status === "awaiting_editorial") return "No later @spike_brokers post is available in the editorial window.";
  if (status === "matched") return `Best lexical overlap ${round(bestScore ?? 0)} is distinct from the next candidate.`;
  return runnerUpScore === undefined
    ? `One later post exists, but lexical overlap ${round(bestScore ?? 0)} is below the automatic-match threshold.`
    : `Candidate overlap is too close (${round(bestScore ?? 0)} vs ${round(runnerUpScore)}); retain for later review.`;
}

function buildMetrics(draft: string, editorial: string): CortexEditorialShadowMetrics {
  const draftTokens = tokenize(draft);
  const editorialTokens = tokenize(editorial);
  const draftSentences = sentences(draft);
  const editorialSentences = sentences(editorial);
  const draftNumbers = new Set(extractNumbers(draft));
  const editorialNumbers = new Set(extractNumbers(editorial));
  return {
    draftSentenceCount: draftSentences.length,
    draftWordCount: draftTokens.length,
    editorialSentenceCount: editorialSentences.length,
    editorialWordCount: editorialTokens.length,
    lexicalOverlap: round(calculateLexicalOverlap(draft, editorial)),
    numbersAdded: [...editorialNumbers].filter((value) => !draftNumbers.has(value)).sort(),
    numbersRemoved: [...draftNumbers].filter((value) => !editorialNumbers.has(value)).sort(),
    sentencesAdded: editorialSentences.filter((value) => !draftSentences.includes(value)).length,
    sentencesRemoved: draftSentences.filter((value) => !editorialSentences.includes(value)).length,
  };
}

function calculateLexicalOverlap(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const union = new Set([...leftTokens, ...rightTokens]);
  return union.size === 0 ? 0 : [...leftTokens].filter((token) => rightTokens.has(token)).length / union.size;
}

function tokenize(value: string) {
  return value.toLocaleLowerCase("uk-UA").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
}

function sentences(value: string) {
  return value.split(/[.!?\n]+/).map((item) => item.replace(/\s+/g, " ").trim().toLocaleLowerCase("uk-UA")).filter((item) => item.length >= 12);
}

function extractNumbers(value: string) {
  return value.match(/\b\d+(?:[.,]\d+)?\b/g) ?? [];
}

function round(value: number) {
  return Number(value.toFixed(3));
}

function validDate(value: string) {
  return Number.isNaN(Date.parse(value)) ? null : new Date(value).toISOString();
}

function editorialWindowHours(kind: "daily" | "weekly" | "monthly") {
  return kind === "daily" ? 48 : 240;
}

function inactiveGuidance(
  benchmarkKind: "daily" | "weekly",
  reason: string,
  sampleCount = 0,
): CortexEditorialGuidance {
  return {
    active: false,
    benchmarkKind,
    reason,
    sampleCount,
    targetSentenceRange: null,
    targetWordRange: null,
    version: null,
  };
}

function percentileRange(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  return {
    max: sorted[Math.ceil((sorted.length - 1) * 0.75)] ?? 0,
    min: sorted[Math.floor((sorted.length - 1) * 0.25)] ?? 0,
  };
}

async function listReports(input: { kind?: "daily" | "weekly" | "monthly"; limit?: number; periodEndDate?: string; tenantId: string }) {
  const params: unknown[] = [input.tenantId];
  const conditions = ['"tenantId" = $1', '"status" = \'published\'', '"kind" IN (\'daily\', \'weekly\', \'monthly\')'];
  if (input.kind) {
    params.push(input.kind);
    conditions.push(`"kind" = $${params.length}`);
  }
  if (input.periodEndDate) {
    params.push(input.periodEndDate);
    conditions.push(`"periodEnd" = $${params.length}::date`);
  }
  params.push(normalizeCortexEditorialShadowListLimit(input.limit));
  return db.$queryRawUnsafe<MediaHubReportRow[]>(
    `SELECT "id", "kind", "periodStart", "periodEnd", "contentJson", "createdAt" FROM "MediaHubReport" WHERE ${conditions.join(" AND ")} ORDER BY "periodEnd" DESC LIMIT $${params.length}`,
    ...params,
  );
}

async function listEditorialPosts(input: { endAt: Date; startAt: Date; tenantId: string }) {
  const rows = await db.$queryRawUnsafe<TelegramPostRow[]>(
    `SELECT "id", "externalPostId", "postUrl", "publishedAt", "text" FROM "TelegramCollectedPost" WHERE "tenantId" = $1 AND "channelHandle" = $2 AND "publishedAt" >= $3 AND "publishedAt" <= $4 ORDER BY "publishedAt" ASC`,
    input.tenantId,
    EDITORIAL_CHANNEL_HANDLE,
    input.startAt.toISOString(),
    input.endAt.toISOString(),
  );
  return rows.map((row) => ({ id: row.id || row.externalPostId, publishedAt: row.publishedAt.toISOString(), text: row.text, url: row.postUrl }));
}

function toShadowReports(row: MediaHubReportRow): ShadowReport[] {
  const content = row.contentJson && typeof row.contentJson === "object"
    ? row.contentJson as {
      generatedAt?: unknown;
      dailyReports?: unknown;
      llm?: { qualityCandidates?: Partial<Record<"uk" | "en", { revised?: { summary?: unknown; title?: unknown } | null }>> };
      localized?: unknown;
      summary?: string[];
      title?: string;
    }
    : {};
  const generatedAt = typeof content.generatedAt === "string" && validDate(content.generatedAt) ? content.generatedAt : row.createdAt.toISOString();
  const original: ShadowReport = {
    candidate: "original",
    createdAt: generatedAt,
    draftText: getMediaHubReportTextForValidation(content),
    id: row.id,
    kind: row.kind,
  };
  const revised = content.llm?.qualityCandidates?.uk?.revised ?? content.llm?.qualityCandidates?.en?.revised;
  if (!revised || !Array.isArray(revised.summary) || typeof revised.title !== "string") return [original];
  return [
    original,
    {
      candidate: "revised",
      createdAt: generatedAt,
      draftText: getMediaHubReportTextForValidation({ localized: { uk: revised }, title: revised.title }),
      id: row.id,
      kind: row.kind,
    },
  ];
}

async function persistObservation(input: {
  draftText: string;
  editorialText: string | null;
  observation: CortexEditorialShadowObservation;
  periodEnd: Date;
  periodStart: Date;
  tenantId: string;
}) {
  const editorialPost = input.observation.editorialPost;
  const generatedTextHash = createHash("sha256").update(input.draftText).digest("hex");
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexEditorialShadowLedger" ("id", "tenantId", "reportId", "kind", "periodStart", "periodEnd", "status", "editorialPostId", "editorialPostUrl", "generatedTextHash", "editorialTextHash", "observationJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11, $12::jsonb, NOW(), NOW()) ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status", "editorialPostId" = EXCLUDED."editorialPostId", "editorialPostUrl" = EXCLUDED."editorialPostUrl", "generatedTextHash" = EXCLUDED."generatedTextHash", "editorialTextHash" = EXCLUDED."editorialTextHash", "observationJson" = EXCLUDED."observationJson", "updatedAt" = NOW()`,
    input.observation.id, input.tenantId, input.observation.reportId, input.observation.kind,
    input.periodStart.toISOString(), input.periodEnd.toISOString(), input.observation.status,
    editorialPost?.id ?? null, editorialPost?.url ?? null, generatedTextHash,
    input.editorialText ? createHash("sha256").update(input.editorialText).digest("hex") : null,
    JSON.stringify(input.observation),
  );
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEditorialShadowLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "reportId" TEXT NOT NULL, "kind" TEXT NOT NULL, "periodStart" DATE NOT NULL, "periodEnd" DATE NOT NULL, "status" TEXT NOT NULL, "editorialPostId" TEXT, "editorialPostUrl" TEXT, "generatedTextHash" TEXT NOT NULL, "editorialTextHash" TEXT, "observationJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexEditorialShadowLedger_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEditorialShadowLedger_tenant_period_idx" ON "CortexEditorialShadowLedger"("tenantId", "kind", "periodEnd" DESC)`);
  })();
  await storageReady;
}
