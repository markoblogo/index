import { describe, expect, it } from "vitest";
import {
  buildCortexEditorialCorpusBackfillTrack,
  normalizeCortexEditorialCorpusBackfillLimit,
} from "./cortex-editorial-corpus-backfill";
import type { CortexEditorialPromotionPolicy } from "./cortex-editorial-promotion";
import type { CortexEditorialShadowObservation } from "./cortex-editorial-shadow";

const policy: CortexEditorialPromotionPolicy = {
  averageOriginalScore: null,
  averageRevisedScore: null,
  factualSafetyFailures: 0,
  kind: "daily",
  minimumSamples: 20,
  mode: "shadow",
  qualifiedPairs: 0,
  reason: "test",
  revisedWinRate: null,
  revisedWins: 0,
};

const observation = (reportId: string, candidate: "original" | "revised", status: "awaiting_editorial" | "ambiguous" | "matched"): CortexEditorialShadowObservation => ({
  candidate,
  candidateCount: 1,
  editorialPost: null,
  generatedAt: "2026-07-15T10:00:00.000Z",
  id: `shadow:${reportId}:${candidate}`,
  kind: "daily",
  matchScore: null,
  matchingReason: "test",
  metrics: null,
  product: "1D3X Cortex",
  reportId,
  status,
  visibility: "protected",
});

describe("Cortex editorial corpus backfill", () => {
  it("limits a run to a bounded archive window", () => {
    expect(normalizeCortexEditorialCorpusBackfillLimit(undefined)).toBe(30);
    expect(normalizeCortexEditorialCorpusBackfillLimit(100)).toBe(60);
  });

  it("counts only existing matched original/revised pairs", () => {
    const track = buildCortexEditorialCorpusBackfillTrack({
      kind: "daily",
      observations: [
        observation("report-1", "original", "matched"),
        observation("report-1", "revised", "matched"),
        observation("report-2", "original", "matched"),
        observation("report-3", "revised", "ambiguous"),
      ],
      promotionPolicy: policy,
      skippedReason: null,
    });

    expect(track).toMatchObject({
      matchedPairs: 1,
      matchedRevisedCandidates: 1,
      revisedCandidates: 2,
      scannedReports: 3,
    });
  });
});
