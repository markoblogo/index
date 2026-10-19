import { describe, expect, it } from "vitest";
import { parsePdfTableResponse, validateStonexSnapshotCoverage } from "./media-hub-pdf-table-evidence";

// Source-family fixture: StoneX October USDA Snapshot, PDF page 2.
const header = ["", "USDA Oct 2026", "Average Trade Est.", "Estimate Range", "USDA Sep 2026", "StoneX Est.***"];
const fixture = { tables: [
  { title: "USDA 2026/27 US Carryout", unit: "Billion Bushels", observationDate: "October 2026", header,
    rows: [["Corn", "1.849", "1.670", "1.518-1.895", "1.567", "1.895"], ["Soybeans", "0.315", "0.305", "0.245-0.358", "0.310", "0.358"], ["Wheat", "0.740", "0.721", "0.692-0.750", "0.717", "0.730"]] },
  { title: "USDA 2026/27 World Carryout", unit: "Million Tonnes", observationDate: "October 2026", header,
    rows: [["Corn", "280.44", "273.78", "269.90-279.82", "272.10", "279.82"], ["Soybeans", "124.28", "123.33", "120.30-125.00", "124.02", "124.76"], ["Wheat", "276.04", "276.63", "274.60-279.60", "276.29", "279.60"]] },
  { title: "USDA 2026 US Production", unit: "Billion Bushels", observationDate: "October 2026", header,
    rows: [["Corn", "16.034", "15.721", "15.344-16.115", "15.800", "16.115"], ["Soybeans", "4.562", "4.534", "4.415-4.648", "4.535", "4.648"]] },
  { title: "USDA 2026 US Yield", unit: "Bushels per Acre", observationDate: "October 2026", header,
    rows: [["Corn", "181.2000", "177.7", "173.2-182.1", "178.5", "182.1"], ["Soybeans", "53.1000", "52.8", "51.4-54.1", "52.8", "54.1"]] },
] };
const context = "StoneX October USDA S&D Snapshot.pdf";
describe("StoneX Snapshot source-family integrity", () => {
  it("retains four tables, six aligned columns, units and exact reference strings", () => {
    const tables = parsePdfTableResponse(JSON.stringify(fixture), 2, "source-image");
    expect(() => validateStonexSnapshotCoverage(tables, context)).not.toThrow();
    expect(tables[0].rows[0][1]).toBe("1.849");
    expect(tables[0].rows[0][5]).toBe("1.895");
    expect(tables[1].rows[0][1]).toBe("280.44");
  });
  it("rejects the observed omission of three tables", () => {
    const tables = parsePdfTableResponse(JSON.stringify({ tables: fixture.tables.slice(0, 1) }), 2, "image");
    expect(() => validateStonexSnapshotCoverage(tables, context)).toThrow("table_coverage");
  });
  it("rejects a missing blank header even if row lengths still match", () => {
    const tables = parsePdfTableResponse(JSON.stringify(fixture), 2, "image");
    tables[0].header = tables[0].header.slice(1);
    tables[0].rows = tables[0].rows.map(row => row.slice(0, -1));
    expect(() => validateStonexSnapshotCoverage(tables, context)).toThrow("column_alignment");
  });
  it("distinguishes a wrong unit from an omitted crop row", () => {
    const tables = parsePdfTableResponse(JSON.stringify(fixture), 2, "image");
    tables[0].unit = "UNKNOWN";
    expect(() => validateStonexSnapshotCoverage(tables, context)).toThrow("stonex_snapshot_unit");
    tables[0].unit = "Billion Bushels";
    tables[0].rows.pop();
    expect(() => validateStonexSnapshotCoverage(tables, context)).toThrow("stonex_snapshot_rows");
  });
});
