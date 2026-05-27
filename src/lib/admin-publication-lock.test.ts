import { describe, expect, it, vi } from "vitest";
import {
  canManuallyUnlockPublicationDate,
  todayKyivDate,
} from "@/lib/admin-publication-lock";

describe("manual publication unlock window", () => {
  it("allows manual unlock only on the current Kyiv trade date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T20:30:00.000Z"));

    const today = todayKyivDate();

    expect(today).toBe("2026-05-27");
    expect(canManuallyUnlockPublicationDate("2026-05-27")).toBe(true);
    expect(canManuallyUnlockPublicationDate("2026-05-26")).toBe(false);
    expect(canManuallyUnlockPublicationDate("2026-05-28")).toBe(false);

    vi.useRealTimers();
  });
});
