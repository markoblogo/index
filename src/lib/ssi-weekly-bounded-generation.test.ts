import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({ hasDatabaseUrl: () => false, db: {} }));
vi.mock("./fetch-timeout", () => ({ fetchWithTimeout: mocks.fetch }));
vi.mock("./commodity-intelligence-layer", () => ({ buildCortexMarketReportContextPack: () => ({}), mergeCortexContextPacks: () => ({}) }));
vi.mock("./cortex-editorial-shadow", () => ({ getCortexEditorialGuidance: async () => ({ active: true }) }));
vi.mock("./cortex-editorial-quality-gate", () => ({ assessCortexEditorialDraft: () => ({ reasons: ["fixture"] }), shouldAttemptCortexEditorialRewrite: () => true }));
vi.mock("./media-hub-report-prompts", () => ({ buildMediaHubReportPrompt: () => "Return JSON with title and summary using provided evidence only.", renderCortexEditorialStructureProfile: () => "" }));
import { generateMediaHubLlmReports } from "./media-hub-llm-report";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
it("bounds paired SSI drafting to one Ukrainian call, without web search or shadow rewrites", async () => {
  vi.stubEnv("OPENAI_API_KEY", "fixture"); vi.stubEnv("MEDIA_HUB_CORTEX_MEMORY_CONTEXT_ENABLED", "0");
  mocks.fetch.mockImplementation(async () => Response.json({ status: "completed", output: [{ content: [{ text: JSON.stringify({ title: "Weekly fixture", summary: Array.from({ length: 14 }, (_, i) => `Verified source note ${i} describes the matched weekly grain flow clearly.`) }) }] }] }));
  const result = await generateMediaHubLlmReports({ tenant: "spike", kind: "weekly", pairedWeeklyWorker: true,
    periodStartDate: "2026-10-24", periodEndDate: "2026-10-30", snapshots: [], latestData: [] });
  expect(result.localized.uk?.summary).toHaveLength(14);
  expect(result.localized.en).toBeUndefined(); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  const request = JSON.parse(mocks.fetch.mock.calls[0][1].body);
  expect(request.max_output_tokens).toBe(16000); expect(request.tools).toBeUndefined();
  expect(mocks.fetch.mock.calls[0][2]).toBe(180000);
  expect(result.qualityCandidates?.uk?.rewriteAttempted).toBe(false);
});
