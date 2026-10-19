import { describe, expect, it, vi } from "vitest";
import { getSsiWeeklySlot, runSsiWeeklyPhase, type SsiWeeklyDependencies } from "./ssi-weekly-workflow";

function setup(overrides: Partial<SsiWeeklyDependencies> = {}) {
  return {
    held: false,
    ssiTenant: true,
    sync: vi.fn().mockResolvedValue({ status: "processed", remainingCount: 0 }),
    gate: vi.fn().mockResolvedValue(null),
    report: vi.fn().mockResolvedValue(null),
    publish: vi.fn().mockResolvedValue({ status: "published" }),
    send: vi.fn().mockResolvedValue({ status: "sent" }),
    ...overrides,
  } satisfies SsiWeeklyDependencies;
}

describe("SSI weekly preparation and delivery", () => {
  it("uses Friday observations, Saturday intake and Sunday Kyiv phases", () => {
    expect(getSsiWeeklySlot(new Date("2026-10-17T19:00:00Z"))).toBeNull();
    expect(getSsiWeeklySlot(new Date("2026-10-17T21:10:00Z"))).toMatchObject({
      phase: "prepare", periodEndDate: "2026-10-16", intakeEndDate: "2026-10-17",
    });
    expect(getSsiWeeklySlot(new Date("2026-10-18T05:59:00Z"))?.phase).toBe("prepare");
    expect(getSsiWeeklySlot(new Date("2026-10-18T06:00:00Z"))?.phase).toBe("send");
    expect(getSsiWeeklySlot(new Date("2026-10-18T06:31:00Z"))).toBeNull();
  });

  it.each(["2026-01-11T07:00:00Z", "2026-10-25T07:00:00Z", "2026-06-21T06:00:00Z"])("sends at 09:00 Kyiv across DST: %s", (instant) => {
    expect(getSsiWeeklySlot(new Date(instant))?.phase).toBe("send");
  });

  it.each(["prepare", "send"] as const)("keeps the hold before all %s side effects", async (phase) => {
    const deps = setup({ held: true });
    const now = new Date(phase === "prepare" ? "2026-10-17T21:10:00Z" : "2026-10-18T06:00:00Z");
    expect(await runSsiWeeklyPhase(phase, now, deps)).toMatchObject({ skippedReason: "ssi_periodic_quality_hold" });
    for (const fn of [deps.sync, deps.gate, deps.report, deps.publish, deps.send]) expect(fn).not.toHaveBeenCalled();
  });

  it("imports after the cutoff and publishes to the site without sending", async () => {
    const deps = setup();
    expect(await runSsiWeeklyPhase("prepare", new Date("2026-10-17T21:10:00Z"), deps)).toMatchObject({ status: "published" });
    expect(deps.sync).toHaveBeenCalledOnce();
    expect(deps.gate).toHaveBeenCalledWith("2026-10-16");
    expect(deps.publish).toHaveBeenCalledWith("2026-10-16");
    expect(deps.send).not.toHaveBeenCalled();
  });

  it("waits for partial import and missing required materials", async () => {
    const deps = setup({ sync: vi.fn().mockResolvedValue({ status: "partial", remainingCount: 1 }) });
    expect(await runSsiWeeklyPhase("prepare", new Date("2026-10-17T21:10:00Z"), deps)).toMatchObject({ skippedReason: "drive_import_incomplete" });
    expect(deps.publish).not.toHaveBeenCalled();
    const missing = setup({ gate: vi.fn().mockResolvedValue({ status: "blocked_missing_required_materials" }) });
    expect(await runSsiWeeklyPhase("prepare", new Date("2026-10-17T21:10:00Z"), missing)).toMatchObject({ status: "blocked_missing_required_materials" });
    expect(missing.publish).not.toHaveBeenCalled();
  });

  it("never generates at send time and refuses missing or unvalidated reports", async () => {
    for (const report of [null, { status: "needs_review", telegramSentAt: null }]) {
      const deps = setup({ report: vi.fn().mockResolvedValue(report) });
      expect(await runSsiWeeklyPhase("send", new Date("2026-10-18T06:00:00Z"), deps)).toMatchObject({ skippedReason: "weekly_report_not_ready" });
      for (const fn of [deps.sync, deps.gate, deps.publish, deps.send]) expect(fn).not.toHaveBeenCalled();
    }
  });

  it("reuses a saved report, never regenerates it, and skips delivered weeks", async () => {
    const deps = setup({ report: vi.fn().mockResolvedValue({ status: "published", telegramSentAt: null }) });
    await runSsiWeeklyPhase("prepare", new Date("2026-10-17T21:10:00Z"), deps);
    expect(deps.publish).not.toHaveBeenCalled();
    await runSsiWeeklyPhase("send", new Date("2026-10-18T06:00:00Z"), deps);
    expect(deps.send).toHaveBeenCalledWith("2026-10-16");
    vi.mocked(deps.report).mockResolvedValue({ status: "published", telegramSentAt: new Date() });
    expect(await runSsiWeeklyPhase("send", new Date("2026-10-18T06:05:00Z"), deps)).toMatchObject({ skippedReason: "already_sent" });
    expect(deps.send).toHaveBeenCalledOnce();
  });

  it("rejects other tenants and early or late delivery without side effects", async () => {
    for (const [now, ssiTenant] of [["2026-10-18T05:59:00Z", true], ["2026-10-18T07:00:00Z", true], ["2026-10-18T06:00:00Z", false]] as const) {
      const deps = setup({ ssiTenant });
      expect(await runSsiWeeklyPhase("send", new Date(now), deps)).toMatchObject({ status: "skipped" });
      expect(deps.report).not.toHaveBeenCalled();
    }
  });
});
