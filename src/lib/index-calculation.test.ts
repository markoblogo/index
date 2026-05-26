import { describe, expect, it } from "vitest";
import {
  calculateIndexValue,
  type PriceSubmission,
} from "@/lib/index-calculation";

const baseInput = {
  date: "2026-05-08",
  commodityId: "corn",
  deliveryBasisId: "fob-black-sea",
};

function submission(respondentId: string, price: unknown): PriceSubmission {
  return { respondentId, price };
}

describe("calculateIndexValue", () => {
  it("calculates a publishable value for a normal 8 respondent case", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 210),
        submission("r2", 211),
        submission("r3", 212),
        submission("r4", 213),
        submission("r5", 214),
        submission("r6", 215),
        submission("r7", 216),
        submission("r8", 217),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.rawCount).toBe(8);
    expect(result.usedCount).toBe(8);
    expect(result.median).toBe(213.5);
    expect(result.value).toBe(213.5);
    expect(result.rawValue).toBe(213.5);
    expect(result.excluded).toEqual([]);
  });

  it("excludes one high outlier beyond two percent of the median", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 210),
        submission("r2", 211),
        submission("r3", 212),
        submission("r4", 213),
        submission("r5", 214),
        submission("r6", 215),
        submission("r7", 216),
        submission("r8", 260),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.usedCount).toBe(7);
    expect(result.value).toBe(213);
    expect(result.excluded).toEqual([
      {
        respondentId: "r8",
        price: 260,
        deviationPct: expect.closeTo(21.7799, 4),
      },
    ]);
  });

  it("excludes one low outlier beyond two percent of the median", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 160),
        submission("r2", 210),
        submission("r3", 211),
        submission("r4", 212),
        submission("r5", 213),
        submission("r6", 214),
        submission("r7", 215),
        submission("r8", 216),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.usedCount).toBe(7);
    expect(result.value).toBe(213);
    expect(result.excluded).toEqual([
      {
        respondentId: "r1",
        price: 160,
        deviationPct: expect.closeTo(24.7059, 4),
      },
    ]);
  });

  it("returns insufficient_data when fewer than five valid prices are included", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 210),
        submission("r2", 211),
        submission("r3", 212),
        submission("r4", 213),
      ],
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.rawCount).toBe(4);
    expect(result.usedCount).toBe(4);
    expect(result.value).toBe(211.5);
  });

  it("does not run the outlier filter on an insufficient respondent sample", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("mn7r", 791.1),
        submission("fop-solovey", 740),
      ],
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.rawCount).toBe(2);
    expect(result.usedCount).toBe(2);
    expect(result.median).toBe(765.55);
    expect(result.value).toBe(765.6);
    expect(result.excluded).toEqual([]);
  });

  it("returns no_data when there are no valid prices", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [],
    });

    expect(result.status).toBe("no_data");
    expect(result.rawCount).toBe(0);
    expect(result.usedCount).toBe(0);
    expect(result.median).toBeNull();
    expect(result.value).toBeNull();
    expect(result.rawValue).toBeNull();
    expect(result.excluded).toEqual([]);
  });

  it("handles all prices identical", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 214),
        submission("r2", 214),
        submission("r3", 214),
        submission("r4", 214),
        submission("r5", 214),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.median).toBe(214);
    expect(result.value).toBe(214);
    expect(result.usedCount).toBe(5);
    expect(result.excluded).toEqual([]);
  });

  it("ignores invalid, missing, zero, and negative prices safely", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 210),
        submission("r2", 211),
        submission("r3", 212),
        submission("r4", 213),
        submission("r5", 214),
        submission("zero", 0),
        submission("negative", -12),
        submission("missing", undefined),
        submission("nan", Number.NaN),
        submission("text", "215"),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.rawCount).toBe(5);
    expect(result.usedCount).toBe(5);
    expect(result.value).toBe(212);
  });

  it("calculates median for an even number of prices", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 10),
        submission("r2", 20),
        submission("r3", 30),
        submission("r4", 40),
      ],
    });

    expect(result.median).toBe(25);
  });

  it("calculates median for an odd number of prices", () => {
    const result = calculateIndexValue({
      ...baseInput,
      submissions: [
        submission("r1", 10),
        submission("r2", 20),
        submission("r3", 30),
      ],
    });

    expect(result.median).toBe(20);
  });

  it("supports future basket weights while keeping single-basket output unchanged at weight one", () => {
    const result = calculateIndexValue({
      ...baseInput,
      basketWeight: 1,
      submissions: [
        submission("r1", 210.01),
        submission("r2", 211.02),
        submission("r3", 212.03),
        submission("r4", 213.04),
        submission("r5", 214.05),
      ],
    });

    expect(result.status).toBe("publishable");
    expect(result.rawValue).toBeCloseTo(212.03, 8);
    expect(result.weightedRawValue).toBeCloseTo(212.03, 8);
    expect(result.value).toBe(212);
  });
});
