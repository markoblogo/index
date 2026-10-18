import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const { query, execute, extract } = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), extract: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $queryRawUnsafe: query, $executeRawUnsafe: execute }, hasDatabaseUrl: () => true }));
vi.mock("./media-hub-pdf-extraction", () => ({ extractPdfContent: extract }));
import { ingestMediaHubFileMaterial } from "./media-hub-manual-materials";

describe("per-file Drive PDF repair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "");
    query.mockImplementation(async (sql: string) => sql.includes('"contentHash" = $2') ? [{ id: "existing-pdf", extractionStatus: "partial" }] : []);
    execute.mockResolvedValue(1);
    extract.mockResolvedValue({ parser: "pdfjs", text: "Статистичні дані щодо перевезення зернових вантажів: 1234.5 тонн. ".repeat(5), previewAssets: [], warnings: [] });
  });
  afterEach(() => vi.unstubAllEnvs());
  const input = { filename: "uz.pdf", bytes: Buffer.from("preserved original PDF"), mimeType: "application/pdf", kind: "weekly_material" as const, receivedFrom: "google-drive" as const, sourceType: "google_drive_file" as const, tenantId: "spike-ua" as const };
  it("replaces legacy extraction without replacing originals or reporting dates", async () => {
    expect(await ingestMediaHubFileMaterial(input)).toMatchObject({ id: "existing-pdf", extractionStatus: "extracted" });
    const update = execute.mock.calls.find(c => c[0].includes('UPDATE "MediaHubManualMaterial"'));
    expect(update?.[2]).toContain("1234.5 тонн");
    expect(update?.[4]).toContain("pdfjs-bounded-v1");
    expect(update?.[0]).not.toContain('"reportingDate"');
    expect(execute.mock.calls.filter(c => c[0].includes('INSERT INTO "MediaHubManualMaterialAsset"')).every(c => c[3] !== "original")).toBe(true);
  });
  it("clears unusable legacy text and records a failed parser attempt once", async () => {
    extract.mockResolvedValue({ parser: "none", text: "", previewAssets: [], warnings: ["pdf_has_no_text_layer"] });
    expect(await ingestMediaHubFileMaterial(input)).toMatchObject({ id: "existing-pdf", extractionStatus: "unsupported" });
    const update = execute.mock.calls.find(c => c[0].includes('UPDATE "MediaHubManualMaterial"'));
    expect(update?.[2]).toBe("");
    expect(update?.[4]).toContain("pdfjs-bounded-v1");
  });
  it("allows administrator OCR repair only for the exact original PDF bytes", async () => {
    query.mockImplementation(async (sql: string) => sql.includes('"contentHash" = $2') ? [{ id: "existing-pdf", extractionStatus: "partial_visual_pending", contentHash: createHash("sha256").update(input.bytes).digest("hex") }] : []);
    expect(await ingestMediaHubFileMaterial({ ...input, receivedFrom: "admin" })).toMatchObject({ id: "existing-pdf", extractionStatus: "extracted" });
    const update = execute.mock.calls.find(c => c[0].includes('UPDATE "MediaHubManualMaterial"'));
    expect(update).toBeDefined();
    expect(update?.[0]).not.toContain('"reportingDate"');
    expect(update?.[0]).not.toContain('"canonicalUrl"');
    expect(execute.mock.calls.filter(c => c[0].includes('INSERT INTO "MediaHubManualMaterialAsset"')).every(c => c[3] !== "original")).toBe(true);
  });
  it("does not let a canonical-URL match replace different PDF bytes or Telegram duplicates", async () => {
    query.mockImplementation(async (sql: string) => sql.includes('"contentHash" = $2') ? [{ id: "existing-pdf", extractionStatus: "partial_visual_pending", contentHash: "different-original" }] : []);
    expect(await ingestMediaHubFileMaterial({ ...input, receivedFrom: "admin" })).toMatchObject({ id: "existing-pdf", extractionStatus: "duplicate" });
    expect(await ingestMediaHubFileMaterial({ ...input, receivedFrom: "telegram" })).toMatchObject({ id: "existing-pdf", extractionStatus: "duplicate" });
    expect(execute.mock.calls.some(c => c[0].includes('UPDATE "MediaHubManualMaterial"'))).toBe(false);
  });
});
