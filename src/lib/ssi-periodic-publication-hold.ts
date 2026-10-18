export const SSI_PERIODIC_PUBLICATION_HOLD_RESULT = {
  status: "skipped",
  skippedReason: "ssi_periodic_quality_hold",
} as const;

export function isSsiPeriodicPublicationHeld(tenantId: string, kind: string) {
  return tenantId === "spike-ua" && (kind === "weekly" || kind === "monthly") &&
    process.env.MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD === "1";
}
