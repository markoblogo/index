export function isSsiPeriodicPublicationHeld(tenantId: string, kind: string) {
  return tenantId === "spike-ua" && (kind === "weekly" || kind === "monthly") &&
    process.env.MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD === "1";
}
