import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));

import { buildMediaHubReportPrompt } from "./media-hub-report-prompts";
import {
  buildMediaHubMaterialHelpText,
  buildMediaHubMaterialsText,
  buildMediaHubSubmissionReply,
  buildMediaHubTagsText,
  buildMissingProjectTagText,
  parseMediaHubMaterialBotCommand,
} from "./media-hub-material-bot";
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

  it("defaults material report type to weekly and accepts explicit weekly tag", () => {
    expect(parseMediaHubMaterialHashtags("#ssi #weekly https://example.com")).toMatchObject({
      kind: "weekly_material",
      tenantIds: ["spike-ua"],
    });
    expect(parseMediaHubMaterialHashtags("#1d3x file caption")).toMatchObject({
      kind: "weekly_material",
      tenantIds: ["1d3x"],
    });
  });

  it("canonicalizes material URLs and strips tracking params", () => {
    expect(canonicalizeMediaHubMaterialUrl("https://www.example.com/a/?utm_source=x&b=1#top"))
      .toBe("https://example.com/a?b=1");
    expect(extractUrlsFromText("#ssi https://example.com/a?fbclid=1")).toEqual([
      "https://example.com/a",
    ]);
    expect(extractUrlsFromText("#ssi https://example.com/a https://example.org/b")).toEqual([
      "https://example.com/a",
      "https://example.org/b",
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

describe("media hub material bot", () => {
  it("parses help and operator commands", () => {
    expect(parseMediaHubMaterialBotCommand("/start")).toBe("start");
    expect(parseMediaHubMaterialBotCommand("/help@idex_grains_bot")).toBe("help");
    expect(parseMediaHubMaterialBotCommand("/materials")).toBe("materials");
    expect(parseMediaHubMaterialBotCommand("/status")).toBe("status");
    expect(parseMediaHubMaterialBotCommand("/tags")).toBe("tags");
    expect(parseMediaHubMaterialBotCommand("#ssi https://example.com")).toBeNull();
  });

  it("renders user-facing bot instructions with project and report tags", () => {
    const helpText = buildMediaHubMaterialHelpText();
    expect(helpText).toContain("#ssi");
    expect(helpText).toContain("#1d3x");
    expect(helpText).toContain("#weekly");
    expect(helpText).toContain("#monthly");
    expect(helpText).toContain("PDF, XLSX, CSV, DOCX");

    const materialsText = buildMediaHubMaterialsText("/admin/media-hub/materials");
    expect(materialsText).toContain("#ssi #weekly <посилання>");
    expect(materialsText).toContain("#1d3x #weekly <посилання>");
    expect(materialsText).toContain("/admin/media-hub/materials");

    expect(buildMediaHubTagsText()).toContain("без #weekly/#monthly/#daily матеріал піде у #weekly");
    expect(buildMissingProjectTagText()).toContain("Додайте #ssi або #1d3x");
  });

  it("renders status-aware submission replies", () => {
    expect(buildMediaHubSubmissionReply({
      kind: "weekly_material",
      label: "https://example.com/report",
      sourceType: "link",
      status: "extracted",
      tenantId: "1d3x",
    })).toContain("Матеріал оброблено для 1D3X: weekly");

    expect(buildMediaHubSubmissionReply({
      kind: "monthly_material",
      label: "file.pdf",
      mimeType: "application/pdf",
      sourceType: "file",
      status: "duplicate",
      tenantId: "spike-ua",
    })).toContain("Дублікат не додано");
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
