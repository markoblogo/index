import { expect, it } from "vitest";
import { renderSsiWeeklyGrounding, extendSsiWeeklyEvidence } from "./ssi-weekly-grounding";
import type { PublicHistoryItem, PublicLatestItem } from "./public-api-data";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
const row = (date: string, value: number) => ({ commodityCode: "CORN", basis: "CPT Odesa", date, valueUsdPerMt: value, respondents: 1 }) as PublicHistoryItem;
it("separates monetary blocks from tonnes and scales million/billion USD deterministically", () => {
  const material = { id: "sheet", originalFilename: "agro_ex_im.xlsx", extractionStatus: "extracted", extractedText: "", extractedTables: [{
    sheetName: "export", header: ["Експорт товарів, тис. дол. США"], rows: [
      ["№", "Країна", "Всього", "1001 Пшениця"], ["", "Всього", "1505000", "181000"],
      ["Експорт товарів, оформлених по 29.10.2026, т"], ["№", "Країна", "Всього", "1001 Пшениця"],
      ["", "Всього", "2872000", "949900"], ["1", "Польща", "100", "100"],
    ],
  }] } as MediaHubManualMaterialDigest;
  const text = renderSsiWeeklyGrounding({ latestData: [], manualMaterials: [material], periodEndDate: "2026-10-30" });
  expect(text).toContain('"millionUSD":1505'); expect(text).toContain('"billionUSD":1.505');
  expect(text).toContain('"millionTonnes":2.872'); expect(text).not.toContain('"tonnes":1505000');
});
it("uses the two exact published Fridays, not the latest daily zero", () => {
  const text = renderSsiWeeklyGrounding({ latestData: [{ ...row("2026-10-30", 155), changeAbs: 0 } as PublicLatestItem], historyData: [row("2026-10-23", 160), row("2026-10-30", 155)], periodEndDate: "2026-10-30" });
  expect(text).toContain('"weeklyChangeAbs":-5'); expect(text).toContain('"previousValue":160');
  expect(renderSsiWeeklyGrounding({ latestData: [row("2026-10-30", 155)], historyData: [row("2026-10-30", 155)], periodEndDate: "2026-10-30" })).toContain('"weeklyChangeAbs":null');
});
it("grounds in extracted PDF contents, not only the email-header summary", () => {
  const material = { id: "pdf", extractedText: "Email header. ".repeat(100) + "Verified rail loading 42.2 thousand tonnes for October 29.", summary: "Email header", sourceType: "google_drive_file", sourceDomain: null, originalUrl: null, originalFilename: "UZ.pdf", receivedAt: new Date("2026-10-31") } as MediaHubManualMaterialDigest;
  expect(renderSsiWeeklyGrounding({ latestData: [], manualMaterials: [material], periodEndDate: "2026-10-30" })).toContain("Verified rail loading 42.2");
  const evidence = extendSsiWeeklyEvidence([], [material], "Verified rail loading 42.2 thousand tonnes");
  expect(evidence.some(item => item.excerpt.includes("Verified rail loading 42.2"))).toBe(true);
  expect(evidence.every(item => material.extractedText.replace(/\s+/g, " ").includes(item.excerpt))).toBe(true);
});
it("adds auditable published weekly arithmetic to evidence without reusing daily deltas", () => {
  const evidence = extendSsiWeeklyEvidence([], [], "", [row("2026-10-23", 160), row("2026-10-30", 155)], "2026-10-30");
  expect(evidence).toHaveLength(1);
  expect(evidence[0].excerpt).toContain('"weeklyChangeAbs":-5');
  expect(evidence[0].sourceDate).toBe("2026-10-30");
});
it("preserves checked image-table cells, page, date and unit when native PDF text has no quote", () => {
  const material = { id: "image-pdf", originalFilename: "market.pdf", extractedText: "Email header only", extractionStatus: "extracted",
    extractedTables: [{ parser: "pdf-tables-v1", title: "Corn futures", unit: "cents/bushel", observationDate: "2026-10-30", sourcePage: 3,
      imageSha256: "a".repeat(64), header: ["Contract", "Settlement"], rows: [["December 2026", "456.25"]] }],
    receivedAt: new Date("2026-10-31"), originalUrl: null, sourceType: "google_drive_file",
  } as MediaHubManualMaterialDigest;
  const prompt = renderSsiWeeklyGrounding({ latestData: [], manualMaterials: [material], periodEndDate: "2026-10-30" });
  expect(prompt).toContain('"December 2026","456.25"'); expect(prompt).toContain("market.pdf page 3");
  expect(prompt).toContain("units: cents/bushel | observation: 2026-10-30");
  expect(extendSsiWeeklyEvidence([], [material], "Corn futures December 2026 456.25 cents/bushel").some(item => item.excerpt.includes("456.25"))).toBe(true);
});
