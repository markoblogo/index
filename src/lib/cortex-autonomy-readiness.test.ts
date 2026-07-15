import { describe, expect, it } from "vitest";
import {
  buildCortexAutonomyReadinessSnapshot,
  type CortexAutonomyReadinessSnapshot,
} from "./cortex-autonomy-readiness";
import type { CortexEditorialPromotionPolicy } from "./cortex-editorial-promotion";

const policy = (kind: CortexEditorialPromotionPolicy["kind"], mode: CortexEditorialPromotionPolicy["mode"] = "shadow"): CortexEditorialPromotionPolicy => ({
  averageOriginalScore: 0.6,
  averageRevisedScore: 0.66,
  factualSafetyFailures: 0,
  kind,
  minimumSamples: kind === "daily" ? 20 : 8,
  mode,
  qualifiedPairs: kind === "daily" ? 20 : 8,
  reason: `${mode} test reason`,
  revisedWinRate: 0.7,
  revisedWins: kind === "daily" ? 14 : 6,
});

describe("Cortex autonomy readiness monitor", () => {
  it("reports all editorial tracks independently and exposes score lift", () => {
    const snapshot = buildCortexAutonomyReadinessSnapshot({
      generatedAt: "2026-07-15T12:00:00.000Z",
      policies: [policy("daily"), policy("weekly", "recommended_candidate"), policy("monthly")],
      tenantId: "spike",
    });

    expect(snapshot).toMatchObject({ highestTrackMode: "recommended_candidate", rollbackCount: 0 });
    expect(snapshot.tracks).toHaveLength(3);
    expect(snapshot.tracks.find((track) => track.kind === "weekly")).toMatchObject({
      corpusSize: 8,
      scoreLift: 0.06,
      revisedWinRate: 0.7,
    });
  });

  it("records a rollback when a previously ready track returns to shadow", () => {
    const previous = buildCortexAutonomyReadinessSnapshot({
      generatedAt: "2026-07-14T12:00:00.000Z",
      policies: [policy("daily", "recommended_candidate"), policy("weekly"), policy("monthly")],
      tenantId: "spike",
    }) satisfies CortexAutonomyReadinessSnapshot;
    const current = buildCortexAutonomyReadinessSnapshot({
      generatedAt: "2026-07-15T12:00:00.000Z",
      policies: [policy("daily"), policy("weekly"), policy("monthly", "promotion_eligible")],
      previous,
      tenantId: "spike",
    });

    expect(current.rollbackCount).toBe(1);
    expect(current.tracks.find((track) => track.kind === "daily")?.rollbackReason).toContain("recommended_candidate");
    expect(current.highestTrackMode).toBe("promotion_eligible");
  });
});
