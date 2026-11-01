import { createHash } from "node:crypto";
import { db } from "./db";
import { getSsiWeeklyRequiredParts } from "./ssi-weekly-editorial-contract";

export const SSI_DRAFT_PARTS = ["logistics", "grains", "oilseeds"] as const;
export type SsiDraftPart = typeof SSI_DRAFT_PARTS[number];
type Draft = { title: string; summary: string[] };
type Result = { report?: Draft; error?: string };
type State = { version: 1; inputHash: string; parts: Partial<Record<SsiDraftPart, Draft>> };

export function ssiPartFormat(part: SsiDraftPart) {
  const i = SSI_DRAFT_PARTS.indexOf(part);
  return { type: "json_schema", name: `ssi_weekly_${part}`, strict: true, schema: {
    type: "object", additionalProperties: false, required: ["title", "summary"], properties: {
      title: { type: "string", enum: [getSsiWeeklyRequiredParts("uk")[i].title] },
      summary: { type: "array", items: { type: "string" }, minItems: 8, maxItems: part === "logistics" ? 18 : part === "grains" ? 22 : 26 },
    },
  } };
}

export function parseSsiPart(text: string, part: SsiDraftPart): Result {
  try {
    const value = JSON.parse(text) as Draft;
    const expected = getSsiWeeklyRequiredParts("uk")[SSI_DRAFT_PARTS.indexOf(part)];
    if (value.title !== expected.title || !Array.isArray(value.summary) || value.summary.length < 8 || value.summary.length > 26 ||
      value.summary.some(line => typeof line !== "string" || !line.trim()) ||
      value.summary.filter(line => line.trim().split(/\s+/).length >= 7).length < 5) return { error: "weekly_part_incomplete" };
    const joined = value.summary.join("\n");
    if (/CPT\s*(?:Чоп|Chop)(?=$|[^\p{L}\p{N}_])/iu.test(joined)) return { error: "weekly_basis_mismatch" };
    if (part === "grains" && /\bS[FXHKNQUVZ]\d{1,2}\b/.test(joined)) return { error: "weekly_contract_crop_mismatch" };
    return { report: value };
  } catch { return { error: "weekly_part_invalid_json" }; }
}

/** One model request per prepare call; complete parts survive timeout/restart. */
export async function generateStagedSsiWeeklyDraft(input: {
  end: string; prompt: string; model: string; generate: (part: SsiDraftPart) => Promise<Result>;
}): Promise<Result> {
  const inputHash = createHash("sha256").update(`ssi-parts-v1\n${input.model}\n${input.prompt}`).digest("hex");
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
