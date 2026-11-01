import { expect, it } from "vitest";
import { normalizeSsiWeeklyDraft } from "./ssi-weekly-structured-draft";
const rows = Array.from({ length: 8 }, (_, i) => `Source-backed observation ${i} describes actual weekly movement with comparable units.`);
it("rejects the real one-part response shape rather than treating it as a report", () => {
  expect(normalizeSsiWeeklyDraft(JSON.stringify({ title: "Частина I. Логістика", summary: [rows.join("\n"), "Footer"] }))).toBeNull();
});
it("requires substantive content in every part, not headings or empty fields", () => {
  expect(normalizeSsiWeeklyDraft(JSON.stringify({ title: "Weekly", logistics: rows, grains: rows }))).toBeNull();
  expect(normalizeSsiWeeklyDraft(JSON.stringify({ title: "Weekly", logistics: rows, grains: rows, oilseeds: Array(8).fill("СОЯ") }))).toBeNull();
});
it("preserves all source numbers and orders three explicit part boundaries", () => {
  const result = JSON.parse(normalizeSsiWeeklyDraft(JSON.stringify({ title: "Weekly", logistics: rows,
    grains: [...rows.slice(1), "Кукурудза CPT Одеса становить 155 USD/t за опублікованим зрізом 30.10.2026."], oilseeds: rows }))!);
  expect(result.summary.filter((line: string) => line.startsWith("Частина "))).toHaveLength(3);
  expect(result.summary).toContain("Кукурудза CPT Одеса становить 155 USD/t за опублікованим зрізом 30.10.2026.");
});
