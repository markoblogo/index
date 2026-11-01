import { expect, it } from "vitest";
import { selectReportWindowMaterials } from "./media-hub-material-window";
it("keeps dated Drive evidence visible under a news flood without reviving old documents", () => {
  const news = Array.from({ length: 40 }, (_, i) => ({ id: `news-${i}`, receivedFrom: "scheduler", originalFilename: null,
    canonicalUrl: null, reportingDate: new Date("2026-10-30") }));
  const documents = ["agro_ex_im", "check points", "оперативні вагони", "статистика УЗ"].map((name, i) => ({ id: `doc-${i}`,
    receivedFrom: "google-drive", originalFilename: `29 10 2026 ${name}.pdf`, canonicalUrl: null, reportingDate: new Date("2026-10-30") }));
  const old = { ...documents[0], id: "old", originalFilename: "23 10 2026 agro_ex_im.pdf" };
  const rows = [...news, ...documents, old];
  const selected = selectReportWindowMaterials(rows, "2026-10-24", "2026-10-30", 32, "2026-10-31", true);
  expect(selected).toHaveLength(32);
  expect(selected.filter(row => row.receivedFrom === "google-drive").map(row => row.id)).toEqual(documents.map(row => row.id));
  expect(selected.some(row => row.id === "old")).toBe(false);
  expect(selectReportWindowMaterials(rows, "2026-10-24", "2026-10-30", 32).every(row => row.receivedFrom === "scheduler")).toBe(true);
});
