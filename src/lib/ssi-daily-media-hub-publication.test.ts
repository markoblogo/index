import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  report: vi.fn(), publish: vi.fn(), send: vi.fn(), execute: vi.fn(), rows: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { publishedIndex: { findMany: mocks.rows }, $executeRawUnsafe: mocks.execute } }));
vi.mock("@/lib/index-platform", () => ({ getActiveIndexConfig: () => ({ id: "spike-ua" }) }));
vi.mock("@/lib/media-hub-publication-scheduler", () => ({
  getMediaHubReport: mocks.report, publishMediaHubSnapshotReport: mocks.publish, sendMediaHubReportTelegram: mocks.send,
}));
import { ensureDailyMediaHubPublication } from "./ssi-daily-media-hub-publication";

describe("SSI daily fallback shares the normal delivery receipt", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.report.mockResolvedValue(null);
    mocks.publish.mockRejectedValue(new Error("22P02: invalid JSON surrogate"));
    mocks.execute.mockResolvedValue(1);
    mocks.rows.mockResolvedValue([{ commodity: { nameUk: "Кукурудза" }, valueUsdPerMt: { toNumber: () => 165 }, changeAbsUsdPerMt: { toNumber: () => 0 } }]);
    mocks.send.mockResolvedValue({ status: "sent", messageIds: [123] });
  });
  it("does not regenerate or fall back after a confirmed send", async () => {
    mocks.report.mockResolvedValue({ telegramSentAt: new Date(), telegramMessageIds: [123] });
    expect(await ensureDailyMediaHubPublication("2026-10-20")).toMatchObject({ skippedReason: "already_sent" });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("four fallback retries share a single confirmed daily receipt", async () => {
    let sent = false;
    mocks.report.mockImplementation(async () => sent ? { telegramSentAt: new Date(), telegramMessageIds: [123] } : null);
    mocks.send.mockImplementation(async () => { sent = true; return { status: "sent", messageIds: [123] }; });
    for (let run = 0; run < 4; run++) await ensureDailyMediaHubPublication("2026-10-20");
    expect(mocks.send).toHaveBeenCalledOnce();
    expect(mocks.publish).toHaveBeenCalledOnce();
  });
  it("persists the fallback before using the shared atomic sender", async () => {
    expect(await ensureDailyMediaHubPublication("2026-10-20")).toMatchObject({ status: "fallback_published", fallback: { stored: true, telegram: { status: "sent" } } });
    expect(mocks.send).toHaveBeenCalledWith("daily", "2026-10-20", { audience: "spike", locale: "uk" });
    const args = mocks.execute.mock.calls[0];
    expect(args[0]).toContain('"telegramSentAt" IS NULL');
    expect(JSON.parse(args[6]).windows[0].summaryBody).toEqual(["- Кукурудза: 165.0 USD/t (0.0 USD/t)"]);
    expect(mocks.execute.mock.invocationCallOrder[0]).toBeLessThan(mocks.send.mock.invocationCallOrder[0]);
  });
  it("fails closed if the fallback could not be saved", async () => {
    mocks.execute.mockRejectedValue(new Error("database unavailable"));
    const result = await ensureDailyMediaHubPublication("2026-10-20");
    expect(result).toMatchObject({ fallback: { stored: false } });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("does not overwrite or send when another request claimed the report", async () => {
    mocks.execute.mockResolvedValue(0);
    await ensureDailyMediaHubPublication("2026-10-20");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(["delivery_in_progress", "telegram_delivery_needs_review", "daily_index_not_current", "already_sent"])("does not create fallback for %s", async (skippedReason) => {
    mocks.publish.mockResolvedValue({ status: "published" });
    mocks.send.mockResolvedValue({ status: skippedReason === "telegram_delivery_needs_review" ? "failed" : "skipped", skippedReason });
    await ensureDailyMediaHubPublication("2026-10-20");
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.send).toHaveBeenCalledOnce();
  });
});
