import { describe, expect, it } from "vitest";
import { buildCortexEditorialMatchDiagnostics } from "./cortex-editorial-match-diagnostics";
import type { CortexEditorialPromotionPolicy } from "./cortex-editorial-promotion";
import type { CortexEditorialShadowObservation } from "./cortex-editorial-shadow";

const policy: CortexEditorialPromotionPolicy = {
  averageOriginalScore: null, averageRevisedScore: null, factualSafetyFailures: 0, kind: "daily", minimumSamples: 20,
  mode: "shadow", qualifiedPairs: 1, reason: "test", revisedWinRate: null, revisedWins: 0,
};

const observation = (reportId: string, candidate: "original" | "revised", status: CortexEditorialShadowObservation["status"], matchingReason: string): CortexEditorialShadowObservation => ({
  candidate, candidateCount: 1, editorialPost: null, generatedAt: "2026-07-15T10:00:00.000Z", id: `${reportId}:${candidate}`,
  kind: "daily", matchScore: null, matchingReason, metrics: null, product: "1D3X Cortex", reportId, status, visibility: "protected",
});

describe("Cortex editorial match diagnostics", () => {
  it("separates matched pairs from missing and ambiguous archival coverage", () => {
    const diagnostics = buildCortexEditorialMatchDiagnostics({
      generatedAt: "2026-07-15T12:00:00.000Z",
      kind: "daily",
      observations: [
        observation("ready", "original", "matched", "matched"),
        observation("ready", "revised", "matched", "matched"),
        observation("waiting", "original", "awaiting_editorial", "No later post"),
        observation("ambiguous", "original", "ambiguous", "Candidate overlap is too close"),
        observation("legacy", "original", "matched", "matched"),
      ],
      policy,
      tenantId: "spike-ua",
    });

    expect(diagnostics).toMatchObject({
      coverageRate: 1,
      legacyOriginalOnlyReports: 3,
      matchedPairs: 1,
      promotionQualifiedPairs: 1,
      reportsWithCandidatePair: 1,
      scannedReports: 4,
      statusCounts: { ambiguous: 1, awaiting_editorial: 1, matched: 3 },
    });
    expect(diagnostics.reasonCounts).toEqual([
      { count: 1, reason: "ambiguous_competing_posts" },
      { count: 1, reason: "awaiting_editorial" },
    ]);
  });
});
