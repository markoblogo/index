import { describe, expect, it } from "vitest";
import { resolvePublicDisplayFallback } from "@/lib/public-index-display";
import { buildRealSparkline } from "@/lib/sparkline";

describe("buildRealSparkline", () => {
  it("returns a flat line when only one real point exists", () => {
    expect(
      buildRealSparkline([{ date: "2026-05-26", value: 228 }], 228),
    ).toEqual([228, 228]);
  });

  it("uses chronological published history", () => {
    expect(
      buildRealSparkline(
        [
          { date: "2026-05-25", value: 226 },
          { date: "2026-05-26", value: 220 },
        ],
        220,
      ),
    ).toEqual([226, 220]);
  });

  it("replaces the same-day published point with a live value", () => {
    expect(
      buildRealSparkline(
        [
          { date: "2026-05-25", value: 226 },
          { date: "2026-05-26", value: 220 },
        ],
        221,
        { date: "2026-05-26", value: 221 },
      ),
    ).toEqual([226, 221]);
  });

  it("does not use configured demo values when no real data exists", () => {
    expect(buildRealSparkline([], null)).toEqual([0, 0]);
  });
});

describe("resolvePublicDisplayFallback", () => {
  it("does not override a published SSI value with a newer submission fallback", () => {
    expect(
      resolvePublicDisplayFallback({
        publishedIndexDate: "2026-08-03",
        submissionFallback: {
          date: "2026-08-04",
          previousValue: 420,
          rawCount: 1,
          updatedAt: new Date("2026-08-04T18:35:00.000Z"),
          value: 450,
        },
        tenantId: "spike-ua",
      }),
    ).toBeNull();
  });

  it("still allows fallback when no published value exists", () => {
    expect(
      resolvePublicDisplayFallback({
        publishedIndexDate: null,
        submissionFallback: {
          date: "2026-08-04",
          previousValue: null,
          rawCount: 1,
          updatedAt: new Date("2026-08-04T18:35:00.000Z"),
          value: 450,
        },
        tenantId: "spike-ua",
      }),
    ).toMatchObject({
      date: "2026-08-04",
      value: 450,
    });
  });
});
