import { describe, expect, it } from "vitest";
import {
  computeBenchmarkBlend,
  computePublishedChange,
} from "@/lib/index-publish";

describe("computePublishedChange", () => {
  it("returns absolute and percentage change against the previous value", () => {
    expect(computePublishedChange(215.5, 210)).toEqual({
      changeAbs: 5.5,
      changePct: 2.62,
    });
  });

  it("returns null changes when no previous value exists", () => {
    expect(computePublishedChange(215.5, null)).toEqual({
      changeAbs: null,
      changePct: null,
    });
  });
});

describe("computeBenchmarkBlend", () => {
  it("averages calculated UGA value with benchmark when enabled", () => {
    expect(computeBenchmarkBlend(214.3, 219.3, true)).toEqual({
      benchmarkBlendEnabled: true,
      benchmarkValue: 219.3,
      finalValue: 216.8,
      method: "average_with_benchmark",
    });
  });

  it("keeps calculated value unchanged when disabled or benchmark is missing", () => {
    expect(computeBenchmarkBlend(214.34, 219.3, false)).toEqual({
      benchmarkBlendEnabled: false,
      benchmarkValue: null,
      finalValue: 214.3,
      method: null,
    });
    expect(computeBenchmarkBlend(214.34, null, true)).toEqual({
      benchmarkBlendEnabled: false,
      benchmarkValue: null,
      finalValue: 214.3,
      method: null,
    });
  });
});
