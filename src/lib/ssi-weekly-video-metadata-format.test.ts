import { expect, it } from "vitest";
import { ssiVideoMetadataFormat, ssiVideoReportQuotes } from "./ssi-weekly-video-metadata-format";
import { normalizeVideoSource } from "./ssi-weekly-video-source-guard";

it("offers only exact report excerpts, with contiguous heading context rather than source-ledger cells", () => {
  const text = "<b>Rail</b>\n• Rail exports: 100 thousand tonnes.\n• Daily loading: 20 thousand tonnes.\n\n<b>Corn</b>\n• CBOT corn: 441.5 cents/bu.";
  const quotes = ssiVideoReportQuotes([text]);
  expect(quotes).toContain("Daily loading: 20 thousand tonnes.");
  expect(quotes).toContain("Rail • Rail exports: 100 thousand tonnes. • Daily loading: 20 thousand tonnes.");
  expect(quotes.every(quote => normalizeVideoSource(text).includes(quote))).toBe(true);
  expect(quotes).not.toContain("Всього: 100000 т = 100 тис. т.");
});
it("requires numeric claims, known source identities and at most two rows per bounded scene", () => {
  const format = ssiVideoMetadataFormat(["evidence:one"], ["<b>Corn</b>\n• CBOT corn: 441.5 cents/bu."]);
  const schema = format.schema.properties as Record<string, any>;
  expect(format.strict).toBe(true); expect(schema.claims.items.properties.value.type).toBe("number");
  expect(schema.claims.items.properties.evidenceId.enum).toEqual(["evidence:one"]);
  expect(schema.claims.items.properties.unit.enum).toContain("wagons");
  expect(schema.claims.items.properties.sourceQuote.enum).not.toContain("source table paraphrase");
  for (const part of ["logistics", "grains", "oilseeds"]) {
    const scenes = schema.selections.properties[part];
    expect(scenes.minItems).toBe(3); expect(scenes.maxItems).toBe(12);
    expect(scenes.items.properties.rowClaimIds.maxItems).toBe(2);
    expect(scenes.items.properties.id.pattern).not.toContain(":");
  }
  expect(() => ssiVideoMetadataFormat([], ["• fact"])).toThrow("video_metadata_source_missing");
});
