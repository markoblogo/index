export type SsiWorkerStage = "drive_refresh" | "drive_listing" | "drive_versions" | "drive_download" | "drive_extraction" | "drive_receipt" | "drive_checkpoint";

class SsiWorkerStageError extends Error {
  constructor(readonly stage: SsiWorkerStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : "video_worker_operation_failed", { cause });
  }
}

export async function withSsiWorkerStage<T>(stage: SsiWorkerStage, work: () => Promise<T>): Promise<T> {
  try { return await work(); } catch (error) { throw new SsiWorkerStageError(stage, error); }
}

const knownMessages = new Map([
  ["Google Drive refresh token expired or was revoked; reconnect the Drive account.", "drive_reconnect_required"],
  ["Google Drive OAuth client credentials were rejected.", "drive_oauth_client_rejected"],
  ["Google Drive OAuth is not configured.", "drive_oauth_not_configured"],
  ["Google Drive account has not been connected.", "drive_account_not_connected"],
  ["Google Drive access token refresh failed.", "drive_token_refresh_failed"],
  ["Google returned no Drive access token.", "drive_access_token_missing"],
  ["Google Drive file listing failed.", "drive_listing_failed"],
  ["Stored Google Drive credential is invalid.", "drive_credential_invalid"],
]);
const networkCodes = new Set(["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"]);

/** Metadata-only diagnostics. Never return raw messages, SQL, stacks or provider bodies. */
export function ssiWorkerFailure(error: unknown) {
  const stage = error instanceof SsiWorkerStageError ? error.stage : undefined;
  const original = error instanceof SsiWorkerStageError ? error.cause : error;
  const message = original instanceof Error ? original.message : "";
  const record = original && typeof original === "object" ? original as Record<string, unknown> : {};
  const cause = record.cause && typeof record.cause === "object" ? record.cause as Record<string, unknown> : {};
  const meta = record.meta && typeof record.meta === "object" ? record.meta as Record<string, unknown> : {};
  const rawCode = typeof record.code === "string" ? record.code : typeof cause.code === "string" ? cause.code : "";
  const code = /^(P\d{4}|[0-9][0-9A-Z]{4})$/.test(rawCode) || networkCodes.has(rawCode) ? rawCode : undefined;
  const databaseCode = typeof meta.code === "string" && /^[0-9A-Z]{5}$/.test(meta.code) ? meta.code : undefined;
  const errorType = original instanceof Error && ["Error", "TypeError", "TimeoutError", "AbortError", "PrismaClientKnownRequestError", "PrismaClientUnknownRequestError"].includes(original.name)
    ? original.name : "Error";
  const httpStatus = typeof record.httpStatus === "number" && Number.isInteger(record.httpStatus) && record.httpStatus >= 400 && record.httpStatus <= 599 ? record.httpStatus : undefined;
  const reason = /^[a-z0-9_]+$/.test(message) ? message : knownMessages.get(message) ??
    (/^Google Drive download failed for /.test(message) ? "drive_download_failed" :
      /^Google Drive material intake failed for /.test(message) ? "drive_material_intake_failed" :
      code?.startsWith("P") || databaseCode ? "worker_database_failed" :
      stage && ["TimeoutError", "AbortError"].includes(errorType) ? "drive_request_timeout" :
      stage && code && networkCodes.has(code) ? "drive_network_failed" : "video_worker_operation_failed");
  return { reason, details: { ...(stage ? { stage } : {}), errorType,
    ...(code ? { code } : {}), ...(databaseCode ? { databaseCode } : {}), ...(httpStatus ? { httpStatus } : {}) } };
}
