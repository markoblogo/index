import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $executeRawUnsafe: mocks.executeRaw,
    $queryRawUnsafe: mocks.queryRaw,
  },
  hasDatabaseUrl: () => true,
}));

describe("MediaHub monitoring ledger", () => {
  afterEach(() => {
    mocks.executeRaw.mockReset();
    mocks.queryRaw.mockReset();
  });

  it("persists accepted and rejected monitoring records", async () => {
    const { persistMediaHubMonitoringLedgerRecords } = await import("./media-hub-monitoring-ledger");

    await persistMediaHubMonitoringLedgerRecords([
      {
        cacheKey: "rss:spike",
        cropTags: ["wheat"],
        itemId: "item-1",
        publishedAt: "2026-07-06T10:00:00.000Z",
        regionTags: ["ukraine"],
        rejectionReason: null,
        relevanceScore: 8,
        runKey: "run-1",
        source: "World Grain",
        sourceType: "grain-oilseeds",
        state: "accepted_after_scoring",
        summary: "Ukraine wheat export update.",
        title: "Ukraine wheat exports rise",
        topicTags: ["markets"],
        url: "https://example.com/wheat",
      },
    ]);

    expect(mocks.executeRaw).toHaveBeenCalled();
    const insertCall = mocks.executeRaw.mock.calls.find((call) => String(call[0]).includes("INSERT INTO \"MediaHubMonitoringLedger\""));
    expect(insertCall).toBeTruthy();
    expect(insertCall?.[2]).toBe("run-1");
    expect(insertCall?.[5]).toBe("World Grain");
    expect(insertCall?.[15]).toBe("accepted_after_scoring");
    expect(insertCall?.[16]).toBeNull();
  });

  it("maps persisted rejected candidates to protected Cortex evidence input", async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      {
        cacheKey: "rss:spike",
        cropTagsJson: ["wheat"],
        id: "ledger-1",
        itemHash: "hash-1",
        publishedAt: new Date("2026-07-06T10:00:00.000Z"),
        regionTagsJson: ["ukraine"],
        rejectionReason: "unsafe_monitoring_candidate",
        relevanceScore: -4,
        runKey: "run-1",
        source: "Noise Feed",
        sourceType: "agro-general",
        state: "rejected_unsafe",
        summary: "Generic non-market noise.",
        title: "Casino slot giveaway",
        topicTagsJson: [],
        url: "https://example.com/noise",
      },
    ]);
    const { buildCortexMediaHubMonitoringLedgerEvidence } = await import("./media-hub-monitoring-ledger");

    const evidence = await buildCortexMediaHubMonitoringLedgerEvidence({
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-07-01",
    });

    expect(evidence).toEqual([
      {
        extractedAt: new Date("2026-07-06T10:00:00.000Z"),
        id: "ledger-1",
        processingState: "rejected_unsafe",
        rejectionReason: "unsafe_monitoring_candidate",
        relevanceScore: -4,
        source: "Noise Feed",
        sourceType: "agro-general",
        sourceUrl: "https://example.com/noise",
        summary: "Generic non-market noise.",
        tags: ["wheat", "ukraine"],
        title: "Casino slot giveaway",
      },
    ]);
  });
});
