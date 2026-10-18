import { describe, expect, it, vi } from "vitest";
const { query, execute, revalidate } = vi.hoisted(() => ({ query: vi.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([]), execute: vi.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1), revalidate: vi.fn(() => { throw new Error("Cache invalidation during render"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", async importOriginal => ({ ...await importOriginal<typeof import("next/cache")>(), revalidatePath: revalidate }));
vi.mock("@/lib/db", () => ({ db: { $queryRawUnsafe: query, $executeRawUnsafe: execute }, hasDatabaseUrl: () => true }));
vi.mock("@/lib/report-workspace", () => ({ getReportWorkspaceConfig: async () => ({ publishAt: "14:00" }), getLocalizedReportWorkspaceText: vi.fn(), listReportWorkspaceResources: vi.fn(async () => []) }));
import { ensureWeeklyReport } from "./weekly-ai-report";

describe("weekly admin render", () => {
  it("can initialize a missing draft without cache invalidation during render", async () => {
    await expect(ensureWeeklyReport("2026-10-17", "uk")).resolves.toBeNull();
    expect(execute.mock.calls.some(call => String(call[0]).includes('INSERT INTO "WeeklyReport"'))).toBe(true);
    expect(revalidate).not.toHaveBeenCalled();
  });
});
