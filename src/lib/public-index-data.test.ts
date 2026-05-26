import { describe, expect, it } from "vitest";
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
