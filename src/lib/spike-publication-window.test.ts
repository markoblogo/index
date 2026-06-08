import { describe, expect, it } from "vitest";
import { getSpikePublicVisibleTradeDate } from "@/lib/spike-publication-window";

describe("getSpikePublicVisibleTradeDate", () => {
  it("keeps previous Friday visible on Monday before 19:00 Kyiv", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-08T15:59:00.000Z"))).toBe(
      "2026-06-05",
    );
  });

  it("switches to today at 19:00 Kyiv", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-08T16:00:00.000Z"))).toBe(
      "2026-06-08",
    );
  });

  it("keeps yesterday visible on a normal weekday before 19:00 Kyiv", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-09T15:59:00.000Z"))).toBe(
      "2026-06-08",
    );
  });

  it("keeps Friday visible during Saturday", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-06T12:00:00.000Z"))).toBe(
      "2026-06-05",
    );
  });

  it("keeps Friday visible during Sunday", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-07T12:00:00.000Z"))).toBe(
      "2026-06-05",
    );
  });
});
