import { describe, expect, it } from "vitest";
import { ssiWorkerFailure, withSsiWorkerStage } from "./ssi-weekly-worker-diagnostics";

describe("SSI worker metadata-only diagnostics", () => {
  it("classifies revoked Drive access without exposing the provider message", async () => {
    const error = await withSsiWorkerStage("drive_refresh", async () => {
      throw new Error("Google Drive refresh token expired or was revoked; reconnect the Drive account.");
    }).catch(error => error);
    expect(ssiWorkerFailure(error)).toEqual({ reason: "drive_reconnect_required", details: { stage: "drive_refresh", errorType: "Error" } });
  });
  it("retains database error codes but never raw queries, tokens or file names", async () => {
    const error = await withSsiWorkerStage("drive_versions", async () => {
      throw Object.assign(new Error("SQL SELECT refreshTokenCiphertext; Bearer fixture-secret; customer.pdf"),
        { code: "P2010", meta: { code: "42702", message: "fixture-secret" } });
    }).catch(error => error);
    expect(ssiWorkerFailure(error)).toEqual({ reason: "worker_database_failed", details: { stage: "drive_versions", errorType: "Error", code: "P2010", databaseCode: "42702" } });
    expect(JSON.stringify(ssiWorkerFailure(error))).not.toMatch(/fixture-secret|SELECT|customer\.pdf/);
  });
  it("keeps network causes and bounded HTTP statuses without provider payloads", async () => {
    const error = await withSsiWorkerStage("drive_download", async () => {
      throw new TypeError("fetch failed: Bearer fixture-secret", { cause: { code: "ECONNRESET" } });
    }).catch(error => error);
    expect(ssiWorkerFailure(error)).toEqual({ reason: "drive_network_failed", details: { stage: "drive_download", errorType: "TypeError", code: "ECONNRESET" } });
    expect(ssiWorkerFailure(Object.assign(new Error("Google Drive file listing failed."), { httpStatus: 403 }))).toMatchObject({ reason: "drive_listing_failed", details: { httpStatus: 403 } });
  });
  it("preserves existing guarded workflow reasons and does not alter successful work", async () => {
    expect(ssiWorkerFailure(new Error("weekly_report_needs_review")).reason).toBe("weekly_report_needs_review");
    expect(await withSsiWorkerStage("drive_listing", async () => 42)).toBe(42);
    expect(ssiWorkerFailure(new Error("unknown Bearer fixture-secret")).reason).toBe("video_worker_operation_failed");
  });
});
