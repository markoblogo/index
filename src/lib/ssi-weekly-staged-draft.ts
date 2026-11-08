import { createHash } from "node:crypto";
import { db } from "./db";
import { getSsiWeeklyRequiredParts } from "./ssi-weekly-editorial-contract";

export const SSI_DRAFT_PARTS = ["logistics", "grains", "oilseeds"] as const;
export type SsiDraftPart = typeof SSI_DRAFT_PARTS[number];
export const SSI_PART_SECTIONS: Record<SsiDraftPart, Array<{ key: string; minItems: number; maxItems: number; maxLength: number }>> = {
  logistics: [
    { key: "overview", minItems: 1, maxItems: 2, maxLength: 260 },
    { key: "road", minItems: 1, maxItems: 4, maxLength: 260 },
    { key: "rail", minItems: 1, maxItems: 3, maxLength: 260 },
    { key: "border", minItems: 1, maxItems: 3, maxLength: 180 },
    { key: "ports", minItems: 1, maxItems: 1, maxLength: 260 },
  ],
  grains: [
    { key: "index", minItems: 1, maxItems: 1, maxLength: 220 },
    { key: "corn", minItems: 3, maxItems: 8, maxLength: 180 },
    { key: "wheat", minItems: 3, maxItems: 8, maxLength: 180 },
  ],
  oilseeds: [
    { key: "index", minItems: 1, maxItems: 1, maxLength: 180 },
    { key: "sunflower", minItems: 2, maxItems: 6, maxLength: 160 },
    { key: "rapeseed", minItems: 2, maxItems: 6, maxLength: 160 },
    { key: "soy", minItems: 2, maxItems: 7, maxLength: 160 },
  ],
};
export function ssiStagedPartInstructions(part: SsiDraftPart, repair = false) {
  return [
    `STAGED OVERRIDE: Write ONLY ${part}, with its required part title and sections OBJECT matching the schema. Do not return summary or the other two parts. Each named section contains an array of short facts/paragraphs; code adds the exact section headings.`,
    "HARD EDITORIAL BUDGET: the schema sets each section's paragraph count and character cap. Use complete short sentences, no truncation or padding. Never put section headings or emoji in the facts; code inserts headings separately. A figure already stated does not need a second explanatory paragraph. At least five factual/analytical paragraphs per PART, not five per subsection.",
    `Section limits (including spaces/punctuation): ${JSON.stringify(SSI_PART_SECTIONS[part])}. Keep units, dates and bases; combine comparable contract quotes compactly rather than omit the crop's trade context.`,
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
    type: "object", additionalProperties: false, required: ["title", "sections"], properties: {
      title: { type: "string", enum: [getSsiWeeklyRequiredParts("uk")[i].title] },
      sections: { type: "object", additionalProperties: false, required: SSI_PART_SECTIONS[part].map(section => section.key),
        properties: Object.fromEntries(SSI_PART_SECTIONS[part].map(section => [section.key, {
          type: "array", minItems: section.minItems, maxItems: section.maxItems,
          items: { type: "string", maxLength: section.maxLength, pattern: `^[^\\r\\n]{1,${section.maxLength}}$` },
        }])) },
    },
  } };
}

export function parseSsiPart(text: string, part: SsiDraftPart): Result {
  try {
    let value = JSON.parse(text) as Draft & { sections?: Record<string, unknown> };
    const expected = getSsiWeeklyRequiredParts("uk")[SSI_DRAFT_PARTS.indexOf(part)];
    if (value.sections) {
      const sections = value.sections, specs = SSI_PART_SECTIONS[part];
      if (Object.keys(sections).length !== specs.length || specs.some(spec => {
        const lines = sections[spec.key];
        return !Array.isArray(lines) || lines.length < spec.minItems || lines.length > spec.maxItems ||
          lines.some(line => typeof line !== "string" || !line.trim() || [...line].length > spec.maxLength || /[\r\n]/.test(line));
      })) return { error: "weekly_part_incomplete" };
      value = { title: value.title, summary: specs.flatMap((spec, i) => [expected.sections[i], ...(sections[spec.key] as string[])]) };
    }
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
  const inputHash = createHash("sha256").update(`ssi-parts-v3\n${input.model}\n${input.prompt}`).digest("hex");
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
