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
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "SSI Daily report. Wheat CPT Odesa is 210 USD/t. Demand remains stable. Additional market context.", id: "report-daily-1", kind: "daily" },
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
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Daily report draft.", id: "report-daily-2", kind: "daily" },
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
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand remains stable.", id: "report-daily-3", kind: "daily" },
    });
    expect(observation.status).toBe("ambiguous");
  });

  it("classifies single-candidate lexical ambiguity separately", () => {
    const observation = buildCortexEditorialShadowObservation({
      posts: [
        { id: "one", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat 210", url: "https://t.me/spike_brokers/1" },
      ],
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Unrelated draft text that cannot be matched by any post content.", id: "report-daily-4", kind: "daily" },
    });
    expect(observation.status).toBe("ambiguous");
    expect(observation.matchingReason).toContain("Single candidate with low lexical overlap");
  });

  it("labels multi-candidate close scores as ambiguous_competing_posts", () => {
    const observation = buildCortexEditorialShadowObservation({
      posts: [
        { id: "one", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD per ton with stable demand", url: "https://t.me/spike_brokers/1" },
        { id: "two", publishedAt: "2026-07-15T18:10:00.000Z", text: "Wheat CPT Odesa 210 USD per ton with stable demand and no change", url: "https://t.me/spike_brokers/2" },
      ],
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD per ton stable demand", id: "report-daily-5", kind: "daily" },
    });
    expect(observation.status).toBe("ambiguous");
    expect(observation.matchingReason).toContain("Candidate overlap is too close");
  });

  it("clamps bounded internal scans", () => {
    expect(normalizeCortexEditorialShadowListLimit(undefined)).toBe(14);
    expect(normalizeCortexEditorialShadowListLimit(0)).toBe(1);
    expect(normalizeCortexEditorialShadowListLimit(100)).toBe(60);
  });

  it("activates daily style guidance only after a bounded matched corpus exists", () => {
    const example = buildCortexEditorialShadowObservation({
      posts: [{ id: "post", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable.", url: "https://t.me/spike_brokers/1" }],
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand stable and market context.", id: "profile-base", kind: "daily" },
    });
    const observations = Array.from({ length: 10 }, (_, index) => ({ ...example, id: `sample-${index}` }));
    const guidance = buildCortexEditorialGuidance({ kind: "daily", observations });

    expect(guidance.active).toBe(true);
    expect(guidance.targetWordRange).toEqual({ max: 8, min: 8 });
    expect(guidance.version).toHaveLength(16);
  });

  it("derives a generic structural profile without retaining benchmark wording", () => {
    const example = buildCortexEditorialShadowObservation({
      posts: [{ id: "post", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable.", url: "https://t.me/spike_brokers/1" }],
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand stable and market context.", id: "structure-base", kind: "daily" },
    });
    const guidance = buildCortexEditorialGuidance({
      editorialTexts: Array.from({ length: 10 }, () => "🔎 Головні сигнали\nДеталь.\n🚚 Логістика\nДеталь.\n🌾 Зернові\nДеталь."),
      kind: "daily",
      observations: Array.from({ length: 10 }, (_, index) => ({ ...example, id: `structure-${index}` })),
    });

    expect(guidance.structureProfile).toMatchObject({
      active: true,
      emojiHeadingRate: 1,
      sectionFamilies: ["signals", "logistics", "grains"],
    });
  });

  it("uses the weekly corpus as the monthly structural benchmark", () => {
    const example = buildCortexEditorialShadowObservation({
      posts: [{ id: "post", publishedAt: "2026-07-15T18:00:00.000Z", text: "Wheat CPT Odesa 210 USD/t demand stable.", url: "https://t.me/spike_brokers/1" }],
      report: { candidate: "original", createdAt: "2026-07-15T17:00:00.000Z", draftText: "Wheat CPT Odesa 210 USD/t demand stable and market context.", id: "weekly-profile", kind: "weekly" },
    });
    const guidance = buildCortexEditorialGuidance({
      kind: "monthly",
      observations: Array.from({ length: 6 }, (_, index) => ({ ...example, id: `weekly-${index}` })),
    });

    expect(guidance).toMatchObject({ active: true, benchmarkKind: "weekly" });
    expect(guidance.reason).toContain("monthly structure");
  });
});
