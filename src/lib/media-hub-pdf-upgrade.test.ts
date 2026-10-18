import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
