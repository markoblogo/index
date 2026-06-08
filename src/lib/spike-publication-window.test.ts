import { describe, expect, it } from "vitest";
import { getSpikePublicVisibleTradeDate } from "@/lib/spike-publication-window";

describe("getSpikePublicVisibleTradeDate", () => {
  it("keeps yesterday visible before 19:00 Kyiv", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-08T15:59:00.000Z"))).toBe(
      "2026-06-07",
    );
  });

  it("switches to today at 19:00 Kyiv", () => {
    expect(getSpikePublicVisibleTradeDate(new Date("2026-06-08T16:00:00.000Z"))).toBe(
      "2026-06-08",
    );
  });
});
