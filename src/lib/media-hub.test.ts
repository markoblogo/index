import { describe, expect, it } from "vitest";
import { getMediaHubWindowProgressLabel } from "@/lib/media-hub";

describe("media hub window progress labels", () => {
  it("uses the current Kyiv date for week and 30-day progress", () => {
    const now = new Date("2026-07-22T15:31:00.000Z");

    expect(getMediaHubWindowProgressLabel("day", { now })).toBe("1/1");
    expect(getMediaHubWindowProgressLabel("week", { now })).toBe("4/7");
    expect(getMediaHubWindowProgressLabel("month", { now })).toBe("22/30");
  });
});
