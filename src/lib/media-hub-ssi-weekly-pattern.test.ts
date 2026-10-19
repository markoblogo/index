import { describe, expect, it } from "vitest";
import { renderSsiWeeklySpreadsheetEvidence } from "./media-hub-ssi-weekly-pattern";
import { buildMediaHubReportPrompt } from "./media-hub-report-prompts";

// Synthetic February examples deliberately differ from the October references.
const material = (id: string, originalFilename: string, extractedTables: unknown) => ({
  id, originalFilename, extractedTables, extractionStatus: "extracted",
});
const exportTable = (day: string, total: string, corn = "123") => ({
  sheetName: "export", header: ["Експорт, тис. дол. США"], rows: [
    ["№", "Країна", "Всього", "1005 Кукурудза"], ["", "Всього", "999999", "999999"],
    ["Експорт товарів 01-24 УКТ ЗЕД, оформлених з 01.02.2026 по " + day + ".02.2026, т"],
    ["№", "Країна", "Всього", "1005 Кукурудза"], ["", "Всього", total, corn],
    ["1", "Test destination", total, corn],
  ],
});

describe("SSI weekly structured evidence", () => {
  it("reaches the tonne block below truncated prose without mixing dollar values", () => {
    const result = renderSsiWeeklySpreadsheetEvidence([material("current", "agro_ex_im_26_02_12.xlsx", [exportTable("12", "12345")])], "2026-02-13");
    expect(result).toContain('"cohort":"customs_clearance"');
    expect(result).toContain('"total":["Всього","12345","123"]');
    expect(result).toContain('"valueTotal":{"unit":"thousand USD","value":"999999"}');
  });
  it("selects current and prior-week coverage, excluding intermediate, future and stale rollups", () => {
    const inputs = [
      material("intermediate", "agro_ex_im_26_02_10.xlsx", [exportTable("10", "10")]),
      material("baseline", "agro_ex_im_26_02_05.xlsx", [exportTable("05", "5")]),
      material("current", "agro_ex_im_26_02_12.xlsx", [exportTable("12", "12")]),
      material("future", "agro_ex_im_26_02_14.xlsx", [exportTable("14", "14")]),
      material("stale", "agro_ex_im_26_01_12.xlsx", [{ ...exportTable("12", "1"), rows: [["Експорт, оформлених з 01.01.2026 по 12.01.2026, т"], ["№", "Країна"], ["", "Всього"]] }]),
    ];
    const result = renderSsiWeeklySpreadsheetEvidence(inputs, "2026-02-13");
    expect(result).toContain('"materialId":"current"');
    expect(result).toContain('"materialId":"baseline"');
    for (const id of ["intermediate", "future", "stale"]) expect(result).not.toContain(`"materialId":"${id}"`);
  });
  it("keeps empty cells unknown and rejects partial or truncated tables", () => {
    const input = material("unknown", "agro_ex_im.xlsx", [exportTable("12", "12345", "")]);
    expect(renderSsiWeeklySpreadsheetEvidence([input], "2026-02-13")).toContain('"12345","UNKNOWN"');
    expect(renderSsiWeeklySpreadsheetEvidence([{ ...input, extractionStatus: "partial" }], "2026-02-13")).toBe("");
    input.extractedTables = [{ ...exportTable("12", "12345"), parseWarnings: ["table_truncated"] }];
    expect(renderSsiWeeklySpreadsheetEvidence([input], "2026-02-13")).toBe("");
  });
  it("selects the current road row rather than historical totals and keeps Danube separate", () => {
    const road = { sheetName: "check points", header: ["Через автомобільні пункти пропуску, з 01 по 12 лютого 2026 року, тонн"], rows: [
      ["Пункт пропуску", "Всього", "1005 Кукурудза"],
      ["Разом з 01 по 31 січня 2026 року", "999999", "999999"],
      ["Разом з 01 по 12 лютого 2026 року", "500", "100"], ["Crossing A", "500", "100"],
    ] };
    const danube = { ...road, sheetName: "порти Дунаю", header: ["В напрямку портів Дунаю, з 01 по 12 лютого 2026 року, тонн"] };
    const result = renderSsiWeeklySpreadsheetEvidence([material("crossings", "check points.xlsx", [road, danube])], "2026-02-13");
    expect(result).toContain('"cohort":"road_passage"');
    expect(result).toContain('"cohort":"danube_passage"');
    expect(result).not.toContain("999999");
  });
  it("preserves passage denominators and transport fractions in their own cohort", () => {
    const table = { sheetName: "TAB", header: ['Експорт відповідно до ПІК "Контроль за доставкою" ЄАІС, тонн'], rows: [
      ["", "", "26_02(12)"], ["", "Пропуск: товар/вид транспорту", ""],
      ["", "1005", "800"], ["", "Авто", "0.1"], ["", "Залізничний", "0.7"], ["", "Морський", "0.2"], ["", "Паром", "0"],
    ] };
    const result = renderSsiWeeklySpreadsheetEvidence([material("passage", "out_260212.xlsx", [table])], "2026-02-13");
    expect(result).toContain('"cohort":"border_passage"');
    expect(result).toContain('"tonnes":"800"');
    expect(result).toContain('["Залізничний","0.7"]');
  });
  it("applies the weekly contract only to SSI weekly prompts", () => {
    const base = { latestData: [], locale: "uk" as const, periodEndDate: "2026-02-13", periodStartDate: "2026-02-07", snapshots: [] };
    const weekly = buildMediaHubReportPrompt({ ...base, kind: "weekly", tenant: "spike" });
    expect(weekly).toContain("SSI weekly reference pattern v1");
    expect(weekly).toContain("The change field in latestData is daily");
    expect(buildMediaHubReportPrompt({ ...base, kind: "monthly", tenant: "spike" })).not.toContain("SSI weekly reference pattern v1");
    expect(buildMediaHubReportPrompt({ ...base, kind: "weekly", tenant: "platform" })).not.toContain("SSI weekly reference pattern v1");
  });
});
