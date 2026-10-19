import { getIsoWeekday, getMediaHubLocalTimeParts, shiftIsoDate } from "./media-hub-schedule";
import { SSI_PERIODIC_PUBLICATION_HOLD_RESULT } from "./ssi-periodic-publication-hold";

export type SsiWeeklyPhase = "prepare" | "send";

export function getSsiWeeklyIntakeEndDate(periodEndDate: string) {
  return getIsoWeekday(periodEndDate) === 5 ? shiftIsoDate(periodEndDate, 1) : periodEndDate;
}

export function getSsiWeeklySlot(now: Date) {
  const local = getMediaHubLocalTimeParts(now, "Europe/Kyiv");
  if (getIsoWeekday(local.date) !== 7) return null;
  const minutes = local.hour * 60 + local.minute;
  const phase: SsiWeeklyPhase | null = minutes < 540 ? "prepare" : minutes <= 570 ? "send" : null;
  if (!phase) return null;
  return {
    phase,
    periodEndDate: shiftIsoDate(local.date, -2),
    intakeEndDate: shiftIsoDate(local.date, -1),
    deliveryDate: local.date,
    timezone: "Europe/Kyiv",
  };
}

type Outcome = { status: string; [key: string]: unknown };
export type SsiWeeklyDependencies = {
  held: boolean;
  ssiTenant: boolean;
  sync: () => Promise<{ status: string; remainingCount?: number }>;
  gate: (date: string) => Promise<Outcome | null>;
  report: (date: string) => Promise<{ status: string; telegramSentAt: Date | string | null } | null>;
  publish: (date: string) => Promise<Outcome>;
  send: (date: string) => Promise<Outcome>;
};

// No channel sender is available during preparation; send never generates.
export async function runSsiWeeklyPhase(phase: SsiWeeklyPhase, now: Date, deps: SsiWeeklyDependencies): Promise<Outcome> {
  if (!deps.ssiTenant) return { status: "skipped", skippedReason: "ssi_only_workflow" };
  if (deps.held) return SSI_PERIODIC_PUBLICATION_HOLD_RESULT;
  const slot = getSsiWeeklySlot(now);
  if (!slot || slot.phase !== phase) return { status: "skipped", skippedReason: "outside_ssi_weekly_phase" };
  const existing = await deps.report(slot.periodEndDate);
  if (phase === "send") {
    if (existing?.telegramSentAt) return { ...slot, status: "skipped", skippedReason: "already_sent" };
    if (existing?.status !== "published") return { ...slot, status: "blocked", skippedReason: "weekly_report_not_ready" };
    return { ...slot, ...await deps.send(slot.periodEndDate) };
  }
  if (existing?.status === "published") return { ...slot, status: "skipped", skippedReason: "weekly_report_already_prepared" };
  const imported = await deps.sync();
  if (imported.status !== "processed" || imported.remainingCount !== 0) {
    return { ...slot, status: "blocked", skippedReason: "drive_import_incomplete", imported };
  }
  const blocked = await deps.gate(slot.periodEndDate);
  if (blocked) return { ...slot, ...blocked };
  return { ...slot, ...await deps.publish(slot.periodEndDate) };
}
