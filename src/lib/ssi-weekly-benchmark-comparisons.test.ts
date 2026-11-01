import { describe, expect, it } from "vitest";
import { renderSsiWeeklySpreadsheetEvidence } from "./media-hub-ssi-weekly-pattern";
import { renderSsiWeeklyGrounding } from "./ssi-weekly-grounding";
import { selectSsiWeeklyComparisonMaterials, ssiWeeklyComparisonWindowStart } from "./ssi-weekly-comparison-materials";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";

// Synthetic observations, not values from the editorial benchmark.
function sheet(date: string, tonnes: number, dollars: number) {
  const [year, month, day] = date.split("-");
  const period = `з 01.${month}.${year} по ${day}.${month}.${year}`;
  return { sheetName: "export", header: [`Експорт товарів ${period}, тис. дол. США`], rows: [
    ["№", "Країна", "1001 Пшениця", "Всього"], ["", "Всього", String(dollars / 2), String(dollars)],
    [`Експорт товарів ${period}, т`], ["№", "Країна", "Всього", "1001 Пшениця"],
    ["", "Всього", String(tonnes), String(tonnes / 2)],
    ...Array.from({ length: 6 }, (_, i) => [String(i + 1), `Buyer ${i + 1}`, "10", String(6 - i)]),
  ] };
}
function material(date: string, tonnes: number, dollars: number) {
  return { id: date, originalFilename: `agro_ex_im_${date}.xlsx`, extractedText: "", extractionStatus: "extracted",
    extractedTables: [sheet(date, tonnes, dollars)], receivedFrom: "google-drive" } as MediaHubManualMaterialDigest & { receivedFrom: string };
}
function matrix(materials: MediaHubManualMaterialDigest[], end = "2026-02-20") {
  const lines = renderSsiWeeklyGrounding({ latestData: [], manualMaterials: materials, periodEndDate: end }).split("\n");
  return JSON.parse(lines[lines.findIndex(line => line.startsWith("DERIVED COMPARISON MATRIX.")) + 1]);
}

describe("SSI benchmark comparison evidence", () => {
  it("retains three exact cumulative cutoffs and the matched prior month, with independent money units", () => {
    const result = matrix([material("2026-02-19", 1200, 800), material("2026-02-12", 850, 600),
      material("2026-02-05", 500, 300), material("2026-01-19", 1000, 500)]);
    expect(result[0].inputs.map((item: { cutoff: string }) => item.cutoff)).toEqual([
      "2026-02-19", "2026-02-12", "2026-02-05", "2026-01-19",
    ]);
    expect(result[0].monthComparisons).toContainEqual({ metric: "Всього", unit: "tonnes", current: 1200, previous: 1000, change: 200, changePct: 20 });
    expect(result[0].monthComparisons).toContainEqual({ metric: "1001", unit: "thousand USD", current: 400, previous: 250, change: 150, changePct: 60 });
    expect(result[0].weeklyDailyPace).toContainEqual({ metric: "Всього", unit: "tonnes/day", current: 50, previous: 50, changePct: 0 });
    expect(result[0].gaps).toEqual([]);
  });
  it("does not invent a weekly rate from two cutoffs or substitute a nearby month date", () => {
    const result = matrix([material("2026-02-19", 1200, 800), material("2026-02-12", 850, 600),
      material("2026-01-18", 1000, 500)]);
    expect(result[0].weeklyDailyPace).toEqual([]);
    expect(result[0].monthComparisons).toEqual([]);
    expect(result[0].gaps).toHaveLength(2);
  });
  it("pairs dated dollar blocks separately and stops buyers at the next section", () => {
    const current = sheet("2026-02-19", 1200, 800), previous = sheet("2026-01-19", 1000, 500);
    current.rows.push([previous.header[0]], ...previous.rows);
    const input = material("2026-02-19", 1200, 800);
    input.extractedTables = [current];
    const blocks = renderSsiWeeklySpreadsheetEvidence([input], "2026-02-20").split("\n").slice(1).map(line => JSON.parse(line));
    expect(blocks[0].valueTotal.value).toBe("800");
    expect(blocks[1].valueTotal.value).toBe("500");
    expect(blocks[0].destinationsByCommodity[0].destinations.map((buyer: { country: string }) => buyer.country)).toEqual([
      "Buyer 1", "Buyer 2", "Buyer 3", "Buyer 4", "Buyer 5",
    ]);
  });
  it("does not use an undated currency block for several weight periods", () => {
    const current = sheet("2026-02-19", 1200, 800), previous = sheet("2026-01-19", 1000, 500);
    current.header = ["Експорт, тис. дол. США"];
    current.rows.push(...previous.rows.slice(2));
    const input = material("2026-02-19", 1200, 800);
    input.extractedTables = [current];
    const blocks = renderSsiWeeklySpreadsheetEvidence([input], "2026-02-20").split("\n").slice(1).map(line => JSON.parse(line));
    expect(blocks.every(block => !block.valueTotal && !block.valueByCommodity.length)).toBe(true);
  });
  it("keeps zero baselines distinct from absent cells and rejects falling cumulative rates", () => {
    const result = matrix([material("2026-02-19", 1200, 800), material("2026-02-12", 1300, 600),
      material("2026-02-05", 500, 300), material("2026-01-19", 0, 0)]);
    expect(result[0].weeklyDailyPace).toEqual([]);
    expect(result[0].monthComparisons).toContainEqual({ metric: "Всього", unit: "tonnes", current: 1200, previous: 0, change: 1200, changePct: null });
  });
  it("selects bounded historical candidates only for an available current family", () => {
    const current = material("2026-02-19", 1200, 800);
    const dates = ["2026-02-12", "2026-02-05", "2026-01-19", "2026-01-18", "2026-02-21"];
    const rows = dates.map(date => material(date, 10, 10));
    expect(selectSsiWeeklyComparisonMaterials(rows, [current], "2026-02-14", "2026-02-20").map(row => row.id)).toEqual([
      "2026-02-12", "2026-02-05", "2026-01-19",
    ]);
    expect(selectSsiWeeklyComparisonMaterials(rows, [], "2026-02-14", "2026-02-20")).toEqual([]);
    expect(ssiWeeklyComparisonWindowStart("2026-01-09")).toBe("2025-12-01");
  });
  it("does not roll a nonexistent previous-month day into the current month", () => {
    const current = material("2026-03-31", 1200, 800);
    const wrong = material("2026-03-03", 900, 600);
    expect(selectSsiWeeklyComparisonMaterials([wrong], [current], "2026-03-26", "2026-04-01")).toEqual([]);
  });
});
