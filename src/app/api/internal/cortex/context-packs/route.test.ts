import { afterEach, describe, expect, it, vi } from "vitest";

const listCortexContextPackRecords = vi.fn();

vi.mock("@/lib/commodity-intelligence-ledger", () => ({
  listCortexContextPackRecords,
  normalizeCortexLedgerListLimit: (value: number | null | undefined) => {
    if (!Number.isFinite(value ?? NaN)) return 25;
    return Math.max(1, Math.min(100, Math.trunc(value as number)));
  },
}));

describe("internal Cortex context-pack route", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("fails closed when no internal secret is configured", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("https://example.com/api/internal/cortex/context-packs", {
      headers: { authorization: "Bearer any-token" },
    }));

    expect(response.status).toBe(401);
    expect(listCortexContextPackRecords).not.toHaveBeenCalled();
  });

  it("lists ledger records without full pack JSON by default", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    listCortexContextPackRecords.mockResolvedValueOnce([buildRecord()]);
    const { GET } = await import("./route");

    const response = await GET(new Request(
      "https://example.com/api/internal/cortex/context-packs?tenantId=spike-ua&limit=5",
      { headers: { authorization: "Bearer cortex-secret" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listCortexContextPackRecords).toHaveBeenCalledWith({
      entityType: null,
      limit: 5,
      purpose: null,
      reportKind: null,
      tenantId: "spike-ua",
    });
    expect(body.records[0].pack).toBeUndefined();
    expect(body.records[0]).toMatchObject({
      id: "cortex-pack:spike-ua:mediahub-report:report-1",
      product: "1D3X Cortex",
    });
  });

  it("can include full pack JSON for authorized internal reads", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    listCortexContextPackRecords.mockResolvedValueOnce([buildRecord()]);
    const { GET } = await import("./route");

    const response = await GET(new Request(
      "https://example.com/api/internal/cortex/context-packs?includePack=1",
      { headers: { authorization: "Bearer cortex-secret" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.includePack).toBe(true);
    expect(body.records[0].pack).toMatchObject({
      product: "1D3X Cortex",
      query: "spike:weekly:2026-06-30:2026-07-06",
    });
  });
});

function buildRecord() {
  return {
    createdAt: "2026-07-06T23:59:59.000Z",
    id: "cortex-pack:spike-ua:mediahub-report:report-1",
    metrics: {
      evidenceCount: 1,
      excludedCount: 0,
      knownGapCount: 0,
    },
    pack: {
      createdAt: "2026-07-06T23:59:59.000Z",
      evidence: [],
      excluded: [],
      knownGaps: [],
      product: "1D3X Cortex",
      purpose: "market-report",
      query: "spike:weekly:2026-06-30:2026-07-06",
      sourceIds: ["mediahub-telegram-materials"],
    },
    packHash: "hash",
    product: "1D3X Cortex",
    purpose: "market-report",
    query: "spike:weekly:2026-06-30:2026-07-06",
    sourceIds: ["mediahub-telegram-materials"],
    target: {
      entityId: "report-1",
      entityType: "mediahub-report",
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-06-30",
      reportKind: "weekly",
      tenantId: "spike-ua",
    },
    visibility: "internal",
  };
}
