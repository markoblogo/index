import { expect, it } from "vitest";
import { renderSsiWeeklyGrounding, extendSsiWeeklyEvidence } from "./ssi-weekly-grounding";
import type { PublicHistoryItem, PublicLatestItem } from "./public-api-data";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
const row = (date: string, value: number) => ({ commodityCode: "CORN", basis: "CPT Odesa", date, valueUsdPerMt: value, respondents: 1 }) as PublicHistoryItem;
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
