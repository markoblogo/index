import type { PublicLatestItem } from "@/lib/public-api-data";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";
import type { MediaHubManualMaterialDigest } from "@/lib/media-hub-manual-materials";

export type MediaHubEvidenceItem = {
  claim: string;
  confidence: "high" | "medium" | "low";
  excerpt: string;
  id: string;
  sourceDate: string | null;
  sourceTitle: string;
  sourceType: "index" | "manual_material" | "monitored_source" | "ai_inference";
  sourceUrl: string | null;
  usedInSection: string;
};

export type MediaHubClaimValidation = {
  status: "passed" | "needs_review";
  checkedAt: string;
  unsupportedClaims: Array<{
    claim: string;
    reason: string;
    severity: "medium" | "high";
  }>;
};

export function buildMediaHubEvidenceLedger(input: {
  latestData?: PublicLatestItem[];
  manualMaterials?: MediaHubManualMaterialDigest[];
  periodEndDate: string;
  snapshots?: MediaHubWindowSnapshot[];
}) {
  const items: MediaHubEvidenceItem[] = [];

  for (const item of input.latestData ?? []) {
    const name = item.commodityNameUk || item.commodityNameEn || item.commodityCode;
    const aliases = [
      item.commodityNameUk,
      item.commodityNameEn,
      item.commodityCode,
      item.basis,
    ].filter(Boolean).join("; ");
    items.push({
      claim: `${name} index ${formatNumber(item.valueUsdPerMt)} USD/t; ${aliases}`,
      confidence: "high",
      excerpt: [
        `${name}: ${formatNumber(item.valueUsdPerMt)} USD/t`,
        aliases,
        item.changeAbs == null ? null : `d/d ${formatSigned(item.changeAbs)}`,
      ].filter(Boolean).join("; "),
      id: `index:${item.commodityId}:${item.basis}:${input.periodEndDate}`,
      sourceDate: item.date || input.periodEndDate,
      sourceTitle: "Published SPIKE index",
      sourceType: "index",
      sourceUrl: "https://spike.1d3x.com/",
      usedInSection: "index",
    });
  }

  for (const material of input.manualMaterials ?? []) {
    const excerpt = compactEvidenceText(material.summary || material.extractedText);
    if (!excerpt) continue;
    items.push({
      claim: compactEvidenceText(excerpt.split(". ")[0] || excerpt),
      confidence: "medium",
      excerpt,
      id: `manual:${material.id}`,
      sourceDate: material.receivedAt?.toISOString?.() ?? null,
      sourceTitle: material.sourceDomain || material.originalUrl || material.sourceType,
      sourceType: "manual_material",
      sourceUrl: material.originalUrl || null,
      usedInSection: "source_materials",
    });
  }

  for (const snapshot of input.snapshots ?? []) {
    for (const feed of snapshot.feed) {
      const excerpt = compactEvidenceText(feed.summary || feed.title);
      if (!excerpt) continue;
      items.push({
        claim: compactEvidenceText(feed.title || excerpt),
        confidence: "medium",
        excerpt,
        id: `feed:${feed.id}`,
        sourceDate: feed.time || null,
        sourceTitle: feed.source || "Monitored source",
        sourceType: "monitored_source",
        sourceUrl: null,
        usedInSection: snapshot.window,
      });
    }
  }

  return dedupeEvidence(items).slice(0, 120);
}

export function validateMediaHubReportClaims(input: {
  evidence: MediaHubEvidenceItem[];
  reportText: string;
}) {
  const unsupportedClaims = extractRiskyClaims(input.reportText)
    .filter((claim) => !hasSupportingEvidence(claim, input.evidence))
    .map((claim) => ({
      claim,
      reason: "Forecast/numeric market assertion has no matching index/source evidence.",
      severity: isHighRiskClaim(claim) ? "high" as const : "medium" as const,
    }))
    .slice(0, 20);

  return {
    checkedAt: new Date().toISOString(),
    status: unsupportedClaims.length > 0 ? "needs_review" as const : "passed" as const,
    unsupportedClaims,
  } satisfies MediaHubClaimValidation;
}

export function getMediaHubReportTextForValidation(content: {
  dailyReports?: unknown;
  localized?: unknown;
  summary?: string[];
  title?: string;
}) {
  const chunks: string[] = [];
  chunks.push(content.title ?? "");
  chunks.push(...(content.summary ?? []));
  chunks.push(...extractLocalizedSummaryLines(content.localized));
  chunks.push(JSON.stringify(content.dailyReports ?? ""));
  return chunks.join("\n");
}

function extractRiskyClaims(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/(?<=[.!?。]|[。！？])\s+|\n+/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter((line) => line.length >= 24 && line.length <= 420)
    .filter((line) => RISKY_CLAIM_PATTERN.test(line))
    .filter((line, index, all) => all.indexOf(line) === index);
}

const RISKY_CLAIM_PATTERN =
  /(\d+(?:[.,]\d+)?\s*(?:%|млн|million|тис|thousand|тонн|tons|t\b|usd)|очікується|прогноз|врожайність|експорт може|може зрости|може зниз|нижч|вищ|forecast|production|exports? (?:may|could|will)|expected|projected|lower|higher)/i;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "were",
  "що", "для", "через", "разом", "ринок", "ціни", "ціна", "звіт", "індекс",
  "очікується", "прогноз", "може", "нижчим", "вищим", "залишається",
  "відображає", "свідчить", "показали", "рівні", "також",
]);

function hasSupportingEvidence(claim: string, evidence: MediaHubEvidenceItem[]) {
  const claimTerms = meaningfulTerms(claim);
  if (claimTerms.length === 0) {
    return true;
  }

  return evidence.some((item) => {
    const sourceText = `${item.claim} ${item.excerpt} ${item.sourceTitle}`.toLowerCase();
    const matches = claimTerms.filter((term) => sourceText.includes(term)).length;
    return matches >= Math.min(2, claimTerms.length);
  });
}

function meaningfulTerms(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%.,]+/gu, " ")
    .split(/\s+/)
    .map((term) => term.replace(/^[.,]+|[.,]+$/g, ""))
    .filter((term) => (term.length >= 4 || /^\d{2,}(?:[.,]\d+)?$/.test(term)) && !STOP_WORDS.has(term))
    .slice(0, 8);
}

function isHighRiskClaim(value: string) {
  return /(очікується|прогноз|врожайність|експорт може|forecast|production|expected|projected|\d+(?:[.,]\d+)?\s*(?:%|млн|million|тонн|tons))/i.test(value);
}

function extractLocalizedSummaryLines(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return ["uk", "en"].flatMap((locale) => {
    const report = (value as Record<string, unknown>)[locale];
    if (!report || typeof report !== "object") {
      return [];
    }
    const summary = (report as { summary?: unknown }).summary;
    const title = (report as { title?: unknown }).title;
    return [
      typeof title === "string" ? title : "",
      ...(Array.isArray(summary)
        ? summary.filter((line): line is string => typeof line === "string")
        : []),
    ].filter(Boolean);
  });
}

function dedupeEvidence(items: MediaHubEvidenceItem[]) {
  const seen = new Set<string>();
  const result: MediaHubEvidenceItem[] = [];
  for (const item of items) {
    const key = `${item.sourceType}:${item.sourceTitle}:${item.excerpt}`.toLowerCase().slice(0, 180);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function compactEvidenceText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function formatNumber(value: number | null | undefined) {
  return value == null ? "n/a" : Number(value).toFixed(1);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}`;
}
