import { normalizeVideoSource } from "./ssi-weekly-video-source-guard";

const object = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
const string = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });

/** Exact report excerpts, including contiguous section context when needed. */
export function ssiVideoReportQuotes(texts: string[]) {
  const quotes = new Set<string>();
  for (const text of texts) {
    let context: string[] = [];
    for (const line of text.split("\n")) {
      if (/^<b>/.test(line)) context = [line];
      else if (/^•\s/.test(line)) {
        quotes.add(normalizeVideoSource(line.replace(/^•\s*/, "")));
        context.push(line);
        quotes.add(normalizeVideoSource(context.join("\n")));
      }
    }
  }
  return [...quotes].filter(Boolean);
}

/** The model chooses presentation, not new data or an unbounded slide layout. */
export function ssiVideoMetadataFormat(evidenceIds: string[], texts: string[]) {
  const quotes = ssiVideoReportQuotes(texts);
  if (!quotes.length || !evidenceIds.length) throw new Error("video_metadata_source_missing");
  const claim = object({
    id: string(120), evidenceId: { type: "string", enum: [...new Set(evidenceIds)] },
    part: { type: "string", enum: ["logistics", "grains", "oilseeds"] }, value: { type: "number" },
    unit: { type: "string", enum: ["USD/t", "EUR/t", "USD/short ton", "cents/bu", "cents/lb", "thousand tonnes", "million tonnes", "tonnes", "wagons", "wagons/day", "%", "percentage points", "USD/bbl", "MYR/t"] },
    basis: { type: "string", enum: ["CPT Odesa", "CPT port", "CPT plant", "FCA Chop", "CBOT", "MATIF", "BMD", "WTI", "Brent", "FOB Northern Europe", "FOB Netherlands", "FCA Hamburg", "customs clearance", "road passage", "rail transportation", "border handovers"] },
    period: object({ start: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, end: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, label: string(60) }),
    sourceQuote: { type: "string", enum: quotes },
    english: object({ headline: string(42), narration: string(140), takeaway: string(100) }),
  });
  const scenes = { type: "array", minItems: 3, maxItems: 12, items: object({
    id: { type: "string", pattern: "^[a-z][a-z0-9-]{0,79}$" }, heroClaimId: string(120),
    rowClaimIds: { type: "array", maxItems: 2, items: string(120) }, kind: { type: "string", enum: ["none", "rows", "bars"] },
  }) };
  return { type: "json_schema", name: "ssi_weekly_video_metadata", strict: true, schema: object({
    claims: { type: "array", minItems: 9, maxItems: 48, items: claim },
    selections: object({ logistics: scenes, grains: scenes, oilseeds: scenes }),
  }) };
}
