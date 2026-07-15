import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import {
  buildCortexEditorialGuidance,
  buildCortexEditorialShadowObservation,
  normalizeCortexEditorialShadowListLimit,
} from "./cortex-editorial-shadow";

vi.mock("server-only", () => ({}));

describe("Cortex editorial shadow", () => {
  it("matches a later editorial post and records observable edits", () => {
    const observation = buildCortexEditorialShadowObservation({
      posts: [{ id: "telegram:1198567788:42", publishedAt: "2026-07-15T18:30:00.000Z", text: "SSI Daily. Wheat CPT Odesa is 210 USD/t. Demand remains stable.", url: "https://t.me/spike_brokers/42" }],
      report: { createdAt: "2026-07-15T17:00:00.000Z", draftText: "SSI Daily report. Wheat CPT Odesa is 210 USD/t. Demand remains stable. Additional market context.", id: "report-daily-1", kind: "daily" },
    });
    expect(observation.status).toBe("matched");
    expect(observation.editorialPost?.url).toBe("https://t.me/spike_brokers/42");
    expect(observation.metrics).toMatchObject({ lexicalOverlap: expect.any(Number) });
    expect(observation.metrics?.sentencesRemoved).toBeGreaterThan(0);
    expect(observation.visibility).toBe("protected");
  });

  it("keeps a report pending when no later editorial post exists", () => {
    const observation = buildCortexEditorialShadowObservation({
      posts: [],
      report: { createdAt: "2026-07-15T17:00:00.000Z", draftText: "Daily report draft.", id: "report-daily-2", kind: "daily" },
    });
    expect(observation.status).toBe("awaiting_editorial");
    expect(observation.editorialPost).toBeNull();
    expect(observation.metrics).toBeNull();
  });

  it("does not choose between similarly matching posts", () => {
    const observation = buildCortexEditorialShadowObservation({
      posts: [
        { id: "one", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable", url: "https://t.me/spike_brokers/1" },
        { id: "two", publishedAt: "2026-07-15T18:10:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable", url: "https://t.me/spike_brokers/2" },
      ],
      report: { createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand remains stable.", id: "report-daily-3", kind: "daily" },
    });
    expect(observation.status).toBe("ambiguous");
  });

  it("clamps bounded internal scans", () => {
    expect(normalizeCortexEditorialShadowListLimit(undefined)).toBe(14);
    expect(normalizeCortexEditorialShadowListLimit(0)).toBe(1);
    expect(normalizeCortexEditorialShadowListLimit(100)).toBe(60);
  });

  it("activates daily style guidance only after a bounded matched corpus exists", () => {
    const example = buildCortexEditorialShadowObservation({
      posts: [{ id: "post", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable.", url: "https://t.me/spike_brokers/1" }],
      report: { createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand stable and market context.", id: "profile-base", kind: "daily" },
    });
    const observations = Array.from({ length: 10 }, (_, index) => ({ ...example, id: `sample-${index}` }));
    const guidance = buildCortexEditorialGuidance({ kind: "daily", observations });

    expect(guidance.active).toBe(true);
    expect(guidance.targetWordRange).toEqual({ max: 8, min: 8 });
    expect(guidance.version).toHaveLength(16);
  });

  it("uses the weekly corpus as the monthly structural benchmark", () => {
    const example = buildCortexEditorialShadowObservation({
      posts: [{ id: "post", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable.", url: "https://t.me/spike_brokers/1" }],
      report: { createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand stable and market context.", id: "weekly-profile", kind: "weekly" },
    });
    const guidance = buildCortexEditorialGuidance({
      kind: "monthly",
      observations: Array.from({ length: 6 }, (_, index) => ({ ...example, id: `weekly-${index}` })),
    });

    expect(guidance).toMatchObject({ active: true, benchmarkKind: "weekly" });
    expect(guidance.reason).toContain("monthly structure");
  });
});
