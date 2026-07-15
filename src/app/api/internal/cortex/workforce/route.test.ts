import { afterEach, describe, expect, it, vi } from "vitest";

const persistCortexMarketWorkforcePacket = vi.fn();

vi.mock("@/lib/cortex-market-workforce-ledger", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cortex-market-workforce-ledger")>("@/lib/cortex-market-workforce-ledger");
  return { ...actual, persistCortexMarketWorkforcePacket };
});

describe("internal Cortex workforce route", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects an outcome that bypasses human approval", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    const { POST } = await import("./route");
    const packet = buildPacket();
    packet.outcome = "published";

    const response = await POST(buildRequest({ packet, tenantId: "mn7r" }, "cortex-secret"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.validationErrors).toContain("executed or published packets require approved humanApproval");
    expect(persistCortexMarketWorkforcePacket).not.toHaveBeenCalled();
  });

  it("persists a validated pending proposal with protected visibility", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    persistCortexMarketWorkforcePacket.mockResolvedValueOnce({ id: "packet-1", product: "1D3X Cortex" });
    const { POST } = await import("./route");

    const response = await POST(buildRequest({ packet: buildPacket(), tenantId: "mn7r" }, "cortex-secret"));

    expect(response.status).toBe(201);
    expect(persistCortexMarketWorkforcePacket).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "mn7r",
      visibility: "protected",
    }));
  });
});

function buildRequest(body: unknown, token: string) {
  return new Request("https://example.com/api/internal/cortex/workforce", {
    body: JSON.stringify(body),
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    method: "POST",
  });
}

function buildPacket() {
  return {
    assumed: [],
    blockedBy: [],
    candidates: [],
    correlationId: "corr-1",
    derived: [],
    diversityMode: "off",
    humanApproval: { required: true, status: "pending" },
    observed: [],
    outcome: "pending",
    packetType: "market-workforce",
    recommended: ["Review evidence before any downstream action."],
    roles: ["risk-compliance-officer"],
    taskId: "task-1",
    trigger: "monitor-index-comparison",
  };
}
