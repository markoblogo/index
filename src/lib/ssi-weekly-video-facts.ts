import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
import type { MediaHubEvidenceItem } from "./media-hub-evidence";
import { renderSsiWeeklySpreadsheetEvidence } from "./media-hub-ssi-weekly-pattern";
import { ssiRailEvidence } from "./ssi-weekly-rail-evidence";
import { ssiVideoReportQuotes } from "./ssi-weekly-video-metadata-format";
import { videoClaimMatchesReport } from "./ssi-weekly-video-source-guard";
import { VIDEO_PARTS, type VideoClaim, type VideoPart, type SceneSelection } from "./ssi-weekly-video-packet";

type Claim = VideoClaim & { sourceQuote: string };
type Block = { materialId: string; cohort: string; comparisonRole: string; cutoff: string; coverageStart: string | null; unit: string; columns?: string[]; total?: string[] };
type Closing = { crop: string; venue: string; expiry: string; date: string; price: number; unit: string };
type Metric = { value: number; unit: string; basis: string; evidenceId: string; start: string; end: string; label: string };

/** Presentation of frozen source facts, never a second calculation or free-form model. */
export function buildSsiWeeklyVideoFacts(input: { texts: string[]; evidence: MediaHubEvidenceItem[]; materials: MediaHubManualMaterialDigest[]; end: string }) {
  const claims: Claim[] = [], available = new Map<string, Claim>();
  const narrationById: Record<string, string> = {
    "corn-port": "The port corn benchmark is shown alongside the western-border delivery quote.",
    "wheat-milling": "Milling and feed wheat are compared on the same Ukrainian port basis.",
    "sunflower-crush": "Sunflower seed is shown on the domestic processing basis, separate from export oil.",
    "rape-port": "Rapeseed export delivery bases are shown separately from the domestic crush benchmark.",
    "soy-port": "GMO soybean quotes separate port delivery, the western border and domestic processing.",
    "corn-cbot": "Chicago corn provides the US futures benchmark in this week's report.",
    "corn-matif": "Nearby and deferred Paris corn deliveries are compared in the same currency.",
    "wheat-cbot": "Chicago wheat remains a separate benchmark from the euro-denominated Paris market.",
    "wheat-matif": "Paris wheat contracts show the relationship between nearby and deferred delivery.",
    "rape-matif": "Paris rapeseed futures are identified by their actual delivery months.",
    "soy-cbot": "Soybean futures are quoted per bushel, on a different scale from meal and oil.",
    "soy-meal": "Soymeal remains in dollars per short ton; that is not a metric-tonne quotation.",
    "soy-oil": "Chicago soybean oil is quoted in cents per pound, not dollars per tonne.",
    "sunflower-oil": "The sunflower chain separates the customs volumes of seed, oil and meal.",
    "rape-exports": "Rapeseed seed exports and rapeseed oil remain separate customs categories.",
    "soy-exports": "Soybean trade covers beans, oil and meal, each on its own customs line.",
    "corn-exports": "Corn exports use the actual customs reporting window, not a whole-month estimate.",
    "wheat-exports": "Wheat exports are measured over the document's actual reporting window.",
  };
  const quotes = input.texts.map(text => ssiVideoReportQuotes([text]));
  const sourceId = (id: string) => input.evidence.find(item => item.id.startsWith(`manual:${id}:arithmetic:`))?.id ??
    input.evidence.find(item => item.id === `manual:${id}` || item.id.startsWith(`manual:${id}:`))?.id;
  const add = (id: string, part: VideoPart, metric: Metric | null, crop: RegExp, headline: string, narration: string, takeaway: string) => {
    if (!metric || !Number.isFinite(metric.value)) return;
    const candidate = { id, part, value: metric.value, unit: metric.unit, basis: metric.basis, evidenceId: metric.evidenceId,
      period: { start: metric.start, end: metric.end, label: metric.label }, english: { headline, narration: narrationById[id] ?? narration, takeaway }, sourceQuote: "" };
    const index = VIDEO_PARTS.indexOf(part);
    const sourceQuote = quotes[index].find(quote => crop.test(quote) && videoClaimMatchesReport({ ...candidate, sourceQuote: quote }, input.texts[index], input.end));
    if (!sourceQuote) return;
    const claim = { ...candidate, sourceQuote }; claims.push(claim); available.set(id, claim);
  };
  const published = (code: string, basis: string): Metric | null => {
    const evidence = input.evidence.find(item => item.id.startsWith(`index:weekly:${code}:`) && item.sourceDate === input.end);
    if (!evidence) return null;
    const start = evidence.claim.indexOf("{"); if (start < 0) return null;
    let data: { latestValue?: number; comparisonEndDate?: string };
    try { data = JSON.parse(evidence.claim.slice(start)); } catch { return null; }
    return typeof data.latestValue === "number" && data.comparisonEndDate === input.end
      ? { value: data.latestValue, unit: "USD/t", basis, evidenceId: evidence.id, start: input.end, end: input.end, label: input.end } : null;
  };
  const blocks: Block[] = renderSsiWeeklySpreadsheetEvidence(input.materials, input.end).split("\n").filter(line => line.startsWith("{")).map(line => JSON.parse(line));
  const flow = (cohort: string, code: string): Metric | null => {
    const block = blocks.find(item => item.cohort === cohort && item.comparisonRole === "current" && item.unit === "tonnes");
    if (!block || !block.coverageStart) return null;
    const index = block.columns?.findIndex(value => code === "total" ? value === "Всього" : value.startsWith(`${code} `)) ?? -1;
    const cell = index > 0 ? block.total?.[index] : undefined, evidenceId = sourceId(block.materialId);
    if (!cell?.trim() || !Number.isFinite(Number(cell)) || !evidenceId) return null;
    return { value: Math.round(Number(cell) / 100) / 10, unit: "thousand tonnes", basis: cohort === "customs_clearance" ? "customs clearance" : "road passage",
      evidenceId, start: block.coverageStart, end: block.cutoff, label: `${block.coverageStart} - ${block.cutoff}` };
  };
  const closing = (crop: string, venue: string, rank = 0): Metric | null => {
    for (const material of input.materials) {
      if (material.sourceType !== "scheduled_api" || !Array.isArray(material.extractedFacts)) continue;
      const points = material.extractedFacts.filter((point): point is Closing => point && point.crop === crop && point.venue === venue && point.date === input.end && Number.isFinite(point.price));
      const point = points[rank], evidenceId = sourceId(material.id);
      if (point && evidenceId) return { value: point.price, unit: point.unit, basis: venue, evidenceId, start: point.date, end: point.date, label: `${point.expiry}; ${point.date}` };
    }
    return null;
  };
  const rail = ssiRailEvidence(input.materials), monthly = rail.find(item => item.metrics), queue = rail.find(item => item.grainQueue !== undefined);
  const railMetric = (value: number, unit: string, receipt: typeof monthly, basis: string): Metric | null => {
    if (!receipt) return null; const evidenceId = sourceId(receipt.materialId); if (!evidenceId) return null;
    const month = receipt.period.length === 7;
    const start = month ? `${receipt.period}-01` : receipt.period;
    const end = month ? new Date(Date.UTC(Number(receipt.period.slice(0, 4)), Number(receipt.period.slice(5)), 0)).toISOString().slice(0, 10) : receipt.period;
    return { value, unit, basis, evidenceId, start, end, label: receipt.period };
  };
  add("agro-exports", "logistics", flow("customs_clearance", "total"), /митн|оформ/iu, "Agro exports", "The early-month customs total sets the scale of Ukraine's agricultural exports.", "Customs clearance; matching source dates.");
  add("road-passage", "logistics", flow("road_passage", "total"), /авто/iu, "Road passage", "Road checkpoint volumes are a separate flow from customs clearance.", "Road checkpoints only.");
  add("danube-road", "logistics", flow("danube_passage", "total"), /дуна/iu, "Danube road flow", "This is road passage toward the Danube ports, not loading onto ships.", "Road approach to the Danube ports.");
  add("rail-exports", "logistics", monthly?.metrics ? railMetric(monthly.metrics.exports, "thousand tonnes", monthly, "rail transportation") : null, /залізни/iu, "Grain rail exports", "October rail exports are shown separately from early-November customs data.", "October grain rail exports only.");
  add("rail-land", "logistics", monthly?.metrics ? railMetric(monthly.metrics.land, "thousand tonnes", monthly, "rail transportation") : null, /сухопут/iu, "Land crossings", "Land crossings account for this part of October's grain rail exports.", "Same October rail-export denominator.");
  add("grain-queue", "logistics", queue?.grainQueue !== undefined ? railMetric(queue.grainQueue, "wagons", queue, "border handovers") : null, /зернових вагон/iu, "Grain wagon queue", "The border approach count covers grain wagons, not every type of cargo.", "A queue count, not a daily transfer rate.");

  const index = (id: string, part: VideoPart, code: string, basis: string, crop: RegExp, label: string) =>
    add(id, part, published(code, basis), crop, label, "This is the published Ukrainian spot benchmark for the displayed delivery basis.", "Published SSI value; delivery basis retained.");
  index("corn-port", "grains", "CORN", "CPT Odesa", /кукурудз/iu, "Corn CPT Odesa");
  index("corn-chop", "grains", "CORN_FCA_CHOP", "FCA Chop", /кукурудз/iu, "Corn FCA Chop");
  index("wheat-milling", "grains", "WHT_115", "CPT Odesa", /продовольч|11[.,]5/iu, "Milling wheat");
  index("wheat-feed", "grains", "FEED_WHT", "CPT Odesa", /фураж/iu, "Feed wheat");
  const future = (id: string, part: VideoPart, crop: string, venue: string, rank: number, match: RegExp, label: string) =>
    add(id, part, closing(crop, venue, rank), match, label, "The displayed contract and unit identify this Friday's overseas closing benchmark.", "Contract month and quotation unit retained.");
  future("corn-cbot", "grains", "corn", "CBOT", 0, /corn|кукурудз/iu, "CBOT corn");
  future("corn-matif", "grains", "corn", "MATIF", 0, /corn|кукурудз/iu, "MATIF corn nearby");
  future("corn-matif-deferred", "grains", "corn", "MATIF", 1, /corn|кукурудз/iu, "MATIF corn deferred");
  future("wheat-cbot", "grains", "wheat", "CBOT", 0, /wheat|пшениц/iu, "CBOT wheat");
  future("wheat-matif", "grains", "wheat", "MATIF", 0, /wheat|пшениц/iu, "MATIF wheat nearby");
  future("wheat-matif-deferred", "grains", "wheat", "MATIF", 1, /wheat|пшениц/iu, "MATIF wheat deferred");
  const trade = (id: string, part: VideoPart, code: string, match: RegExp, label: string) =>
    add(id, part, flow("customs_clearance", code), match, label, "This volume is customs-cleared trade for the dates displayed, not a full-month forecast.", "Actual document coverage; thousand tonnes.");
  trade("corn-exports", "grains", "1005", /кукурудз/iu, "Corn exports");
  trade("wheat-exports", "grains", "1001", /пшениц/iu, "Wheat exports");
  index("sunflower-crush", "oilseeds", "SUNFLOWER", "CPT plant", /соняшник/iu, "Sunflower crush");
  index("rape-port", "oilseeds", "RAPESEED_NON_GMO_EXPORT", "CPT Odesa", /ріпак/iu, "Rapeseed CPT port");
  index("rape-chop", "oilseeds", "RAPESEED_NON_GMO_FCA_CHOP", "FCA Chop", /ріпак/iu, "Rapeseed FCA Chop");
  index("rape-crush", "oilseeds", "RAPESEED_NON_GMO_PROCESSING", "CPT plant", /ріпак/iu, "Rapeseed crush");
  index("soy-port", "oilseeds", "GMO_SOY_EXPORT", "CPT Odesa", /соя|соєв/iu, "GMO soy CPT port");
  index("soy-chop", "oilseeds", "GMO_SOY_FCA_CHOP", "FCA Chop", /соя|соєв/iu, "GMO soy FCA Chop");
  index("soy-crush", "oilseeds", "GMO_SOY", "CPT plant", /соя|соєв/iu, "GMO soy crush");
  future("rape-matif", "oilseeds", "rapeseed", "MATIF", 0, /ріпак|rapeseed/iu, "MATIF rapeseed");
  future("rape-matif-deferred", "oilseeds", "rapeseed", "MATIF", 1, /ріпак|rapeseed/iu, "Rapeseed deferred");
  future("soy-cbot", "oilseeds", "soybeans", "CBOT", 0, /соя|соєв|soy/iu, "CBOT soybeans");
  future("soy-meal", "oilseeds", "soybean meal", "CBOT", 0, /шрот|meal/iu, "CBOT soymeal");
  future("soy-oil", "oilseeds", "soybean oil", "CBOT", 0, /олія|oil/iu, "CBOT soy oil");
  for (const [id, code, match, label] of [
    ["sunflower-seed", "1206", /соняшник/iu, "Sunflower seed"], ["sunflower-oil", "1512", /соняшник/iu, "Sunflower oil"], ["sunflower-meal", "2306", /соняшник/iu, "Sunflower meal"],
    ["rape-exports", "1205", /ріпак/iu, "Rapeseed exports"], ["rape-oil", "1514", /ріпак/iu, "Rapeseed oil"],
    ["soy-exports", "1201", /соєв|соя/iu, "Soybean exports"], ["soy-oil-exports", "1507", /соєв|соя/iu, "Soy oil exports"], ["soy-meal-exports", "2304", /соєв|соя/iu, "Soymeal exports"],
  ] as const) trade(id, "oilseeds", code, match, label);

  const selections: Record<VideoPart, SceneSelection[]> = { logistics: [], grains: [], oilseeds: [] };
  const scene = (part: VideoPart, hero: string, rows: string[] = []) => {
    const value = available.get(hero); if (!value) return;
    const rowClaimIds = rows.filter(id => { const row = available.get(id); return row && row.period.start === value.period.start && row.period.end === value.period.end; }).slice(0, 2);
    const row = available.get(rowClaimIds[0]);
    if (row && row.unit === value.unit) {
      const relation = value.value > row.value ? "above" : value.value < row.value ? "below" : "in line with";
      if (hero === "corn-matif" || hero === "wheat-matif") value.english.narration = `The nearby Paris ${hero === "corn-matif" ? "corn" : "wheat"} contract is ${relation} the deferred delivery.`;
      if (hero === "corn-port") value.english.narration = `The port corn quote is ${relation} the western-border benchmark.`;
      if (hero === "wheat-milling") value.english.narration = `The milling wheat quote is ${relation} the feed wheat benchmark.`;
    }
    selections[part].push({ id: hero, heroClaimId: hero, rowClaimIds, kind: rowClaimIds.length ? "rows" : "none" });
  };
  for (const id of ["agro-exports", "road-passage", "danube-road"]) scene("logistics", id);
  scene("logistics", "rail-exports", ["rail-land"]); scene("logistics", "grain-queue");
  scene("grains", "corn-port", ["corn-chop"]); scene("grains", "corn-cbot"); scene("grains", "corn-matif", ["corn-matif-deferred"]); scene("grains", "corn-exports");
  scene("grains", "wheat-milling", ["wheat-feed"]); scene("grains", "wheat-cbot"); scene("grains", "wheat-matif", ["wheat-matif-deferred"]); scene("grains", "wheat-exports");
  scene("oilseeds", "sunflower-crush"); scene("oilseeds", "sunflower-oil", ["sunflower-seed", "sunflower-meal"]);
  scene("oilseeds", "rape-matif", ["rape-matif-deferred"]); scene("oilseeds", "rape-port", ["rape-chop", "rape-crush"]); scene("oilseeds", "rape-exports", ["rape-oil"]);
  for (const id of ["soy-cbot", "soy-meal", "soy-oil"]) scene("oilseeds", id);
  scene("oilseeds", "soy-port", ["soy-chop", "soy-crush"]); scene("oilseeds", "soy-exports", ["soy-oil-exports", "soy-meal-exports"]);
  if (VIDEO_PARTS.some(part => selections[part].length < 3)) throw new Error("video_verified_fact_section_incomplete");
  return { claims, selections };
}
