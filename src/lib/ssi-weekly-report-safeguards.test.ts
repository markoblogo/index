import { describe, expect, it } from "vitest";
import { getWeeklyAiLimits, weeklyPublishedComparison, fitSsiTelegramPart, isSsiTelegramPackValid } from "./ssi-weekly-report-safeguards";
import { buildSsiNonDailyStructuredMessages } from "./ssi-non-daily-channel-report";

const observation = (date: string, valueUsdPerMt: number) => ({ date, valueUsdPerMt, respondents: 1 });

describe("SSI weekly runtime safeguards", () => {
  it("budgets all three representations without changing other tenants", () => {
    expect(getWeeklyAiLimits("spike-ua")).toEqual({ maxOutputTokens: 16000, timeoutMs: 180000 });
    expect(getWeeklyAiLimits("uga-ua")).toEqual({ maxOutputTokens: 2200, timeoutMs: 60000 });
    expect(getWeeklyAiLimits("spike-ua").timeoutMs).toBeLessThan(300000);
  });
  it("compares published Friday cutoffs, not Monday-Friday", () => {
    expect(weeklyPublishedComparison([
      observation("2026-10-23", 420), observation("2026-10-19", 440), observation("2026-10-16", 450),
      observation("2026-10-30", 900),
    ], "2026-10-23")).toMatchObject({ latestValue: 420, weeklyChangeAbs: -30, weeklyChangePct: -6.7,
      comparisonStartDate: "2026-10-16", comparisonEndDate: "2026-10-23" });
  });
  it("does not turn missing or stale weekly endpoints into zero change", () => {
    expect(weeklyPublishedComparison([observation("2026-10-19", 440), observation("2026-10-23", 420)], "2026-10-23"))
      .toMatchObject({ latestValue: 420, weeklyChangeAbs: null, weeklyChangePct: null });
    expect(weeklyPublishedComparison([observation("2026-10-16", 450), observation("2026-10-22", 420)], "2026-10-23"))
      .toMatchObject({ latestValue: null, weeklyChangeAbs: null });
  });
  it("handles year boundaries and a genuine unchanged price", () => {
    expect(weeklyPublishedComparison([observation("2026-12-25", 420), observation("2027-01-01", 420)], "2027-01-01"))
      .toMatchObject({ comparisonStartDate: "2026-12-25", weeklyChangeAbs: 0, weeklyChangePct: 0 });
  });
  it("keeps HTML, full facts, late sections and footer within one message", () => {
    const long = `Seed & oil ${"🌻".repeat(1700)} complete sentence.`;
    const result = fitSsiTelegramPart({ header: "<b>Weekly</b>", footer: "<i>Partner\nContinuation 🌎</i>", fallback: "unused",
      sections: [{ heading: "Sunflower", items: [long, long + " another"] }, { heading: "Soy", items: ["A complete soybean fact."] }] });
    expect(result.length).toBeLessThanOrEqual(3900);
    expect(result).toContain("Seed &amp; oil");
    expect(result).toContain("A complete soybean fact.");
    expect(result.endsWith("<i>Partner\nContinuation 🌎</i>")).toBe(true);
    expect(isSsiTelegramPackValid([result, result, result])).toBe(true);
    expect(result).not.toContain("Report shortened");
  });
  it("fails closed instead of slicing an indivisible fact", () => {
    expect(() => fitSsiTelegramPart({ header: "Header", footer: "Footer", fallback: "unused",
      sections: [{ heading: "Crop", items: ["X".repeat(5000)] }] })).toThrow("no_complete_fact_fits");
  });
  it("rejects oversized or broken AI message packs", () => {
    expect(isSsiTelegramPackValid(["<b>ok</b>", "ok", "ok"])).toBe(true);
    expect(isSsiTelegramPackValid(["<b>broken", "ok", "ok"])).toBe(false);
    expect(isSsiTelegramPackValid(["🌻".repeat(2049), "ok", "ok"])).toBe(false);
    expect(isSsiTelegramPackValid(["broken &am", "ok", "ok"])).toBe(false);
    expect(isSsiTelegramPackValid(["one", "two", "three", "four"])).toBe(false);
  });
  it("keeps the channel renderer's three footers for long real-shaped sections", () => {
    const messages = buildSsiNonDailyStructuredMessages({ kind: "weekly", locale: "uk", periodEndDate: "2026-10-23",
      content: { summary: Array.from({ length: 8 }, (_, i) => `Кукурудза та пшениця: експорт через порти, позиція ${i}. ${"Перевірений потік зерна. ".repeat(27)}`), windows: [] } });
    expect(messages).toHaveLength(3);
    expect(isSsiTelegramPackValid(messages)).toBe(true);
    expect(messages[0]).toContain("Продовження нижче");
    expect(messages[1]).toContain("Продовження нижче");
    expect(messages[2]).toContain("Ваш торговий партнер");
  });
});
