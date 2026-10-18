import { describe, expect, it } from "vitest";
import { sanitizeMaterialStorageText } from "./media-hub-material-text";

describe("material text storage safety", () => {
  it("removes PDF NUL bytes from text, table cells and nested metadata while retaining original bytes", () => {
    const original = Buffer.from([0x25, 0x50, 0x44, 0x46, 0, 0xff]);
    const extracted = {
      contentBytes: original,
      extraction: {
        extractedText: "Кукурудза\u0000210 USD/t",
        extractedTables: [{ rows: [["corn", "210\u0000"]] }],
        assets: [{ bytes: original, extractedText: "PDF\u0000text", metadata: { note: "row\u0000header" } }],
      },
    };
    const stored = sanitizeMaterialStorageText(extracted);
    expect(stored.extraction.extractedText).toBe("Кукурудза 210 USD/t");
    expect(stored.extraction.extractedTables[0].rows[0]).toEqual(["corn", "210 "]);
    expect(JSON.stringify(stored.extraction)).not.toContain("\\u0000");
    expect(stored.contentBytes).toBe(original);
    expect(stored.extraction.assets[0].bytes).toBe(original);
    expect(extracted.extraction.extractedText).toContain("\u0000");
  });
});
