import { createHash } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { CortexEditorialGuidance } from "@/lib/cortex-editorial-shadow";
import {
  validateMediaHubReportClaims,
  type MediaHubClaimValidation,
  type MediaHubEvidenceItem,
} from "@/lib/media-hub-evidence";

export type CortexEditorialDraft = { summary: string[]; title: string };
export type CortexEditorialQualityStatus = "passed" | "needs_rewrite" | "blocked";

export type CortexEditorialQualityAssessment = {
  factualValidation: MediaHubClaimValidation | null;
  metrics: {
    duplicateLineCount: number;
    emptyLineCount: number;
    sentenceCount: number;
    wordCount: number;
  };
  reasons: string[];
  status: CortexEditorialQualityStatus;
};

export type CortexEditorialQualityCandidate = {
  original: CortexEditorialDraft;
  originalAssessment: CortexEditorialQualityAssessment;
  revised: CortexEditorialDraft | null;
  revisedAssessment: CortexEditorialQualityAssessment | null;
  rewriteAttempted: boolean;
  selected: "original";
};

export type CortexEditorialQualityLedgerRecord = {
  createdAt: string;
  id: string;
  kind: "daily" | "weekly" | "monthly";
  product: "1D3X Cortex";
  qualityCandidates: Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>>;
  reportId: string;
  shadowOnly: true;
  tenantId: string;
  visibility: "protected";
};

let storageReady: Promise<void> | null = null;

export function assessCortexEditorialDraft(input: {
  draft: CortexEditorialDraft;
  evidence?: MediaHubEvidenceItem[];
  guidance?: CortexEditorialGuidance;
  kind: "daily" | "weekly" | "monthly";
}): CortexEditorialQualityAssessment {
  const lines = input.draft.summary.map((line) => line.trim());
  const nonEmptyLines = lines.filter(Boolean);
  const normalizedLines = nonEmptyLines.map((line) => line.toLocaleLowerCase("uk-UA").replace(/\s+/g, " "));
  const duplicateLineCount = normalizedLines.length - new Set(normalizedLines).size;
  const text = [input.draft.title, ...nonEmptyLines].join("\n");
  const wordCount = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  const sentenceCount = text.split(/[.!?\n]+/).map((item) => item.trim()).filter(Boolean).length;
  const factualValidation = input.evidence
    ? validateMediaHubReportClaims({ evidence: input.evidence, reportText: text })
    : null;
  const reasons: string[] = [];

  if (lines.length === 0 || nonEmptyLines.length === 0) reasons.push("summary is empty");
  if (lines.length !== nonEmptyLines.length) reasons.push("summary contains empty items");
  if (duplicateLineCount > 0) reasons.push(`summary repeats ${duplicateLineCount} item(s)`);
  if (input.guidance?.active && input.kind !== "monthly" && input.guidance.targetWordRange && input.guidance.targetSentenceRange) {
    const words = input.guidance.targetWordRange;
    const sentences = input.guidance.targetSentenceRange;
    if (wordCount < words.min || wordCount > words.max) reasons.push(`word count ${wordCount} is outside benchmark ${words.min}-${words.max}`);
    if (sentenceCount < sentences.min || sentenceCount > sentences.max) reasons.push(`sentence count ${sentenceCount} is outside benchmark ${sentences.min}-${sentences.max}`);
  }
  if (factualValidation?.status === "needs_review") reasons.push("claim validation needs review");

  return {
    factualValidation,
    metrics: {
      duplicateLineCount,
      emptyLineCount: lines.length - nonEmptyLines.length,
      sentenceCount,
      wordCount,
    },
    reasons,
    status: factualValidation?.status === "needs_review"
      ? "blocked"
      : reasons.length > 0 ? "needs_rewrite" : "passed",
  };
}

export function shouldAttemptCortexEditorialRewrite(assessment: CortexEditorialQualityAssessment) {
  return assessment.status === "needs_rewrite";
}

export function finalizeCortexEditorialQualityCandidates(input: {
  evidence: MediaHubEvidenceItem[];
  kind: "daily" | "weekly" | "monthly";
  qualityCandidates: Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>>;
}): Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>> {
  return Object.fromEntries(
    Object.entries(input.qualityCandidates).map(([locale, candidate]) => [locale, {
      ...candidate,
      originalAssessment: assessCortexEditorialDraft({ draft: candidate.original, evidence: input.evidence, kind: input.kind }),
      revisedAssessment: candidate.revised
        ? assessCortexEditorialDraft({ draft: candidate.revised, evidence: input.evidence, kind: input.kind })
        : null,
    }]),
  ) as Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>>;
}

export function buildCortexEditorialQualityLedgerRecord(input: {
  createdAt?: string;
  kind: "daily" | "weekly" | "monthly";
  qualityCandidates: Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>>;
  reportId: string;
  tenantId: string;
}): CortexEditorialQualityLedgerRecord {
  return {
    createdAt: input.createdAt ?? new Date().toISOString(),
    id: `cortex-editorial-quality:${input.tenantId}:${input.reportId}`,
    kind: input.kind,
    product: "1D3X Cortex",
    qualityCandidates: input.qualityCandidates,
    reportId: input.reportId,
    shadowOnly: true,
    tenantId: input.tenantId,
    visibility: "protected",
  };
}

export async function persistCortexEditorialQualityLedgerRecord(input: {
  kind: "daily" | "weekly" | "monthly";
  qualityCandidates: Partial<Record<"uk" | "en", CortexEditorialQualityCandidate>>;
  reportId: string;
  tenantId: string;
}) {
  if (!hasDatabaseUrl() || Object.keys(input.qualityCandidates).length === 0) return null;

  const record = buildCortexEditorialQualityLedgerRecord(input);
  await ensureStorage();
  await db.$executeRawUnsafe(
    `INSERT INTO "CortexEditorialQualityLedger" ("id", "tenantId", "reportId", "kind", "recordHash", "recordJson", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamp, NOW()) ON CONFLICT ("id") DO UPDATE SET "recordHash" = EXCLUDED."recordHash", "recordJson" = EXCLUDED."recordJson", "updatedAt" = NOW()`,
    record.id,
    record.tenantId,
    record.reportId,
    record.kind,
    createHash("sha256").update(JSON.stringify(record.qualityCandidates)).digest("hex"),
    JSON.stringify(record),
    record.createdAt,
  );
  return record;
}

async function ensureStorage() {
  storageReady ??= (async () => {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CortexEditorialQualityLedger" ("id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "reportId" TEXT NOT NULL, "kind" TEXT NOT NULL, "recordHash" TEXT NOT NULL, "recordJson" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CortexEditorialQualityLedger_pkey" PRIMARY KEY ("id"))`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CortexEditorialQualityLedger_tenant_kind_idx" ON "CortexEditorialQualityLedger"("tenantId", "kind", "updatedAt" DESC)`);
  })();
  await storageReady;
}
