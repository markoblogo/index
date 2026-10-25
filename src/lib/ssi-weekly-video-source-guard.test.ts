import { describe, expect, it } from "vitest";
import { videoClaimMatchesReport } from "./ssi-weekly-video-source-guard";
import { authorizeSsiVideoWorker } from "./ssi-weekly-video-worker-auth";
import type { VideoClaim } from "./ssi-weekly-video-packet";

const quote = "Кукурудза CPT Одеса — 160 $/т, станом на 30.10.2026.";
const claim: VideoClaim & { sourceQuote: string } = { id: "claim:corn", evidenceId: "source:corn", part: "grains", value: 160,
  unit: "USD/t", basis: "CPT Odesa", period: { start: "2026-10-30", end: "2026-10-30", label: "30 Oct" }, sourceQuote: quote,
  english: { headline: "Corn at the port", narration: "The port level is lower.", takeaway: "Compare delivery bases." } };

describe("video source guards", () => {
  it("binds exact values, currency, basis and observation period", () => {
    expect(videoClaimMatchesReport(claim, quote, "2026-10-30")).toBe(true);
    for (const changed of [{ ...claim, unit: "EUR/t" }, { ...claim, basis: "CPT plant" }, { ...claim, value: 161 },
      { ...claim, period: { ...claim.period, end: "2026-10-23" } }]) expect(videoClaimMatchesReport(changed, quote, "2026-10-30")).toBe(false);
  });
  it("does not relabel short tons as metric tonnes or millions as thousands", () => {
    const meal = "CBOT соєвий шрот — 346.10 $/коротку тонну.";
    expect(videoClaimMatchesReport({ ...claim, value: 346.10, basis: "CBOT", unit: "USD/t", sourceQuote: meal }, meal, "2026-10-30")).toBe(false);
    expect(videoClaimMatchesReport({ ...claim, value: 346.10, basis: "CBOT", unit: "USD/short ton", sourceQuote: meal }, meal, "2026-10-30")).toBe(true);
    const tonnes = "Митно оформлено 2.172 млн т.";
    expect(videoClaimMatchesReport({ ...claim, value: 2.172, basis: "customs clearance", unit: "thousand tonnes", sourceQuote: tonnes }, tonnes, "2026-10-30")).toBe(false);
  });
  it("requires an explicit date for older comparison observations", () => {
    const prior = "Кукурудза CPT Одеса — 165 $/т на 23.10.2026.";
    expect(videoClaimMatchesReport({ ...claim, value: 165, sourceQuote: prior, period: { ...claim.period, start: "2026-10-23", end: "2026-10-23" } }, prior, "2026-10-30")).toBe(true);
  });
  it("reads thousands separators and rejects nonexistent calendar dates", () => {
    const soy = "CBOT соя — 1'256.50 цента/бушель.";
    expect(videoClaimMatchesReport({ ...claim, value: 1256.5, basis: "CBOT", unit: "cents/bu", sourceQuote: soy }, soy, "2026-10-30")).toBe(true);
    expect(videoClaimMatchesReport({ ...claim, period: { start: "2026-02-30", end: "2026-10-30", label: "Invalid" } }, quote, "2026-10-30")).toBe(false);
  });
});

describe("scoped worker authorization", () => {
  const input = { secret: "fixture-scoped-worker-key", enabled: true, ssiTenant: true, held: false, startDate: "2026-11-01", now: new Date("2026-11-01T10:00:00Z") };
  const request = new Request("https://spike.1d3x.com/api/admin/media-hub/weekly-video-worker", { headers: { Authorization: "Bearer fixture-scoped-worker-key" } });
  it("fails closed on missing/bad auth, another tenant, disabled mode and hold", () => {
    expect(authorizeSsiVideoWorker(new Request(request.url), input).status).toBe(401);
    expect(authorizeSsiVideoWorker(request, { ...input, secret: undefined }).status).toBe(401);
    expect(authorizeSsiVideoWorker(request, { ...input, ssiTenant: false }).status).toBe(403);
    expect(authorizeSsiVideoWorker(request, { ...input, enabled: false }).status).toBe(403);
    expect(authorizeSsiVideoWorker(request, { ...input, held: true }).status).toBe(423);
  });
  it("cannot start before November or run on Monday, but accepts late Sunday", () => {
    expect(authorizeSsiVideoWorker(request, { ...input, now: new Date("2026-10-25T10:00:00Z") }).status).toBe(409);
    expect(authorizeSsiVideoWorker(request, { ...input, now: new Date("2026-11-02T10:00:00Z") }).status).toBe(409);
    expect(authorizeSsiVideoWorker(request, input).status).toBe(200);
  });
});
