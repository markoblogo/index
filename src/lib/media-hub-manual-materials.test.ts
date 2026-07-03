import { afterEach, describe, expect, it, vi } from "vitest";

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
  __mediaHubCorporateTelegramTestHooks,
  CORPORATE_TELEGRAM_BOT_API_CHAT_ID,
  CORPORATE_TELEGRAM_PEER_ID,
} from "./media-hub-corporate-telegram";
import {
  __mediaHubManualMaterialTestHooks,
} from "./media-hub-manual-materials";

const {
  canonicalizeMediaHubMaterialUrl,
  extractMaterialContent,
  extractUrlsFromText,
  getMediaHubManualMaterialPeriod,
  isUnsafeMaterialUrl,
  parseMediaHubMaterialHashtags,
} = __mediaHubManualMaterialTestHooks;
const {
  inferCorporateTelegramTenants,
  normalizeTelegramBotApiChatId,
} = __mediaHubCorporateTelegramTestHooks;

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENAI_API_KEY;
  delete process.env.MEDIA_HUB_ENABLE_VISION_SUMMARY;
});

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

  it("blocks local, private and link-local material URLs", () => {
    expect(isUnsafeMaterialUrl("https://example.com/report.pdf")).toBe(false);
    expect(isUnsafeMaterialUrl("http://localhost/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://metadata.localhost/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://internal/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://127.0.0.1/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://0.0.0.0/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://10.0.0.5/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://172.16.0.5/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://192.168.1.5/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://169.254.169.254/latest/meta-data")).toBe(true);
    expect(isUnsafeMaterialUrl("http://[::1]/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://[fe80::1]/report.pdf")).toBe(true);
    expect(isUnsafeMaterialUrl("http://[fc00::1]/report.pdf")).toBe(true);
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

  it("creates visual assets for image materials", async () => {
    const extraction = await extractMaterialContent({
      bytes: Buffer.from("fake-image"),
      filename: "chart.png",
      mimeType: "image/png",
    });

    expect(extraction.extractionStatus).toBe("partial_visual_pending");
    expect(extraction.assets.map((asset) => asset.assetType)).toContain("preview_image");
    expect(extraction.assets.map((asset) => asset.assetType)).toContain("visual_summary");
  });

  it("adds OpenAI vision summaries to visual assets when enabled", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      output_text: "• Wheat table shows higher export offers. • Corn route map highlights port congestion.",
    }), { status: 200 })));

    const extraction = await extractMaterialContent({
      bytes: Buffer.from("fake-image"),
      filename: "chart.png",
      mimeType: "image/png",
    });

    expect(fetch).toHaveBeenCalledWith("https://api.openai.com/v1/responses", expect.any(Object));
    expect(extraction.assets.some((asset) =>
      asset.assetType === "visual_summary" &&
      asset.visualSummary?.includes("Wheat table"),
    )).toBe(true);
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

describe("media hub corporate Telegram group", () => {
  it("normalizes raw peer id to Bot API supergroup chat id", () => {
    expect(CORPORATE_TELEGRAM_PEER_ID).toBe("1865902381");
    expect(CORPORATE_TELEGRAM_BOT_API_CHAT_ID).toBe("-1001865902381");
    expect(normalizeTelegramBotApiChatId("1865902381")).toBe("-1001865902381");
    expect(normalizeTelegramBotApiChatId("-1001865902381")).toBe("-1001865902381");
  });

  it("routes corporate Telegram messages by tags and keyword fallback", () => {
    expect(inferCorporateTelegramTenants("#ssi Ukraine corn CPT Odesa")).toEqual(["spike-ua"]);
    expect(inferCorporateTelegramTenants("#1d3x CBOT soybean futures")).toEqual(["1d3x"]);
    expect(inferCorporateTelegramTenants("#ssi #1d3x wheat freight update")).toEqual(["spike-ua", "1d3x"]);
    expect(inferCorporateTelegramTenants("Brazil USDA crop weather and global grains")).toEqual(["1d3x"]);
    expect(inferCorporateTelegramTenants("internal design note with no market routing")).toEqual([]);
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

  it("adds visual material evidence to report prompts", () => {
    const prompt = buildMediaHubReportPrompt({
      kind: "weekly",
      latestData: [],
      locale: "en",
      manualMaterials: [{
        assets: [{
          assetType: "preview_image",
          byteSize: 1200,
          confidence: 0.5,
          extractedText: "",
          id: "asset-1",
          metadata: {},
          mimeType: "image/png",
          pageNumber: 1,
          storagePath: "mediahub://preview/page-1.png",
          visualSummary: "Wheat export tender table and corn weather chart are visible on PDF page 1.",
        }],
        extractedFacts: [],
        extractedTables: [],
        extractedText: "Wheat export tender and corn weather update.",
        extractionStatus: "partial",
        id: "material-1",
        kind: "weekly_material",
        originalFilename: "weekly.pdf",
        originalUrl: null,
        receivedAt: new Date("2026-06-20T12:00:00Z"),
        sourceDomain: null,
        sourceRegistrationStatus: "none",
        sourceType: "telegram_file",
        summary: "Wheat export tender and corn weather update.",
        tenantId: "1d3x",
        usedInReportId: null,
      }],
      periodEndDate: "2026-06-20",
      periodStartDate: "2026-06-15",
      snapshots: [],
      tenant: "platform",
    });

    expect(prompt).toContain("Visual/file evidence");
    expect(prompt).toContain("weekly.pdf page 1");
  });
});
