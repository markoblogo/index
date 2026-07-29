import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getMediaHubReportTextForValidation } from "@/lib/media-hub-evidence";

const EDITORIAL_CHANNEL_HANDLE = normalizeEditorialChannelHandle("@spike_brokers");
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
  structureProfile?: CortexEditorialStructureProfile | null;
  targetSentenceRange: { max: number; min: number } | null;
  targetWordRange: { max: number; min: number } | null;
  version: string | null;
};

export type CortexEditorialStructureProfile = {
  active: boolean;
  emojiHeadingRate: number;
  headingCountRange: { max: number; min: number } | null;
  sectionFamilies: Array<"signals" | "logistics" | "grains" | "oilseeds" | "processing" | "international">;
  version: string;
};

export type CortexEditorialCloseScoreSample = {
  best: {
    lexicalOverlap: number;
    numberOverlap: number;
    postId: string;
    publishedAt: string;
    sentenceOverlap: number;
    url: string;
  };
  candidate: "original" | "revised";
  candidateCount: number;
  generatedAt: string;
  kind: "daily" | "weekly" | "monthly";
  lexicalGap: number;
  matchingReason: string;
  reportId: string;
  runnerUp: {
    lexicalOverlap: number;
    numberOverlap: number;
    postId: string;
    publishedAt: string;
    sentenceOverlap: number;
    url: string;
  };
};

export type CortexEditorialCloseScoreDebug = {
  generatedAt: string;
  kind: "daily" | "weekly" | "monthly";
  samples: CortexEditorialCloseScoreSample[];
  tenantId: string;
  totalScanned: number;
  totalTooClose: number;
  visibility: "protected";
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
type EditorialGuidanceRow = { editorialText: string | null; observationJson: CortexEditorialShadowObservation };
type EditorialPostLookupContext = {
  hasAnyPosts: boolean;
  hasAnyPostsInWindow: boolean;
};

type RankedEditorialCandidate = {
  metrics: {
    lexicalOverlap: number;
    numberOverlap: number;
    sentenceOverlap: number;
  };
  post: ShadowPost;
};

let storageReady: Promise<void> | null = null;

/** Deterministic observation only: never changes prompts, publication, or delivery. */
export function buildCortexEditorialShadowObservation(input: {
  posts: ShadowPost[];
  report: ShadowReport;
  postLookupContext?: EditorialPostLookupContext;
}): CortexEditorialShadowObservation {
  const generatedAt = validDate(input.report.createdAt) ?? new Date().toISOString();
  const candidates = rankEditorialCandidates({
    draftText: input.report.draftText,
    generatedAt,
    kind: input.report.kind,
    posts: input.posts,
  });
  const best = candidates[0];
  const runnerUp = candidates[1];
  const tieBreakWinner = resolveCloseScoreWinner(best, runnerUp);
  const status = getMatchStatus({
    best,
    candidateCount: candidates.length,
    runnerUp,
    tieBreakWinner,
  });
  const selected = status === "awaiting_editorial" ? null : best;

  return {
    candidate: input.report.candidate,
    candidateCount: candidates.length,
    editorialPost: selected ? { id: selected.post.id, publishedAt: selected.post.publishedAt, url: selected.post.url } : null,
    generatedAt,
    id: `cortex-editorial-shadow:${input.report.id}:${input.report.candidate}`,
    kind: input.report.kind,
    matchScore: selected ? round(selected.metrics.lexicalOverlap) : null,
    matchingReason: getMatchingReason({
      best,
      candidateCount: candidates.length,
      postLookupContext: input.postLookupContext,
      runnerUp,
      status,
      tieBreakWinner,
    }),
    metrics: selected ? buildMetrics(input.report.draftText, selected.post.text) : null,
    product: "1D3X Cortex",
    reportId: input.report.id,
    status,
    visibility: "protected",
  };
}

export async function runCortexEditorialCloseScoreDebug(
  input: {
    kind?: "daily" | "weekly" | "monthly";
    limit?: number;
    sampleLimit?: number;
    tenantId?: string;
  } = {},
): Promise<CortexEditorialCloseScoreDebug> {
  const kind = input.kind ?? "daily";
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const limit = normalizeCortexEditorialShadowListLimit(input.limit);
  const sampleLimit = Math.max(
    1,
    Math.min(40, Math.trunc(input.sampleLimit ?? 20)),
  );
  if (!hasDatabaseUrl()) {
    return {
      generatedAt: new Date().toISOString(),
      kind,
      samples: [],
      tenantId,
      totalScanned: 0,
      totalTooClose: 0,
      visibility: "protected",
    };
  }

  await ensureStorage();
  const reports = await listReports({ kind, limit, tenantId });
  const samples: CortexEditorialCloseScoreSample[] = [];
  let totalScanned = 0;
  let totalTooClose = 0;

  for (const row of reports) {
    for (const report of toShadowReports(row)) {
      totalScanned += 1;
      const posts = await listEditorialPosts({
        endAt: new Date(
          new Date(report.createdAt).getTime() +
            editorialWindowHours(report.kind) * 3_600_000,
        ),
        startAt: new Date(report.createdAt),
        tenantId,
      });
      const generatedAt = validDate(report.createdAt) ?? report.createdAt;
      const candidates = rankEditorialCandidates({
        draftText: report.draftText,
        generatedAt,
        kind: report.kind,
        posts: posts.posts,
      });
      const best = candidates[0];
      const runnerUp = candidates[1];
      const tieBreakWinner = resolveCloseScoreWinner(best, runnerUp);
      const status = getMatchStatus({
        best,
        candidateCount: candidates.length,
        runnerUp,
        tieBreakWinner,
      });
      const matchingReason = getMatchingReason({
        best,
        candidateCount: candidates.length,
        postLookupContext: posts.context,
        runnerUp,
        status,
        tieBreakWinner,
      });

      if (!matchingReason.toLowerCase().includes("too close") || !best || !runnerUp) {
        continue;
      }

      totalTooClose += 1;
      if (samples.length >= sampleLimit) continue;

      samples.push({
        best: {
          lexicalOverlap: round(best.metrics.lexicalOverlap),
          numberOverlap: round(best.metrics.numberOverlap),
          postId: best.post.id,
          publishedAt: best.post.publishedAt,
          sentenceOverlap: round(best.metrics.sentenceOverlap),
          url: best.post.url,
        },
        candidate: report.candidate,
        candidateCount: candidates.length,
        generatedAt,
        kind: report.kind,
        lexicalGap: round(best.metrics.lexicalOverlap - runnerUp.metrics.lexicalOverlap),
        matchingReason,
        reportId: report.id,
        runnerUp: {
          lexicalOverlap: round(runnerUp.metrics.lexicalOverlap),
          numberOverlap: round(runnerUp.metrics.numberOverlap),
          postId: runnerUp.post.id,
          publishedAt: runnerUp.post.publishedAt,
          sentenceOverlap: round(runnerUp.metrics.sentenceOverlap),
          url: runnerUp.post.url,
        },
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    kind,
    samples,
    tenantId,
    totalScanned,
    totalTooClose,
    visibility: "protected",
  };
}

export async function syncCortexEditorialShadowObservations(input: {
  kind?: "daily" | "weekly" | "monthly";
  limit?: number;
  periodEndDate?: string;
  tenantId?: string;
} = {}) {
  if (!hasDatabaseUrl()) return { observations: [] as CortexEditorialShadowObservation[], skippedReason: "database_not_configured" };

  await ensureStorage();
  const tenantId = input.tenantId ?? getActiveIndexConfig().id;
  const reports = await listReports({ ...input, tenantId });
  const observations: CortexEditorialShadowObservation[] = [];
  for (const row of reports) {
    for (const report of toShadowReports(row)) {
      const posts = await listEditorialPosts({
        endAt: new Date(new Date(report.createdAt).getTime() + editorialWindowHours(report.kind) * 3_600_000),
        startAt: new Date(report.createdAt),
        tenantId,
      });
      const observation = buildCortexEditorialShadowObservation({
        posts: posts.posts,
        postLookupContext: posts.context,
        report,
      });
      const editorialText = observation.editorialPost
        ? posts.posts.find((post) => post.id === observation.editorialPost?.id)?.text ?? null
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
  editorialTexts?: string[];
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
  const structureProfile = buildCortexEditorialStructureProfile({
    editorialTexts: input.editorialTexts ?? [],
    minimumSamples,
  });
  return {
    active: true,
    benchmarkKind,
    reason: input.kind === "monthly"
      ? `Derived from ${samples.length} matched weekly editorial outcomes; apply as a monthly structure and density reference only.`
      : `Derived from ${samples.length} matched public editorial outcomes; style guidance only.`,
    sampleCount: samples.length,
    structureProfile,
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
  const rows = await db.$queryRawUnsafe<EditorialGuidanceRow[]>(
    `SELECT ledger."observationJson", post."text" AS "editorialText" FROM "CortexEditorialShadowLedger" AS ledger LEFT JOIN "TelegramCollectedPost" AS post ON post."id" = ledger."editorialPostId" WHERE ledger."tenantId" = $1 AND ledger."kind" = $2 AND ledger."status" = 'matched' AND (ledger."observationJson"->>'candidate' IS NULL OR ledger."observationJson"->>'candidate' = 'original') ORDER BY ledger."updatedAt" DESC LIMIT 60`,
    input.tenantId ?? getActiveIndexConfig().id,
    input.kind === "monthly" ? "weekly" : input.kind,
  );
  return buildCortexEditorialGuidance({
    editorialTexts: rows.map((row) => row.editorialText).filter((text): text is string => Boolean(text)),
    kind: input.kind,
    observations: rows.map((row) => row.observationJson),
  });
}

export function buildCortexEditorialStructureProfile(input: {
  editorialTexts: string[];
  minimumSamples: number;
}): CortexEditorialStructureProfile | null {
  if (input.editorialTexts.length < input.minimumSamples) return null;
  const familyPositions = new Map<CortexEditorialStructureProfile["sectionFamilies"][number], number[]>();
  const headingCounts: number[] = [];
  let emojiHeadingReports = 0;

  for (const text of input.editorialTexts) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const headings = lines.filter(isLikelyHeading);
    headingCounts.push(headings.length);
    if (headings.some((line) => /^\p{Extended_Pictographic}/u.test(line))) emojiHeadingReports += 1;
    for (const family of SECTION_FAMILIES) {
      const index = lines.findIndex((line) => family.pattern.test(line));
      if (index >= 0) {
        const positions = familyPositions.get(family.id) ?? [];
        positions.push(index);
        familyPositions.set(family.id, positions);
      }
    }
  }

  const sectionFamilies = SECTION_FAMILIES
    .filter((family) => (familyPositions.get(family.id)?.length ?? 0) / input.editorialTexts.length >= 0.5)
    .sort((left, right) => average(familyPositions.get(left.id) ?? []) - average(familyPositions.get(right.id) ?? []))
    .map((family) => family.id);
  const profileData = {
    emojiHeadingRate: round(emojiHeadingReports / input.editorialTexts.length),
    headingCountRange: percentileRange(headingCounts),
    sectionFamilies,
  };

  return {
    active: sectionFamilies.length > 0,
    ...profileData,
    version: createHash("sha256").update(JSON.stringify(profileData)).digest("hex").slice(0, 16),
  };
}

const MIN_MATCH_SCORE = 0.16;
const MIN_SCORE_GAP = 0.05;
const MIN_TIEBREAKER_SIGNAL_GAP = 0.15;

function getMatchStatus(input: {
  best?: RankedEditorialCandidate;
  candidateCount: number;
  runnerUp?: RankedEditorialCandidate;
  tieBreakWinner: boolean;
}): CortexEditorialShadowStatus {
  const bestScore = input.best?.metrics.lexicalOverlap;
  const runnerUpScore = input.runnerUp?.metrics.lexicalOverlap;
  if (bestScore === undefined) return "awaiting_editorial";
  if (
    bestScore >= MIN_MATCH_SCORE &&
    (runnerUpScore === undefined ||
      bestScore - runnerUpScore >= MIN_SCORE_GAP ||
      input.tieBreakWinner)
  ) {
    return "matched";
  }
  if (input.candidateCount === 1) return "ambiguous";
  return "ambiguous";
}

function getMatchingReason(input: {
  best?: RankedEditorialCandidate;
  candidateCount: number;
  postLookupContext?: EditorialPostLookupContext;
  runnerUp?: RankedEditorialCandidate;
  status: CortexEditorialShadowStatus;
  tieBreakWinner: boolean;
}) {
  const { best, candidateCount, postLookupContext, runnerUp, status, tieBreakWinner } = input;
  const bestScore = best?.metrics.lexicalOverlap;
  const runnerUpScore = runnerUp?.metrics.lexicalOverlap;
  if (status === "awaiting_editorial") {
    if (!postLookupContext?.hasAnyPosts) {
      return "No posts found for spike_brokers in the collector table.";
    }
    if (!postLookupContext.hasAnyPostsInWindow) {
      return "Posts exist for spike_brokers, but none are in the editorial window.";
    }
    return "Posts exist for spike_brokers, but none passed lexical matching.";
  }
  if (status === "matched") {
    if (tieBreakWinner && best && runnerUp) {
      return `Close lexical overlap resolved by numeric/sentence tie-break (${round(best.metrics.lexicalOverlap)} vs ${round(runnerUp.metrics.lexicalOverlap)}; numbers ${round(best.metrics.numberOverlap)} vs ${round(runnerUp.metrics.numberOverlap)}).`;
    }
    return `Best lexical overlap ${round(bestScore ?? 0)} is distinct from the next candidate.`;
  }
  if (bestScore === undefined) return "No lexical overlap candidates in the candidate window.";
  if (candidateCount === 1) return `Single candidate with low lexical overlap (${round(bestScore)}), no tie check possible.`;
  if (bestScore - (runnerUpScore ?? 0) < MIN_SCORE_GAP) {
    return `Candidate overlap is too close (${round(bestScore)} vs ${round(runnerUpScore ?? 0)}).`;
  }
  return `Low lexical overlap for multiple candidates (best: ${round(bestScore)}; runner-up: ${round(runnerUpScore ?? 0)}).`;
}

function rankEditorialCandidates(input: {
  draftText: string;
  generatedAt: string;
  kind: "daily" | "weekly" | "monthly";
  posts: ShadowPost[];
}) {
  const endAt = new Date(
    new Date(input.generatedAt).getTime() +
      editorialWindowHours(input.kind) * 3_600_000,
  );
  const draftNumbers = extractNumbers(input.draftText);
  const draftSentences = sentences(input.draftText);
  return input.posts
    .filter((post) => {
      const publishedAt = validDate(post.publishedAt);
      return (
        publishedAt !== null &&
        new Date(publishedAt) >= new Date(input.generatedAt) &&
        new Date(publishedAt) <= endAt
      );
    })
    .map((post) => ({
      metrics: {
        lexicalOverlap: calculateLexicalOverlap(input.draftText, post.text),
        numberOverlap: calculateSequenceOverlap(
          draftNumbers,
          extractNumbers(post.text),
        ),
        sentenceOverlap: calculateSequenceOverlap(
          draftSentences,
          sentences(post.text),
        ),
      },
      post,
    }))
    .sort(compareRankedCandidates);
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

function calculateSequenceOverlap(left: string[], right: string[]) {
  const leftValues = new Set(left);
  const rightValues = new Set(right);
  const union = new Set([...leftValues, ...rightValues]);
  return union.size === 0
    ? 0
    : [...leftValues].filter((value) => rightValues.has(value)).length / union.size;
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

function compareRankedCandidates(
  left: RankedEditorialCandidate,
  right: RankedEditorialCandidate,
) {
  return (
    right.metrics.lexicalOverlap - left.metrics.lexicalOverlap ||
    right.metrics.numberOverlap - left.metrics.numberOverlap ||
    right.metrics.sentenceOverlap - left.metrics.sentenceOverlap ||
    left.post.publishedAt.localeCompare(right.post.publishedAt)
  );
}

function resolveCloseScoreWinner(
  best?: RankedEditorialCandidate,
  runnerUp?: RankedEditorialCandidate,
) {
  if (!best || !runnerUp) return false;
  if (best.metrics.lexicalOverlap < MIN_MATCH_SCORE) return false;
  if (best.metrics.lexicalOverlap - runnerUp.metrics.lexicalOverlap >= MIN_SCORE_GAP) {
    return false;
  }
  const numberGap = best.metrics.numberOverlap - runnerUp.metrics.numberOverlap;
  if (
    best.metrics.numberOverlap >= 0.8 &&
    numberGap >= MIN_TIEBREAKER_SIGNAL_GAP &&
    best.metrics.sentenceOverlap >= runnerUp.metrics.sentenceOverlap
  ) {
    return true;
  }
  return false;
}

function validDate(value: string) {
  return Number.isNaN(Date.parse(value)) ? null : new Date(value).toISOString();
}

function editorialWindowHours(kind: "daily" | "weekly" | "monthly") {
  return kind === "daily" ? 48 : 240;
}

function normalizeEditorialChannelHandle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) {
    return trimmed.slice(1).toLocaleLowerCase();
  }
  return trimmed.toLocaleLowerCase();
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
    structureProfile: null,
    targetSentenceRange: null,
    targetWordRange: null,
    version: null,
  };
}

const SECTION_FAMILIES: Array<{
  id: CortexEditorialStructureProfile["sectionFamilies"][number];
  pattern: RegExp;
}> = [
  { id: "signals", pattern: /головн|ключов|key signals|highlights/i },
  { id: "logistics", pattern: /логіст|перевез|logistics|road|rail|порт|port|border/i },
  { id: "grains", pattern: /зернов|пшениц|кукуруд|grains|wheat|corn/i },
  { id: "oilseeds", pattern: /олій|соняш|ріпак|соя|oilseeds|sunflower|rapeseed|soy/i },
  { id: "processing", pattern: /перероб|внутрішн|processing|domestic/i },
  { id: "international", pattern: /міжнарод|global|international|світов/i },
];

function isLikelyHeading(line: string) {
  return line.length <= 100 && (
    /^\p{Extended_Pictographic}/u.test(line) ||
    /^[A-ZА-ЯІЇЄҐ][A-ZА-ЯІЇЄҐ\s\d.:-]{4,}$/u.test(line)
  );
}

function average(values: number[]) {
  return values.length === 0 ? Number.POSITIVE_INFINITY : values.reduce((sum, value) => sum + value, 0) / values.length;
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
  const rows = await db.$queryRawUnsafe<TelegramPostRow[]>(`
    SELECT "id", "externalPostId", "postUrl", "publishedAt", "text"
    FROM "TelegramCollectedPost"
    WHERE "tenantId" = $1
      AND lower("channelHandle") = lower($2)
      AND "publishedAt" >= $3
      AND "publishedAt" <= $4
    ORDER BY "publishedAt" ASC
  `, input.tenantId,
    EDITORIAL_CHANNEL_HANDLE,
    input.startAt.toISOString(),
    input.endAt.toISOString(),
  );
  const anyPostsResult = await db.$queryRawUnsafe<{ count: bigint }[]>(`
    SELECT COUNT(*)::bigint AS "count"
    FROM "TelegramCollectedPost"
    WHERE "tenantId" = $1
      AND lower("channelHandle") = lower($2)
  `, input.tenantId, EDITORIAL_CHANNEL_HANDLE);
  const hasAnyPosts = Number(anyPostsResult[0]?.count ?? 0) > 0;
  return {
    context: {
      hasAnyPosts,
      hasAnyPostsInWindow: rows.length > 0,
    },
    posts: rows.map((row) => ({ id: row.id || row.externalPostId, publishedAt: row.publishedAt.toISOString(), text: row.text, url: row.postUrl })),
  };
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
