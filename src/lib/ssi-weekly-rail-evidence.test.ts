import { expect, it } from "vitest";
import { ssiRailEvidence } from "./ssi-weekly-rail-evidence";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
const material = (text: string) => ({ id: "rail", extractedText: text }) as MediaHubManualMaterialDigest;
const table = `Інформаційна довідка щодо перевезень зернових вантажів. За жовтень 2026 року
ІЗМАЇЛ (внутр.) 10,00 20,00 МОГИЛІВ
Всього Дунайський напрямок, 20% від загального експорту 30,00 50,00 ОДЕСА-ПОРТ
Всього через порти Одеси, 1% від загального експорту 5,00 10,00 ЧОП (
Всього через сухопутні переходи 79% від загального експорту 75,00 160,00
ВСЬОГО на експорт ( без Ізмаїл внут.) 100,00 200,00 Всього перевезено`;
it("subtracts internal Izmail and checks the export denominator independently of printed shares", () => {
  const [receipt] = ssiRailEvidence([material(table)]);
  expect(receipt.period).toBe("2026-10"); expect(receipt.facts).toContain("частка 80%");
  expect(receipt.facts).toContain("лише експорт 30");
  expect(ssiRailEvidence([material(table.replace("200,00", "300,00"))])).toEqual([]);
  expect(ssiRailEvidence([{ ...material(table), comparisonOnly: true }])).toEqual([]);
});
it("selects only the UZ column of an explicitly grain-only queue, not an all-cargo total", () => {
  const text = "станції ДН Зал-ці УЗ\n40 140 190 360 21 17 46 244 77\nстаном на 05.11.2026 09:15\nНоменклатура вантажу : зерно;";
  expect(ssiRailEvidence([material(text)])[0].facts).toContain("360 вагонів");
  expect(ssiRailEvidence([material(text.replace("зерно;", "всі;"))])).toEqual([]);
});
