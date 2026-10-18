import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:child_process", () => ({ execFileSync: () => { throw new Error("ENOENT"); } }));
import { extractPdfContent } from "./media-hub-pdf-extraction";
import { enhancePdfTables } from "./media-hub-pdf-tables";
import { parsePdfTableResponse, renderPdfTableEvidence } from "./media-hub-pdf-table-evidence";
import { isSsiPeriodicPublicationHeld } from "./ssi-periodic-publication-hold";

function mixedPdf() {
  const image = deflateSync(Buffer.alloc(320 * 160 * 3, 255));
  const content = "BT /F1 12 Tf 30 730 Td (Email header: tables are attached below.) Tj ET q 320 0 0 160 30 300 cm /Im1 Do Q";
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents 6 0 R >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 320 /Height 160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.length} >>\nstream\n`), image, Buffer.from("\nendstream")]),
    Buffer.from(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
  ];
  const parts = [Buffer.from("%PDF-1.4\n")]; const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.concat(parts).length); parts.push(Buffer.from(`${i + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")); });
  const xref = Buffer.concat(parts).length;
  parts.push(Buffer.from(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return Buffer.concat(parts);
}
const reply = { tables: [{ title: "USDA carryout", unit: "billion bushels", observationDate: "October 2026", header: ["Crop", "Oct", "Sep"], rows: [["Corn", "1.849", "1.567"], ["Soy", "UNREADABLE", "0.310"]] }] };
const empty = { assets: [], extractedFacts: [], extractedTables: [], extractedText: "", extractionStatus: "partial_visual_pending" };
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("bounded PDF table intake", () => {
  it("retains mixed-document table images without Poppler and passes exact cells into report evidence", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "completed", output_text: JSON.stringify(reply) })));
    const pdf = await extractPdfContent(mixedPdf(), "mixed.pdf", { maxPreviewPages: 3, maxTextChars: 18000, previewsEnabled: true });
    expect(pdf.text).toContain("Email header"); expect(pdf.previewAssets).toHaveLength(1);
    expect(pdf.previewAssets[0]).toMatchObject({ pageNumber: 1, mimeType: "image/png" });
    const result = await enhancePdfTables({ ...empty, assets: pdf.previewAssets, extractedText: pdf.text }, "mixed.pdf", pdf.warnings);
    expect(result.extractionStatus).toBe("extracted");
    const evidence = renderPdfTableEvidence([{ id: "material", originalFilename: "mixed.pdf", extractedTables: result.extractedTables }]).join("\n");
    expect(evidence).toContain('"Corn","1.849","1.567"'); expect(evidence).toContain("billion bushels");
    expect(evidence).toContain("UNREADABLE"); expect(evidence).toContain("page 1");
    const request = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(request.input[1].content[1].detail).toBe("high");
    expect(request.max_output_tokens).toBe(8000);
    expect(request.text.format.type).toBe("json_schema");
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("never promotes failed or disabled OCR to complete extraction", async () => {
    const image = { assetType: "preview_image" as const, bytes: Buffer.from("fixture"), pageNumber: 2, mimeType: "image/png" };
    vi.stubEnv("OPENAI_API_KEY", "");
    expect((await enhancePdfTables({ ...empty, assets: [image], extractedText: "email prose ".repeat(30) }, "tables.pdf", [])).extractionStatus).toBe("partial_visual_pending");
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "incomplete", output_text: JSON.stringify(reply) })));
    const failed = await enhancePdfTables({ ...empty, assets: [image] }, "tables.pdf", []);
    expect(failed.extractedTables).toEqual([]); expect(failed.extractionStatus).toBe("partial_visual_pending");
  });
  it("rejects missing, numeric or misaligned cells rather than shifting columns", () => {
    expect(() => parsePdfTableResponse(JSON.stringify({ tables: [{ ...reply.tables[0], rows: [["Corn", "1.849"]] }] }), 2, "hash")).toThrow("ragged");
    expect(() => parsePdfTableResponse(JSON.stringify({ tables: [{ ...reply.tables[0], rows: [["Corn", 1.849, "1.567"]] }] }), 2, "hash")).toThrow("cell");
  });
  it("records an output cap without accepting incomplete numeric evidence", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } })));
    const result = await enhancePdfTables({ ...empty, assets: [{ assetType: "preview_image", bytes: Buffer.from("fixture"), pageNumber: 2 }] }, "dense.pdf", []);
    expect(result.extractedTables).toEqual([]);
    expect(result.extractedFacts.at(-1)).toMatchObject({ failures: [{ page: 2, reason: "output_token_limit", elapsedMs: expect.any(Number) }] });
    expect(result.extractionStatus).toBe("partial_visual_pending");
  });
  it("classifies a response-body timeout without retaining provider or secret text", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => { throw new DOMException("private provider detail", "TimeoutError"); } })));
    const result = await enhancePdfTables({ ...empty, assets: [{ assetType: "preview_image", bytes: Buffer.from("fixture"), pageNumber: 2 }] }, "dense.pdf", []);
    expect(result.extractedFacts.at(-1)).toMatchObject({ failures: [{ page: 2, reason: "timeout", elapsedMs: expect.any(Number) }] });
    expect(JSON.stringify(result)).not.toContain("private provider detail");
    expect(JSON.stringify(result)).not.toContain("test-only");
    expect(result.extractionStatus).toBe("partial_visual_pending");
  });
  it("keeps table rows beyond a short material summary available to the report", () => {
    const table = parsePdfTableResponse(JSON.stringify(reply), 2, "hash")[0];
    const lines = renderPdfTableEvidence([{ id: "m", originalFilename: "USDA.pdf", extractedTables: [table] }]);
    expect(lines.join("\n")).toContain("1.849"); expect(lines.join("\n")).toContain("October 2026");
  });
  it("holds only SSI periodic publication, not daily or other tenants", () => {
    vi.stubEnv("MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD", "1");
    expect(isSsiPeriodicPublicationHeld("spike-ua", "weekly")).toBe(true);
    expect(isSsiPeriodicPublicationHeld("spike-ua", "monthly")).toBe(true);
    expect(isSsiPeriodicPublicationHeld("spike-ua", "daily")).toBe(false);
    expect(isSsiPeriodicPublicationHeld("1d3x", "weekly")).toBe(false);
  });
});
