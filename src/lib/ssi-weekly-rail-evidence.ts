import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";

const months = ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"];
const round = (n: number) => Math.round(n * 100) / 100;

/** Reconcile disjoint export cohorts before using a PDF's printed percentages. */
export function ssiRailEvidence(materials: MediaHubManualMaterialDigest[]) {
  return materials.filter(material => !material.comparisonOnly).flatMap(material => {
    const text = material.extractedText.replace(/\s+/g, " ");
    const period = text.match(/За\s+([а-яіїєґ]+)\s+(\d{4})\s+року/iu);
    const month = period ? months.indexOf(period[1].toLowerCase()) + 1 : 0;
    const result: Array<{ materialId: string; cohort: string; period: string; unit: string; facts: string }> = [];
    if (month && /Інформаційна довідка щодо перевезень зернових/iu.test(text)) {
      const pair = (start: string, end: string) => {
        const a = text.indexOf(start), b = a < 0 ? -1 : text.indexOf(end, a + start.length);
        if (a < 0 || b < 0) return null;
        const cells = text.slice(a + start.length, b).replace(/[+−-]?\d+(?:[.,]\d+)?\s*%/g, "")
          .match(/[+−-]?\d+(?:[ \u00a0]\d{3})*[.,]\d+/g)?.slice(0, 2).map(value => Number(value.replace(/[ \u00a0]/g, "").replace(",", ".")));
        return cells?.length === 2 && cells.every(Number.isFinite) ? cells : null;
      };
      const land = pair("Всього через сухопутні переходи", "ВСЬОГО на експорт");
      const exported = pair("ВСЬОГО на експорт ( без Ізмаїл внут.)", "Всього перевезено");
      const danube = pair("Всього Дунайський напрямок,", "ОДЕСА-ПОРТ");
      const internal = pair("ІЗМАЇЛ (внутр.)", "МОГИЛІВ");
      const odesa = pair("Всього через порти Одеси,", "ЧОП (");
      if (land && exported && danube && internal && odesa && [0, 1].every(i => exported[i] > 0 && internal[i] <= danube[i] &&
        Math.abs(land[i] + danube[i] - internal[i] + odesa[i] - exported[i]) <= 0.05)) {
        const i = 1, danubeExport = round(danube[i] - internal[i]);
        const share = Math.round(land[i] / exported[i] * 1000) / 10;
        result.push({ materialId: material.id, cohort: "grain rail exports, excluding internal Izmail", period: `${period![2]}-${String(month).padStart(2, "0")}`, unit: "thousand tonnes",
          facts: `Зерновий експорт залізницею: ${exported[i]} тис. т; сухопутні переходи ${land[i]} тис. т, частка ${share}%. Дунайський залізничний напрямок разом ${danube[i]} тис. т, ВКЛЮЧНО з внутрішнім Ізмаїлом ${internal[i]} тис. т; лише експорт ${danubeExport} тис. т. Одеські порти ${odesa[i]} тис. т. Перевірка: ${land[i]} + ${danube[i]} - ${internal[i]} + ${odesa[i]} = ${exported[i]}. Друковані частки з іншим знаменником не є частками експорту; це залізничний підвіз, не морські відвантаження.` });
      }
    }
    const date = text.match(/станом на (\d{2})\.(\d{2})\.(\d{4})/iu);
    const total = material.extractedText.match(/\n([\d \t-]+)\s*\nстаном на/iu)?.[1].trim().split(/\s+/);
    if (date && total?.length === 9 && total.every(value => /^\d+$/.test(value)) && /Номенклатура вантажу\s*:\s*зерно;/iu.test(text) && /станції\s+ДН\s+Зал-ці\s+УЗ/iu.test(text)) {
      result.push({ materialId: material.id, cohort: "grain-only border approach, UZ column", period: `${date[3]}-${date[2]}-${date[1]}`, unit: "wagons",
        facts: `Черга зернових вагонів у напрямку прикордонних переходів, дислокація УЗ: ${total[3]} вагонів на ${date[1]}.${date[2]}.${date[3]}. Це четвертий стовпчик УЗ, не станції/ДН/залізниці; не всі вантажі й не зерно разом із макухою.` });
    }
    return result;
  });
}
