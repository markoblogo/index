import { createHash } from "node:crypto";
import { db } from "./db";
import { getSsiWeeklyRequiredParts } from "./ssi-weekly-editorial-contract";

export const SSI_DRAFT_PARTS = ["logistics", "grains", "oilseeds"] as const;
export type SsiDraftPart = typeof SSI_DRAFT_PARTS[number];
export function ssiStagedPartInstructions(part: SsiDraftPart, repair = false) {
  return [
    `STAGED OVERRIDE: Write ONLY ${part}, with its required part title and summary array. Do not output the other two parts. The final report is assembled from saved parts.`,
    "HARD EDITORIAL BUDGET: target 3200-3450 UTF-16 units across the summary including paragraph separators; maximum 3600 before the renderer adds header/footer. Each item at most 600 characters. Use complete short sentences, not truncation or padding. A figure already stated does not need a second explanatory paragraph.",
    "Every required section heading must be its OWN array item, copied exactly. Never combine headings with commas or prose, and reserve the final section before spending the budget. Use at least five substantive paragraphs per PART, not five per subsection.",
    part === "logistics"
      ? "SECTION QUOTAS: five separate headings plus at most 13 fact paragraphs: overview 2, road/Danube road 4, rail 3, border 3, ports 1. Total at most 18 items. Omit minor checkpoint/station lists before any required section. Keep customs, road, rail export, internal/transit and grain-only/all-cargo queues distinct; never merge their denominators."
      : "Combine two comparable expiries into one compact quote row when necessary. Keep crop headings, verified quotes, trade comparisons and a short interpretation; remove optional background before required sections.",
    "Keep exact crop/contract identity: SX is SOYBEANS, never corn; corn is ZC/C; wheat ZW/W. Chop is FCA, never CPT. Sunflower oil (1512) is not seed (1206). Causes require explicit support. All original evidence, units and missing-data restrictions still apply.",
    ...(repair ? ["SHAPE REPAIR: the previous candidate failed length/section/JSON validation. Generate a shorter NEW candidate from the SAME supplied evidence. Do not add facts, split into extra messages, merge headings, finish with a fragment or treat a previous draft as a factual source."] : []),
  ].join("\n");
}
type Draft = { title: string; summary: string[] };
type Result = { report?: Draft; error?: string };
type State = { version: 1; inputHash: string; parts: Partial<Record<SsiDraftPart, Draft>> };

export function ssiPartFormat(part: SsiDraftPart) {
  const i = SSI_DRAFT_PARTS.indexOf(part);
  return { type: "json_schema", name: `ssi_weekly_${part}`, strict: true, schema: {
    type: "object", additionalProperties: false, required: ["title", "summary"], properties: {
      title: { type: "string", enum: [getSsiWeeklyRequiredParts("uk")[i].title] },
      summary: { type: "array", items: { type: "string", maxLength: 600, pattern: "^[^\\r\\n]{1,600}$" }, minItems: 8, maxItems: part === "logistics" ? 18 : part === "grains" ? 22 : 26 },
    },
  } };
}

export function parseSsiPart(text: string, part: SsiDraftPart): Result {
  try {
    const value = JSON.parse(text) as Draft;
    const expected = getSsiWeeklyRequiredParts("uk")[SSI_DRAFT_PARTS.indexOf(part)];
    if (value.title !== expected.title || !Array.isArray(value.summary) || value.summary.length < 8 || value.summary.length > 26 ||
      value.summary.some(line => typeof line !== "string" || !line.trim() || line.length > 700 || /[\r\n]/.test(line)) ||
      value.summary.filter(line => line.trim().split(/\s+/).length >= 7).length < 5) return { error: "weekly_part_incomplete" };
    const joined = value.summary.join("\n");
    if (/CPT\s*(?:Чоп|Chop)(?=$|[^\p{L}\p{N}_])/iu.test(joined)) return { error: "weekly_basis_mismatch" };
    if (part === "grains" && /\bS[FXHKNQUVZ]\d{1,2}\b/.test(joined)) return { error: "weekly_contract_crop_mismatch" };
    if (value.summary.join("\n\n").length > 3600) return { error: "weekly_part_too_long" };
    const headings = new Set(value.summary.map(line => line.replace(/<[^>]*>/g, "").trim()));
    if (expected.sections.some(heading => !headings.has(heading))) return { error: "weekly_part_sections_missing" };
    return { report: value };
  } catch { return { error: "weekly_part_invalid_json" }; }
}

/** One model request per prepare call; complete parts survive timeout/restart. */
export async function generateStagedSsiWeeklyDraft(input: {
  end: string; prompt: string; model: string; generate: (part: SsiDraftPart) => Promise<Result>;
}): Promise<Result> {
  const inputHash = createHash("sha256").update(`ssi-parts-v2\n${input.model}\n${input.prompt}`).digest("hex");
  const [row] = await db.$queryRawUnsafe<Array<{ lease: string; reportDraftPartsJson: State | null }>>(
    'SELECT "lease","reportDraftPartsJson" FROM private."SsiWeeklyVideoPreparation" WHERE "periodEnd"=$1::date', input.end);
  if (!row?.lease) return { error: "weekly_preparation_lease_missing" };
  const previous = row.reportDraftPartsJson;
  if (previous && (previous.version !== 1 || previous.inputHash !== inputHash)) return { error: "weekly_draft_context_changed" };
  const state: State = previous ?? { version: 1, inputHash, parts: {} };
  const next = SSI_DRAFT_PARTS.find(part => !state.parts[part]);
  if (next) {
    const generated = await input.generate(next);
    if (!generated.report) return generated;
    const nextState = { ...state, parts: { ...state.parts, [next]: generated.report } };
    const saved = await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoPreparation" SET "reportDraftPartsJson"=$3::jsonb WHERE "periodEnd"=$1::date AND "lease"=$2 AND "reportDraftPartsJson" IS NOT DISTINCT FROM $4::jsonb',
      input.end, row.lease, JSON.stringify(nextState), previous ? JSON.stringify(previous) : null);
    return saved === 1 ? { error: `weekly_part_prepared:${next}` } : { error: "weekly_preparation_lease_changed" };
  }
  return { report: { title: `SPIKE BROKERS | Weekly Commodity & Logistics Market. ${input.end}`,
    summary: SSI_DRAFT_PARTS.flatMap(part => [state.parts[part]!.title, ...state.parts[part]!.summary]) } };
}
