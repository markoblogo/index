import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {}, hasDatabaseUrl: () => false }));
import { hasReadableSsiDriveMaterial } from "./ssi-weekly-logistics-control";

describe("SSI Drive evidence readiness", () => {
  const extractedText = "UZ rail freight statistics for the current reporting period. ".repeat(4);
  it("accepts readable extracted or explicitly partial text", () => {
    expect(hasReadableSsiDriveMaterial({ extractedText, extractionStatus: "extracted" })).toBe(true);
    expect(hasReadableSsiDriveMaterial({ extractedText, extractionStatus: "partial" })).toBe(true);
  });
  it("does not unlock reporting for binary gibberish, previews or missing text", () => {
    expect(hasReadableSsiDriveMaterial({ extractedText: extractedText + "\u001b", extractionStatus: "partial" })).toBe(false);
    expect(hasReadableSsiDriveMaterial({ extractedText, extractionStatus: "partial_visual_pending" })).toBe(false);
    expect(hasReadableSsiDriveMaterial({ extractedText: "PDF received", extractionStatus: "partial" })).toBe(false);
  });
});
