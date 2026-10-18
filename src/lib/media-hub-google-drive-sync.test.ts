import { createCipheriv, createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query, execute, ingest } = vi.hoisted(() => ({
  query: vi.fn(), execute: vi.fn(), ingest: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({
  db: { $queryRawUnsafe: query, $executeRawUnsafe: execute },
  hasDatabaseUrl: () => true,
}));
vi.mock("./media-hub-manual-materials", () => ({ ingestMediaHubFileMaterial: ingest }));
import { syncGoogleDriveContextMaterials } from "./media-hub-google-drive";
import type { MaterialIngestResult } from "./media-hub-manual-materials";

const storedResult: MaterialIngestResult = {
  id: "stored-material", extractionStatus: "extracted", kind: "weekly_material",
  tenantId: "spike-ua", message: "Stored.",
};

const secret = "test-drive-secret";
const iv = Buffer.alloc(12, 1);
const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(`ssi-drive-token-v1:${secret}`).digest(), iv);
const encrypted = Buffer.concat([cipher.update("test-refresh-token"), cipher.final()]);
const storedToken = `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
const files = Array.from({ length: 22 }, (_, index) => ({
  id: `file-${index + 1}`, name: `agro_ex_im-${index + 1}.csv`,
  mimeType: "text/csv", modifiedTime: new Date(Date.UTC(2026, 9, 10, 0, index)).toISOString(),
}));

describe("resumable Google Drive sync", () => {
  beforeEach(() => {
    vi.stubEnv("MEDIA_HUB_GOOGLE_DRIVE_CLIENT_ID", "test-client");
    vi.stubEnv("MEDIA_HUB_GOOGLE_DRIVE_CLIENT_SECRET", secret);
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("MediaHubGoogleDriveCredential")) return [{ refreshTokenCiphertext: storedToken }];
      if (sql.includes("MediaHubGoogleDriveSyncState")) return [];
      return [];
    });
    execute.mockResolvedValue(1);
    ingest.mockResolvedValue(storedResult);
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "access" });
      if (url.includes("alt=media")) return new Response("price\n210");
      return Response.json({ files });
    }));
  });
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("bounds a run and checkpoints completed files rather than jumping to today", async () => {
    const result = await syncGoogleDriveContextMaterials();
    expect(ingest).toHaveBeenCalledTimes(20);
    expect(result).toMatchObject({ status: "partial", remainingCount: 2 });
    expect(execute.mock.calls.at(-1)?.[1]).toEqual(new Date(files[19].modifiedTime));
  });

  it("skips already imported versions before downloading or extracting", async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes("MediaHubGoogleDriveCredential")) return [{ refreshTokenCiphertext: storedToken }];
      if (sql.includes("MediaHubGoogleDriveSyncState")) return [];
      return files.map((file) => ({ canonicalUrl: `https://drive.google.com/file/d/${file.id}/view?driveVersion=${encodeURIComponent(file.modifiedTime)}` }));
    });
    expect(await syncGoogleDriveContextMaterials()).toMatchObject({ status: "processed", alreadyImportedCount: 22 });
    expect(ingest).not.toHaveBeenCalled();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(2);
  });

  it("keeps progress when a later download fails", async () => {
    const baseFetch = fetch;
    vi.stubGlobal("fetch", vi.fn((input: string | URL, init?: RequestInit) =>
      String(input).includes("file-2?alt=media")
        ? Promise.resolve(new Response("unavailable", { status: 503 }))
        : baseFetch(input, init)));
    await expect(syncGoogleDriveContextMaterials()).rejects.toThrow("download failed");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[1]).toEqual(new Date(files[0].modifiedTime));
  });

  it("does not checkpoint a failed extraction", async () => {
    ingest.mockResolvedValue({ ...storedResult, id: undefined, extractionStatus: "failed", message: "File exceeds Context material size limit." });
    await expect(syncGoogleDriveContextMaterials()).rejects.toThrow("intake failed");
    expect(execute).not.toHaveBeenCalled();
  });
});
