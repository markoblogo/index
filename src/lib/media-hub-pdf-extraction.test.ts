import { deflateSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn(() => { throw new Error("ENOENT"); }) }));
import { extractPdfContent } from "./media-hub-pdf-extraction";

function fixture(text: string) {
  const stream = deflateSync(Buffer.from(`BT /F1 12 Tf 30 700 Td (${text}) Tj ET`));
  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`), stream, Buffer.from("\nendstream")]),
  ];
  const parts = [Buffer.from("%PDF-1.4\n")];
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.concat(parts).length);
    parts.push(Buffer.from(`${i + 1} 0 obj\n`), objects[i], Buffer.from("\nendobj\n"));
  }
  const xref = Buffer.concat(parts).length;
  parts.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return Buffer.concat(parts);
}

const options = { maxPreviewPages: 2, maxTextChars: 18000, previewsEnabled: false };
describe("serverless PDF text extraction", () => {
  it("reads compressed text and exact numbers without Poppler", async () => {
    const result = await extractPdfContent(fixture("UZ rail freight: 1234.5 tonnes; previous: 1200 tonnes."), "uz.pdf", options);
    expect(result.parser).toBe("pdfjs");
    expect(result.text).toContain("1234.5 tonnes");
    expect(result.text).toContain("1200 tonnes");
    expect(result.warnings).toEqual([]);
  });
  it("never treats binary or parenthesized metadata as report evidence", async () => {
    const result = await extractPdfContent(Buffer.from("not a PDF (invented freight: 99999 tonnes)"), "broken.pdf", options);
    expect(result.text).toBe("");
    expect(result.parser).toBe("none");
    expect(result.warnings).toContain("pdf_text_unavailable");
  });
  it("records bounded text truncation", async () => {
    const result = await extractPdfContent(fixture("UZ statistics ".repeat(50)), "uz.pdf", { ...options, maxTextChars: 40 });
    expect(result.text.length).toBeLessThanOrEqual(40);
    expect(result.warnings).toContain("text_truncated");
  });
});
