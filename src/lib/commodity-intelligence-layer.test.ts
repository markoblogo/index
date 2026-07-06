import { describe, expect, it } from "vitest";
import {
  buildCortexContextPack,
  buildCortexMarketReportContextPack,
  CORTEX_LIFECYCLE,
  canUseVisibilityInExternalModel,
  CORTEX_INITIAL_SOURCES,
  CORTEX_PROJECT_RESOURCES,
  mergeCortexContextPacks,
} from "@/lib/commodity-intelligence-layer";

describe("1D3X Cortex contracts", () => {
  it("registers the first ecosystem resources", () => {
    const resourceIds = CORTEX_PROJECT_RESOURCES.map((resource) => resource.id);
    const sourceIds = CORTEX_INITIAL_SOURCES.map((source) => source.id);

    expect(resourceIds).toContain("index-platform");
    expect(resourceIds).toContain("index-raw-data");
    expect(resourceIds).toContain("index-calculation-ledger");
    expect(resourceIds).toContain("mn7r-monitor");
    expect(resourceIds).toContain("cropto-infra");
    expect(resourceIds).toContain("ecosystem-sites");
    expect(resourceIds).toContain("ecosystem-knowledge-library");
    expect(resourceIds).toContain("ecosystem-codebases");
    expect(resourceIds).toContain("ecosystem-action-memory");
    expect(resourceIds).toContain("ecosystem-archives");
    expect(sourceIds).toContain("mediahub-global-sources");
    expect(sourceIds).toContain("mediahub-raw-monitoring-items");
    expect(sourceIds).toContain("mediahub-telegram-materials");
    expect(sourceIds).toContain("ssi-respondent-inputs");
    expect(sourceIds).toContain("ssi-calculation-ledger");
    expect(sourceIds).toContain("mn7r-monitor-readonly");
    expect(sourceIds).toContain("mn7r-broker-user-inputs");
    expect(sourceIds).toContain("mn7r-index-correlation-signals");
    expect(sourceIds).toContain("ecosystem-site-content");
    expect(sourceIds).toContain("ecosystem-manuals-books");
    expect(sourceIds).toContain("ecosystem-code-snapshots");
    expect(sourceIds).toContain("ecosystem-development-plans");
    expect(sourceIds).toContain("ecosystem-action-events");
    expect(sourceIds).toContain("ecosystem-content-archives");
    expect(
      CORTEX_INITIAL_SOURCES.find((source) => source.id === "mn7r-monitor-readonly")
        ?.allowedActionModes,
    ).toContain("approval-gated-tool");
    expect(
      CORTEX_INITIAL_SOURCES.find((source) => source.id === "ecosystem-action-events")
        ?.cadence,
    ).toBe("on-event");
    expect(
      CORTEX_INITIAL_SOURCES.find((source) => source.id === "ecosystem-code-snapshots")
        ?.visibility,
    ).toBe("protected");
    expect(
      CORTEX_INITIAL_SOURCES.find((source) => source.id === "ssi-respondent-inputs")
        ?.visibility,
    ).toBe("protected");
  });

  it("defines the intended learning-to-autonomy lifecycle", () => {
    expect(CORTEX_LIFECYCLE.map((item) => item.stage)).toEqual([
      "observe-learn",
      "assist-propose",
      "approval-gated-act",
      "bounded-autonomy",
    ]);
  });

  it("does not allow protected or secret material into model context by default", () => {
    expect(canUseVisibilityInExternalModel("public")).toBe(true);
    expect(canUseVisibilityInExternalModel("internal")).toBe(true);
    expect(canUseVisibilityInExternalModel("protected")).toBe(false);
    expect(canUseVisibilityInExternalModel("secret")).toBe(false);
    expect(canUseVisibilityInExternalModel("protected", { allowProtected: true })).toBe(true);
  });

  it("builds a bounded context pack with evidence and exclusions", () => {
    const pack = buildCortexContextPack({
      createdAt: "2026-07-06T00:00:00.000Z",
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-public-index",
          sourceId: "published-index-values",
          summary: "Corn published at 200 USD/t.",
          title: "Published corn value",
          urlOrPath: "https://spike.1d3x.com/",
          visibility: "public",
        },
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-protected-monitor",
          sourceId: "mn7r-monitor-readonly",
          summary: "Protected monitor signal.",
          title: "Monitor snapshot",
          urlOrPath: "mn7r://readonly/snapshot",
          visibility: "protected",
        },
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-secret-note",
          sourceId: "mn7r-monitor-readonly",
          summary: "Secret note.",
          title: "Secret",
          urlOrPath: "mn7r://secret",
          visibility: "secret",
        },
      ],
      knownGaps: ["MN7R basis mapping is not finalized."],
      purpose: "monitor-index-comparison",
      query: "compare corn monitor signal with published index",
    });

    expect(pack.product).toBe("1D3X Cortex");
    expect(pack.evidence.map((item) => item.id)).toEqual(["ev-public-index"]);
    expect(pack.excluded.map((item) => item.evidenceId)).toEqual([
      "ev-protected-monitor",
      "ev-secret-note",
    ]);
    expect(pack.sourceIds).toEqual(["published-index-values"]);
    expect(pack.knownGaps).toContain("MN7R basis mapping is not finalized.");
  });

  it("can include protected evidence only when the workflow opts in", () => {
    const pack = buildCortexContextPack({
      allowProtected: true,
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-protected-monitor",
          sourceId: "mn7r-monitor-readonly",
          summary: "Protected monitor signal with redacted counterparty fields.",
          title: "Monitor snapshot",
          urlOrPath: "mn7r://readonly/snapshot",
          visibility: "protected",
        },
      ],
      purpose: "execution-context",
      query: "build execution context",
    });

    expect(pack.evidence).toHaveLength(1);
    expect(pack.excluded).toEqual([]);
  });

  it("merges deterministic report context with local memory context", () => {
    const primary = buildCortexContextPack({
      createdAt: "2026-07-06T00:00:00.000Z",
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-index",
          sourceId: "published-index-values",
          summary: "Corn published at 201 USD/t.",
          title: "Published corn",
          urlOrPath: "https://spike.1d3x.com/",
          visibility: "public",
        },
      ],
      knownGaps: ["No monitored MediaHub feed evidence was included."],
      purpose: "market-report",
      query: "spike:weekly",
    });
    const secondary = buildCortexContextPack({
      evidence: [
        {
          extractedAt: "2026-07-06T00:00:00.000Z",
          id: "ev-memory",
          sourceId: "ecosystem-site-content",
          summary: "A prior 1D3X note links corn export demand to freight spreads.",
          title: "1D3X memory",
          urlOrPath: "index:docs/note.md",
          visibility: "internal",
        },
      ],
      purpose: "market-report",
      query: "corn freight context",
    });

    const merged = mergeCortexContextPacks({ primary, secondary });

    expect(merged.evidence.map((item) => item.id)).toEqual(["ev-index", "ev-memory"]);
    expect(merged.sourceIds).toEqual(["ecosystem-site-content", "published-index-values"]);
    expect(merged.knownGaps).toEqual(["No monitored MediaHub feed evidence was included."]);
    expect(merged.query).toBe("spike:weekly + corn freight context");
  });

  it("builds report context from index values, Telegram materials and monitored sources", () => {
    const pack = buildCortexMarketReportContextPack({
      latestData: [
        {
          basis: "CPT Port",
          changeAbs: 1.2,
          commodityCode: "CORN",
          commodityId: "corn",
          commodityNameEn: "Corn",
          commodityNameUk: "Кукурудза",
          date: "2026-07-06",
          valueUsdPerMt: 201.5,
        },
      ],
      calculationEvidence: [
        {
          basis: "CPT Port",
          calculatedAt: new Date("2026-07-06T12:00:00.000Z"),
          commodityCode: "CORN",
          id: "calc-1",
          summary: "Calculation included enough respondent inputs and locked the published value.",
          tenantId: "spike-ua",
          valueUsdPerMt: 201.5,
        },
      ],
      manualMaterials: [
        {
          extractedText: "Fresh export demand note from Telegram.",
          id: "material-1",
          kind: "weekly_material",
          originalFilename: null,
          originalUrl: "https://example.com/grain-note",
          receivedAt: new Date("2026-07-06T10:00:00.000Z"),
          sourceDomain: "example.com",
          sourceType: "telegram_link",
          summary: "Telegram source says export demand improved for corn.",
          tenantId: "spike-ua",
        },
        {
          extractedText: "Should not enter weekly pack.",
          id: "material-daily",
          kind: "daily_material",
          originalFilename: null,
          originalUrl: null,
          receivedAt: new Date("2026-07-06T10:00:00.000Z"),
          sourceDomain: null,
          sourceType: "telegram_text",
          summary: "Daily-only note.",
          tenantId: "spike-ua",
        },
      ],
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      respondentInputs: [
        {
          basis: "CPT Port",
          commodityCode: "CORN",
          id: "input-1",
          respondentType: "manual",
          submittedAt: new Date("2026-07-06T11:00:00.000Z"),
          summary: "Raw respondent input before aggregation.",
          tenantId: "spike-ua",
          valueUsdPerMt: 200,
        },
      ],
      reportKind: "weekly",
      snapshots: [
        {
          feed: [
            {
              id: "feed-1",
              source: "World Grain",
              sourceType: "rss",
              summary: "Global grain logistics update.",
              tags: ["grains", "logistics"],
              time: "2026-07-06",
              title: "Freight shapes grain flow",
            },
          ],
          window: "week",
        },
      ],
      tenant: "spike",
    });

    expect(pack.sourceIds).toEqual([
      "mediahub-global-sources",
      "mediahub-telegram-materials",
      "published-index-values",
    ]);
    expect(pack.evidence.map((item) => item.id)).toContain("cortex:material:material-1");
    expect(pack.evidence.map((item) => item.id)).not.toContain("cortex:material:material-daily");
    expect(pack.excluded.map((item) => item.evidenceId)).toEqual([
      "cortex:respondent-input:input-1",
      "cortex:calculation:calc-1",
    ]);
    expect(pack.knownGaps).toEqual([]);
  });

  it("reports known gaps when report context lacks Telegram and feed evidence", () => {
    const pack = buildCortexMarketReportContextPack({
      manualMaterials: [],
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-07-06",
      reportKind: "daily",
      snapshots: [],
      tenant: "platform",
    });

    expect(pack.knownGaps).toContain(
      "No Telegram bot materials were included for this report context.",
    );
    expect(pack.knownGaps).toContain("No monitored MediaHub feed evidence was included.");
  });
});
