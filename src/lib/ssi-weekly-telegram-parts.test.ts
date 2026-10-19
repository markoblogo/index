import { describe, expect, it, vi } from "vitest";
import { deliverSsiWeeklyParts } from "./ssi-weekly-telegram-parts";

describe("SSI weekly Telegram checkpoints", () => {
  it("resumes only the remaining parts", async () => {
    const send = vi.fn().mockResolvedValueOnce(12).mockResolvedValueOnce(13);
    const checkpoint = vi.fn().mockResolvedValue(undefined);
    expect(await deliverSsiWeeklyParts({ messages: ["one", "two", "three"], ledger: [11], send, checkpoint })).toEqual({ status: "sent", messageIds: [11, 12, 13] });
    expect(send.mock.calls).toEqual([["two"], ["three"]]);
    expect(checkpoint.mock.calls.map(([ids]) => ids)).toEqual([[11, null], [11, 12], [11, 12, null], [11, 12, 13]]);
  });

  it("does not retry an ambiguous timeout automatically", async () => {
    const send = vi.fn().mockRejectedValue(new Error("timeout"));
    const checkpoint = vi.fn().mockResolvedValue(undefined);
    expect(await deliverSsiWeeklyParts({ messages: ["one", "two", "three"], ledger: [], send, checkpoint })).toMatchObject({ status: "failed", skippedReason: "telegram_delivery_needs_review" });
    expect(checkpoint).toHaveBeenLastCalledWith([null]);
    send.mockClear();
    expect(await deliverSsiWeeklyParts({ messages: ["one", "two", "three"], ledger: [null], send, checkpoint })).toMatchObject({ skippedReason: "telegram_delivery_needs_review" });
    expect(send).not.toHaveBeenCalled();
  });

  it("allows safe retry after a confirmed rejection", async () => {
    const checkpoint = vi.fn().mockResolvedValue(undefined);
    const send = vi.fn().mockResolvedValue(null);
    expect(await deliverSsiWeeklyParts({ messages: ["one", "two", "three"], ledger: [11], send, checkpoint })).toMatchObject({ status: "failed", skippedReason: "telegram_rejected" });
    expect(checkpoint).toHaveBeenLastCalledWith([11]);
  });

  it("fails closed for invalid receipts or anything other than three bounded parts", async () => {
    const send = vi.fn();
    const checkpoint = vi.fn();
    for (const [messages, ledger] of [[["one"], []], [["x".repeat(4097), "two", "three"], []], [["one", "two", "three"], ["bad"]]] as const) {
      expect(await deliverSsiWeeklyParts({ messages: [...messages], ledger, send, checkpoint })).toMatchObject({ status: "failed" });
    }
    expect(send).not.toHaveBeenCalled();
  });
});
