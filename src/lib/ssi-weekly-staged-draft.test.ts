import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock("./db", () => ({ db: { $queryRawUnsafe: mocks.query, $executeRawUnsafe: mocks.execute } }));
import { generateStagedSsiWeeklyDraft, parseSsiPart, ssiPartFormat, ssiStagedPartInstructions, SSI_DRAFT_PARTS } from "./ssi-weekly-staged-draft";
import { getSsiWeeklyRequiredParts } from "./ssi-weekly-editorial-contract";
const paragraphs = Array.from({ length: 8 }, (_, i) => `Verified source statement ${i} preserves its crop, observation and exact units.`);
beforeEach(() => { vi.resetAllMocks(); });
it("persists one part per request, resumes without regenerating it and assembles only after all three", async () => {
  let state: unknown = null;
  mocks.query.mockImplementation(async () => [{ lease: "lease", reportDraftPartsJson: state }]);
  mocks.execute.mockImplementation(async (_sql: string, _end: string, _lease: string, next: string) => { state = JSON.parse(next); return 1; });
  const generate = vi.fn(async (part: typeof SSI_DRAFT_PARTS[number]) => ({ report: { title: getSsiWeeklyRequiredParts("uk")[SSI_DRAFT_PARTS.indexOf(part)].title, summary: paragraphs } }));
  const input = { end: "2026-10-30", prompt: "frozen input", model: "fixture", generate };
  for (const part of SSI_DRAFT_PARTS) expect(await generateStagedSsiWeeklyDraft(input)).toEqual({ error: `weekly_part_prepared:${part}` });
  const complete = await generateStagedSsiWeeklyDraft(input);
  expect(generate).toHaveBeenCalledTimes(3); expect(complete.report?.summary).toHaveLength(27);
  expect(complete.report?.summary.filter(line => line.startsWith("Частина "))).toHaveLength(3);
  expect(await generateStagedSsiWeeklyDraft({ ...input, prompt: "changed input" })).toEqual({ error: "weekly_draft_context_changed" });
  expect(generate).toHaveBeenCalledTimes(3);
});
it("does not checkpoint a failed generation or a changed lease", async () => {
  mocks.query.mockResolvedValue([{ lease: "old", reportDraftPartsJson: null }]);
  const input = { end: "2026-10-30", prompt: "frozen", model: "fixture" };
  expect(await generateStagedSsiWeeklyDraft({ ...input, generate: async () => ({ error: "timeout" }) })).toEqual({ error: "timeout" });
  expect(mocks.execute).not.toHaveBeenCalled(); mocks.execute.mockResolvedValue(0);
  expect(await generateStagedSsiWeeklyDraft({ ...input, generate: async () => ({ report: { title: "fixture", summary: paragraphs } }) })).toEqual({ error: "weekly_preparation_lease_changed" });
});
it("rejects a soy contract in the grain part and a CPT Chop label", () => {
  const draft = { title: getSsiWeeklyRequiredParts("uk")[1].title, summary: [...paragraphs] };
  draft.summary[0] = "CBOT кукурудза SX6 листопад помилково позначена як зерновий контракт.";
  expect(parseSsiPart(JSON.stringify(draft), "grains").error).toBe("weekly_contract_crop_mismatch");
  draft.summary[0] = "Кукурудза CPT Чоп помилково позначена замість FCA Чоп у цьому рядку.";
  expect(parseSsiPart(JSON.stringify(draft), "grains").error).toBe("weekly_basis_mismatch");
});
it("rejects a whole-part string or repeated control-character padding", () => {
  const title = getSsiWeeklyRequiredParts("uk")[0].title;
  expect(parseSsiPart(JSON.stringify({ title, summary: ["paragraph\r\n".repeat(100), ...paragraphs] }), "logistics").error).toBe("weekly_part_incomplete");
});
it("requires separate headings and a whole-message reserve without relaxing UTF-16 item checks", () => {
  const part = getSsiWeeklyRequiredParts("uk")[0];
  const summary = [...part.sections, ...paragraphs];
  expect(parseSsiPart(JSON.stringify({ title: part.title, summary }), "logistics").report).toBeDefined();
  const merged = [part.sections.join(","), ...paragraphs];
  expect(parseSsiPart(JSON.stringify({ title: part.title, summary: merged }), "logistics").error).toBe("weekly_part_sections_missing");
  const oversized = [...part.sections, ...Array.from({ length: 8 }, () => "verified dated source fact and correct unit ".repeat(12))];
  expect(parseSsiPart(JSON.stringify({ title: part.title, summary: oversized }), "logistics").error).toBe("weekly_part_too_long");
  const emojiBoundary = [...summary]; emojiBoundary[5] = "a".repeat(699) + "🌾";
  expect(parseSsiPart(JSON.stringify({ title: part.title, summary: emojiBoundary }), "logistics").error).toBe("weekly_part_incomplete");
  expect(ssiPartFormat("logistics").schema.properties.summary.items.maxLength).toBe(600);
  expect(ssiStagedPartInstructions("logistics", true)).toContain("SHAPE REPAIR");
  expect(ssiStagedPartInstructions("logistics")).toContain("overview 2, road/Danube road 4, rail 3, border 3, ports 1");
});
