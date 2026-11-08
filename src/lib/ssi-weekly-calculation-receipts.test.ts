import { expect, it } from "vitest";
import { ssiCalculationReceipts } from "./ssi-weekly-calculation-receipts";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
it("derives shares from the same dated source denominator, never the report or a neighboring crop", () => {
  const material = { id: "sheet", originalFilename: "agro_ex_im.xlsx", extractionStatus: "extracted", extractedTables: [{ sheetName: "export", header: [], rows: [
    ["unused"], ["Експорт товарів, оформлених з 01 по 05.11.2026, т"], ["№", "Країна", "Всього", "1005 Кукурудза", "1001 Пшениця", "1003 Ячмінь"],
    ["", "Всього", "100000", "20000", "30000", "10000"], ["1", "Італія", "10000", "8000", "1000", "1000"], ["2", "Туреччина", "5000", "2000", "3000", "0"],
  ] }] } as MediaHubManualMaterialDigest;
  const receipts = ssiCalculationReceipts([material], "2026-11-06");
  expect(receipts).toHaveLength(1); expect(receipts[0].excerpt).toContain("зернова частка митного експорту: 60 тис. т; 60%");
  expect(receipts[0].excerpt).toContain("Італія: 8 тис. т, частка 40%");
  expect(receipts[0].excerpt).toContain("два найбільші покупці разом дали 50%");
  expect(receipts[0].sourceDate).toBe("2026-11-05");
});
