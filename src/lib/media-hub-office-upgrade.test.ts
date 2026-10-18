import { beforeEach, describe, expect, it, vi } from "vitest";
import { strToU8, zipSync } from "fflate";

const { query, execute } = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: { $queryRawUnsafe: query, $executeRawUnsafe: execute }, hasDatabaseUrl: () => true }));
import { ingestMediaHubFileMaterial } from "./media-hub-manual-materials";

describe("per-file Drive Office reprocessing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.mockImplementation(async (sql: string) => sql.includes('"contentHash" = $2') ? [{ id: "existing-material", extractionStatus: "partial" }] : []);
    execute.mockResolvedValue(1);
  });
  const input = { filename: "weekly.docx", kind: "weekly_material" as const, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", receivedFrom: "google-drive" as const, sourceType: "google_drive_file" as const, tenantId: "spike-ua" as const };

  it("upgrades metadata-only rows and appends text assets without duplicating original files", async () => {
    const bytes = Buffer.from(zipSync({ "word/document.xml": strToU8('<w:document><w:p><w:r><w:t>Кукурудза: 210 USD/t</w:t></w:r></w:p></w:document>') }));
    const result = await ingestMediaHubFileMaterial({ ...input, bytes });
    expect(result).toMatchObject({ id: "existing-material", extractionStatus: "extracted" });
    const update = execute.mock.calls.find((call) => call[0].includes('UPDATE "MediaHubManualMaterial"'));
    expect(update?.[2]).toContain("210 USD/t");
    expect(execute.mock.calls.filter((call) => call[0].includes('INSERT INTO "MediaHubManualMaterialAsset"')).every((call) => call[3] !== "original")).toBe(true);
  });

  it("records an unsuccessful parser attempt so a corrupt version cannot stall every batch", async () => {
    expect(await ingestMediaHubFileMaterial({ ...input, bytes: Buffer.from("corrupt DOCX") })).toMatchObject({ id: "existing-material", extractionStatus: "partial" });
    const update = execute.mock.calls.find((call) => call[0].includes('UPDATE "MediaHubManualMaterial"'));
    expect(update?.[4]).toContain("ooxml-bounded-v1");
  });
});
