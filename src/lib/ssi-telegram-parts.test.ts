import { describe, expect, it, vi } from "vitest";
import { deliverSsiReportParts } from "./ssi-telegram-parts";

describe("SSI daily delivery checkpoint", () => {
  it("stores the sole message receipt and skips it on subsequent attempts", async () => {
    const send = vi.fn().mockResolvedValue(456);
    const checkpoint = vi.fn().mockResolvedValue(undefined);
    const input = { expectedParts: 1 as const, messages: ["daily"], ledger: null, send, checkpoint };
    expect(await deliverSsiReportParts(input)).toEqual({ status: "sent", messageIds: [456] });
    for (let retry = 0; retry < 3; retry++) await deliverSsiReportParts({ ...input, ledger: [456] });
    expect(send).toHaveBeenCalledOnce();
    expect(checkpoint.mock.calls).toEqual([[[null]], [[456]]]);
  });
  it("does not resend a daily message after an ambiguous timeout", async () => {
    const send = vi.fn().mockRejectedValue(new Error("timeout"));
    const checkpoint = vi.fn().mockResolvedValue(undefined);
    const input = { expectedParts: 1 as const, messages: ["daily"], ledger: [], send, checkpoint };
    expect(await deliverSsiReportParts(input)).toMatchObject({ skippedReason: "telegram_delivery_needs_review" });
    expect(await deliverSsiReportParts({ ...input, ledger: [null] })).toMatchObject({ skippedReason: "telegram_delivery_needs_review" });
    expect(send).toHaveBeenCalledOnce();
  });
});
