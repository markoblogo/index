import { isBearerTokenAuthorized } from "./cron-auth";
import { getSsiMacWakeWeek } from "./ssi-weekly-paired-draft";

export function authorizeSsiVideoWorker(request: Request, input: {
  secret?: string; enabled: boolean; ssiTenant: boolean; held: boolean; startDate: string; now: Date;
}) {
  if (!isBearerTokenAuthorized(request, [input.secret])) return { status: 401, reason: "unauthorized" };
  if (!input.enabled || !input.ssiTenant) return { status: 403, reason: "paired_drafts_disabled" };
  if (input.held) return { status: 423, reason: "ssi_periodic_quality_hold" };
  const week = getSsiMacWakeWeek(input.now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !week || week.deliveryDate < input.startDate) return { status: 409, reason: "outside_authorized_sunday" };
  return { status: 200, week };
}
