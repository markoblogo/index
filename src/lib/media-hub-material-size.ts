export const GOOGLE_DRIVE_MATERIAL_MAX_BYTES = 50 * 1024 * 1024;

/** The configured, authenticated Drive importer already bounds downloads at 50 MiB. */
export function mediaHubMaterialByteLimit(configuredMb: string | undefined, receivedFrom?: string) {
  if (receivedFrom === "google-drive") return GOOGLE_DRIVE_MATERIAL_MAX_BYTES;
  const configured = Number(configuredMb ?? 20);
  return Math.max(1, Math.min(50, configured || 20)) * 1024 * 1024;
}
