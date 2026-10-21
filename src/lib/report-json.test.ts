import { describe, expect, it } from "vitest";
import { stringifyReportJson, truncateReportText } from "./report-json";

describe("PostgreSQL report JSON", () => {
  it("does not split an emoji at the evidence truncation boundary", () => {
    const text = "a".repeat(499) + "🌾 actual yield 5,88 т/га";
    expect(text.slice(0, 500).isWellFormed()).toBe(false);
    expect(truncateReportText(text, 500)).toBe("a".repeat(499));
    expect(truncateReportText(text, 501)).toBe("a".repeat(499) + "🌾");
  });
  it("repairs orphan surrogates in nested report fields without changing valid figures", () => {
    const json = stringifyReportJson({ text: "5,88 т/га. \ud83d", source: [{ text: "\udc00 🌾" }], value: 165, delta: 0 });
    expect(json).not.toMatch(/\\u[dD][89aAbBcCdDeEfF][0-9a-fA-F]{2}/);
    expect(JSON.parse(json)).toEqual({ text: "5,88 т/га. �", source: [{ text: "� 🌾" }], value: 165, delta: 0 });
  });
});
