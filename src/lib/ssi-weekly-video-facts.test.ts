import { beforeEach, expect, it, vi } from "vitest";
import { buildSsiWeeklyVideoFacts } from "./ssi-weekly-video-facts";
import { buildWeeklyVideoPacket, freezeVideoReport, VIDEO_PARTS, videoHash } from "./ssi-weekly-video-packet";
import type { MediaHubEvidenceItem } from "./media-hub-evidence";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
const mocks = vi.hoisted(() => ({ render: vi.fn() }));
vi.mock("./media-hub-ssi-weekly-pattern", () => ({ renderSsiWeeklySpreadsheetEvidence: mocks.render }));
vi.mock("./ssi-weekly-rail-evidence", () => ({ ssiRailEvidence: () => [] }));
beforeEach(() => {
  mocks.render.mockReturnValue(["customs_clearance", "road_passage", "danube_passage"].map((cohort, i) => JSON.stringify({
    materialId: "sheet", cohort, comparisonRole: "current", coverageStart: "2026-11-01", cutoff: "2026-11-05", unit: "tonnes",
    columns: ["Country", "Всього", "1005 Кукурудза", "1001 Пшениця"], total: ["Всього", ["100000", "50000", "20000"][i], "20000", "30000"],
  })).join("\n"));
});
function fixture() {
  const prices = { CORN: 200, CORN_FCA_CHOP: 220, WHT_115: 210, FEED_WHT: 190, SUNFLOWER: 400, RAPESEED_NON_GMO_EXPORT: 500, GMO_SOY_EXPORT: 450 };
  const evidence = Object.entries(prices).map(([code, value]) => ({ id: `index:weekly:${code}:basis:2026-11-06`, sourceDate: "2026-11-06",
    claim: JSON.stringify({ latestValue: value, comparisonEndDate: "2026-11-06" }) })) as MediaHubEvidenceItem[];
  evidence.push({ id: "manual:sheet" } as MediaHubEvidenceItem);
  return { end: "2026-11-06", evidence, materials: [], texts: [
    "<b>Logistics</b>\n• Митне оформлення за 01–05.11.2026 — 100 тис. т.\n• Автопропуск за 01–05.11.2026 — 50 тис. т.\n• Автопропуск до Дунаю за 01–05.11.2026 — 20 тис. т.",
    "<b>Grains</b>\n• Кукурудза CPT Одеса — 200 $; FCA Чоп — 220 $.\n• Продовольча пшениця CPT Одеса — 210 $; фуражна пшениця — 190 $.\n• Митне оформлення кукурудзи за 01–05.11.2026 — 20 тис. т.\n• Митне оформлення пшениці за 01–05.11.2026 — 30 тис. т.",
    "<b>Oilseeds</b>\n• Соняшник CPT завод — 400 $.\n• Ріпак CPT порт — 500 $.\n• Соя ГМО CPT Одеса — 450 $.",
  ] };
}
it("builds source-bound English scenes without asking a model to recalculate facts", () => {
  const input = fixture(), draft = buildSsiWeeklyVideoFacts(input);
  expect(draft.claims.find(claim => claim.id === "road-passage")?.value).toBe(50);
  expect(draft.claims.find(claim => claim.id === "road-passage")?.unit).toBe("thousand tonnes");
  expect(draft.claims.every(claim => claim.english.headline.length <= 22 && claim.english.narration.length <= 140 && claim.english.takeaway.length <= 100)).toBe(true);
  const snapshot = freezeVideoReport({ tenantId: "spike-ua", reportId: "fixture", validated: true,
    period: { start: "2026-11-02", end: input.end, label: "week" }, sourceManifestSha256: videoHash(input.evidence),
    evidenceIds: input.evidence.map(item => item.id), claims: draft.claims, parts: VIDEO_PARTS.map((id, i) => ({ id, ukrainianHtml: input.texts[i] })) });
  const packet = buildWeeklyVideoPacket(snapshot, "a".repeat(64), draft.selections);
  expect(packet.parts.map(part => part.scenes.length)).toEqual([3, 4, 3]);
});
it("never borrows a price absent from the report, or zero-fills a missing source section", () => {
  const input = fixture(); input.texts[2] = "<b>Oilseeds</b>\n• No supported oilseed numbers.";
  expect(() => buildSsiWeeklyVideoFacts(input)).toThrow("video_verified_fact_section_incomplete");
});
it("puts actual futures delivery months in visible captions and deferred row labels", () => {
  const input = fixture(); input.evidence.push({ id: "manual:closing" } as MediaHubEvidenceItem);
  input.texts[1] += "\n• MATIF corn March 2027 — 247.25 €; MATIF corn June 2027 — 245.25 €.";
  const material = { id: "closing", sourceType: "scheduled_api", extractedFacts: [
    { crop: "corn", venue: "MATIF", date: input.end, expiry: "March 2027", price: 247.25, unit: "EUR/t" },
    { crop: "corn", venue: "MATIF", date: input.end, expiry: "June 2027", price: 245.25, unit: "EUR/t" },
  ] } as MediaHubManualMaterialDigest;
  const draft = buildSsiWeeklyVideoFacts({ ...input, materials: [material] });
  expect(draft.claims.find(claim => claim.id === "corn-matif")?.english.takeaway).toBe("Delivery: March 2027.");
  expect(draft.claims.find(claim => claim.id === "corn-matif-deferred")?.english.headline).toBe("Corn Jun 2027");
});
