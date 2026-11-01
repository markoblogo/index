import { createCipheriv, createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), ingest: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $queryRawUnsafe: mocks.query, $executeRawUnsafe: mocks.execute }, hasDatabaseUrl: () => true }));
vi.mock("@/lib/media-hub-manual-materials", () => ({ ingestMediaHubFileMaterial: mocks.ingest }));
vi.mock("@/lib/ssi-weekly-logistics-control", () => ({ classifySsiWeeklyLogisticsTypeFromFilename: () => undefined }));
import { syncGoogleDriveContextMaterials } from "./media-hub-google-drive";

function credential() {
  const iv = Buffer.alloc(12, 7), key = createHash("sha256").update("ssi-drive-token-v1:fixture-client-secret").digest();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const value = Buffer.concat([cipher.update("fixture-refresh-token"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${value.toString("base64url")}`;
}
let receipts: string[];
let files: Array<{ id: string; name: string; mimeType: string; modifiedTime: string; size: string }>;
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-01T07:00:00Z"));
  vi.stubEnv("MEDIA_HUB_GOOGLE_DRIVE_CLIENT_SECRET", "fixture-client-secret");
  vi.stubEnv("MEDIA_HUB_GOOGLE_DRIVE_CLIENT_ID", "fixture-client");
  receipts = [];
  files = Array.from({ length: 21 }, (_, i) => ({ id: `file-${i}`, name: `agro_ex_im ${i}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: "4",
    modifiedTime: `2026-10-31T20:00:${String(i).padStart(2, "0")}.000Z` }));
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.includes('SELECT "refreshTokenCiphertext"')) return [{ refreshTokenCiphertext: credential() }];
    if (sql.includes('SELECT "lastSuccessfulSyncAt"')) return [{ lastSuccessfulSyncAt: new Date("2026-10-31T20:00:00Z") }];
    return sql.includes('private."MediaHubGoogleDriveVersionReceipt"') ? receipts.map(canonicalUrl => ({ canonicalUrl })) : [];
  });
  mocks.execute.mockImplementation(async (sql: string, ...args: unknown[]) => {
    if (sql.includes('INSERT INTO private."MediaHubGoogleDriveVersionReceipt"')) receipts.push(String(args[0]));
    return 1;
  });
  mocks.ingest.mockResolvedValue({ id: "existing-content", extractionStatus: "duplicate", kind: "weekly_material", tenantId: "spike-ua" });
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "fixture-access", expires_in: 3600 });
    if (url.includes("alt=media")) return new Response("same");
    return Response.json({ files });
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Drive version progress independent of content deduplication", () => {
  it("finishes overlapping batches of byte-identical files without relabeling observations", async () => {
    const first = await syncGoogleDriveContextMaterials();
    expect(first.remainingCount).toBe(1);
    const second = await syncGoogleDriveContextMaterials();
    expect(second.status).toBe("processed");
    expect(second.remainingCount).toBe(0);
    expect(second.alreadyImportedCount).toBe(20);
    expect(mocks.ingest).toHaveBeenCalledTimes(21);
    expect(receipts).toHaveLength(21);
    expect(mocks.execute.mock.calls.some(([sql]) => /UPDATE\s+"MediaHubManualMaterial"/.test(String(sql)))).toBe(false);
  });
  it("does not checkpoint a failed extraction as a completed version", async () => {
    mocks.ingest.mockResolvedValue({ extractionStatus: "failed" });
    await expect(syncGoogleDriveContextMaterials()).rejects.toThrow("intake failed");
    expect(receipts).toEqual([]);
  });
  it("keeps explicit OCR repair eligibility in the joined receipt lookup", async () => {
    files = [files[0]];
    await syncGoogleDriveContextMaterials({ rescanRecent: true });
    const sql = String(mocks.query.mock.calls.find(([sql]) => String(sql).includes('"canonicalUrl" = ANY'))?.[0]);
    expect(sql).toContain('private."MediaHubGoogleDriveVersionReceipt"');
    expect(sql).toContain('"MediaHubManualMaterial"');
    expect(sql).toContain("pdfTableOcrAttempt");
    expect(sql).toContain("partial_visual_pending");
  });
});
