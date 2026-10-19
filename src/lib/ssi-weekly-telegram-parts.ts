type Ledger = Array<number | null>;

// null is an in-flight receipt, not a missing/zero message ID. An ambiguous
// response needs operator reconciliation: Telegram has no sendMessage idempotency key.
export async function deliverSsiWeeklyParts(input: {
  messages: string[];
  ledger: unknown;
  checkpoint: (ids: Ledger) => Promise<unknown>;
  send: (text: string) => Promise<number | null>;
}) {
  const failed = (skippedReason: string) => ({ status: "failed" as const, skippedReason });
  let raw: unknown = input.ledger;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { return failed("telegram_receipts_invalid"); }
  }
  if (!Array.isArray(raw) || raw.length > 3 || raw.some(id => id !== null && (!Number.isSafeInteger(id) || id <= 0))) return failed("telegram_receipts_invalid");
  if (raw.includes(null)) return failed("telegram_delivery_needs_review");
  if (input.messages.length !== 3 || input.messages.some(text => !text.trim() || text.length > 4096)) return failed("weekly_telegram_parts_invalid");
  const ids = raw as number[];
  for (const text of input.messages.slice(ids.length)) {
    await input.checkpoint([...ids, null]);
    let id: number | null;
    try { id = await input.send(text); } catch { return failed("telegram_delivery_needs_review"); }
    if (id === null) {
      await input.checkpoint([...ids]);
      return failed("telegram_rejected");
    }
    if (!Number.isSafeInteger(id) || id <= 0) return failed("telegram_delivery_needs_review");
    ids.push(id);
    await input.checkpoint([...ids]);
  }
  return { status: "sent" as const, messageIds: ids };
}
