import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));

import { buildMediaHubReportPrompt } from "./media-hub-report-prompts";
import {
  __mediaHubManualMaterialTestHooks,
} from "./media-hub-manual-materials";

const {
  canonicalizeMediaHubMaterialUrl,
  extractUrlsFromText,
  getMediaHubManualMaterialPeriod,
  parseMediaHubMaterialHashtags,
} = __mediaHubManualMaterialTestHooks;

describe("media hub manual materials", () => {
  it("routes hashtags to SSI, 1D3X, or both tenants", () => {
    expect(parseMediaHubMaterialHashtags("#ssi https://example.com")).toMatchObject({
      kind: "weekly_material",
      tenantIds: ["spike-ua"],
    });
    expect(parseMediaHubMaterialHashtags("#1d3x #monthly report")).toMatchObject({
      kind: "monthly_material",
      tenantIds: ["1d3x"],
    });
    expect(parseMediaHubMaterialHashtags("#ssi #1d3x #daily")).toMatchObject({
      kind: "daily_material",
      tenantIds: ["spike-ua", "1d3x"],
    });
    expect(parseMediaHubMaterialHashtags("no tag")).toMatchObject({
      tenantIds: [],
    });
  });

  it("canonicalizes material URLs and strips tracking params", () => {
    expect(canonicalizeMediaHubMaterialUrl("https://www.example.com/a/?utm_source=x&b=1#top"))
      .toBe("https://example.com/a?b=1");
    expect(extractUrlsFromText("#ssi https://example.com/a?fbclid=1")).toEqual([
      "https://example.com/a",
    ]);
  });

  it("calculates weekly and monthly reporting periods", () => {
    expect(getMediaHubManualMaterialPeriod(new Date("2026-06-19T12:00:00Z"))).toMatchObject({
      reportingWeekStart: "2026-06-15",
      reportingWeekEnd: "2026-06-20",
    });
    expect(getMediaHubManualMaterialPeriod(new Date("2026-06-19T12:00:00Z"), "monthly_material")).toMatchObject({
      reportingWeekStart: "2026-06-01",
      reportingWeekEnd: "2026-06-19",
      reportingMonth: "2026-06",
    });
  });
});

describe("media hub report prompts", () => {
  it("builds SSI weekly structure without Spike Brokers branding", () => {
    const prompt = buildMediaHubReportPrompt({
      kind: "weekly",
      latestData: [],
      locale: "uk",
      manualMaterials: [],
      periodEndDate: "2026-06-20",
      periodStartDate: "2026-06-15",
      snapshots: [],
      tenant: "spike",
    });

    expect(prompt).toContain("Частина I. Логістика");
    expect(prompt).toContain("SPIKE Spot Commodity Index Ukraine");
    expect(prompt).toContain("Spike Spot Index / https://spike.1d3x.com/");
    expect(prompt).not.toContain("Spike Brokers – Ваш торговий партнер");
  });

  it("builds 1D3X weekly structure without SSI index section", () => {
    const prompt = buildMediaHubReportPrompt({
      kind: "weekly",
      latestData: [],
      locale: "en",
      manualMaterials: [],
      periodEndDate: "2026-06-20",
      periodStartDate: "2026-06-15",
      snapshots: [],
      tenant: "platform",
    });

    expect(prompt).toContain("🌍 1D3X | Weekly Commodity & Logistics Market");
    expect(prompt).toContain("Part I. Logistics & Freight");
    expect(prompt).toContain("1D3X / https://1d3x.com/");
    expect(prompt).not.toContain("SPIKE Spot Commodity Index Ukraine");
  });
});
