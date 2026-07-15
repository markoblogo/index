import { describe, expect, it } from "vitest";
import {
  buildCortexEditorialPromotionEvaluation,
  buildCortexEditorialPromotionPolicy,
} from "./cortex-editorial-promotion";
import type { CortexEditorialQualityCandidate } from "./cortex-editorial-quality-gate";
import type { CortexEditorialShadowObservation } from "./cortex-editorial-shadow";

const assessment = (status: "passed" | "needs_rewrite" | "blocked" = "passed") => ({
  factualValidation: { checkedAt: "2026-07-15T10:00:00.000Z", status: status === "blocked" ? "needs_review" as const : "passed" as const, unsupportedClaims: [] },
  metrics: { duplicateLineCount: 0, emptyLineCount: 0, sentenceCount: 4, wordCount: 100 },
  reasons: [],
  status,
});

const shadow = (candidate: "original" | "revised", score: number): CortexEditorialShadowObservation => ({
  candidate,
  candidateCount: 1,
  editorialPost: { id: "post", publishedAt: "2026-07-15T10:00:00.000Z", url: "https://t.me/spike_brokers/1" },
  generatedAt: "2026-07-15T09:00:00.000Z",
  id: `shadow:${candidate}`,
  kind: "daily",
  matchScore: score,
  matchingReason: "test",
  metrics: { draftSentenceCount: 4, draftWordCount: 100, editorialSentenceCount: 4, editorialWordCount: 100, lexicalOverlap: score, numbersAdded: [], numbersRemoved: [], sentencesAdded: 0, sentencesRemoved: 0 },
  product: "1D3X Cortex",
  reportId: "report-1",
  status: "matched",
  visibility: "protected",
});

describe("Cortex editorial promotion", () => {
  it("recommends revised only when it leads and both candidates are factually safe", () => {
    const candidate: CortexEditorialQualityCandidate = {
      original: { summary: ["Original"], title: "Daily" }, originalAssessment: assessment(),
      revised: { summary: ["Revised"], title: "Daily" }, revisedAssessment: assessment(), rewriteAttempted: true, selected: "original",
    };
    const evaluation = buildCortexEditorialPromotionEvaluation({
      kind: "daily", originalShadow: shadow("original", 0.4), qualityCandidate: candidate, reportId: "report-1", revisedShadow: shadow("revised", 0.8),
    });

    expect(evaluation).toMatchObject({ recommendedCandidate: "revised", status: "scored" });
  });

  it("keeps policy in shadow mode before the minimum corpus", () => {
    const evaluations = Array.from({ length: 19 }, (_, index) => ({
      ...buildCortexEditorialPromotionEvaluation({
        kind: "daily",
        originalShadow: shadow("original", 0.4),
        qualityCandidate: { original: { summary: [], title: "" }, originalAssessment: assessment(), revised: { summary: [], title: "" }, revisedAssessment: assessment(), rewriteAttempted: true, selected: "original" },
        reportId: `report-${index}`,
        revisedShadow: shadow("revised", 0.8),
      }),
      id: `evaluation-${index}`,
    }));
    const policy = buildCortexEditorialPromotionPolicy({ evaluations, kind: "daily" });

    expect(policy.mode).toBe("shadow");
    expect(policy.qualifiedPairs).toBe(19);
  });

  it("makes a stable daily win cohort recommendation-only before delivery cutover", () => {
    const evaluation = buildCortexEditorialPromotionEvaluation({
      kind: "daily",
      originalShadow: shadow("original", 0.4),
      qualityCandidate: { original: { summary: [], title: "" }, originalAssessment: assessment(), revised: { summary: [], title: "" }, revisedAssessment: assessment(), rewriteAttempted: true, selected: "original" },
      reportId: "report",
      revisedShadow: shadow("revised", 0.8),
    });
    const policy = buildCortexEditorialPromotionPolicy({
      evaluations: Array.from({ length: 20 }, (_, index) => ({ ...evaluation, id: `evaluation-${index}` })),
      kind: "daily",
    });

    expect(policy.mode).toBe("recommended_candidate");
  });
});
