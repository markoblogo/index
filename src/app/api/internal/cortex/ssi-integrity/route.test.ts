import { afterEach, describe, expect, it, vi } from "vitest";

const getCortexSsiIntegrityDailyReport = vi.fn();

vi.mock("@/lib/cortex-ssi-integrity", () => ({ getCortexSsiIntegrityDailyReport }));
vi.mock("@/lib/index-platform", () => ({ getActiveIndexConfig: () => ({ id: "spike-ua" }) }));

describe("internal Cortex SSI integrity route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("requires an internal bearer token", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    const { GET } = await import("./route");
    expect((await GET(new Request("https://example.com/api/internal/cortex/ssi-integrity?date=2026-07-15"))).status).toBe(401);
  });

  it("returns the shadow daily integrity report", async () => {
    vi.stubEnv("CORTEX_INTERNAL_API_SECRET", "cortex-secret");
    getCortexSsiIntegrityDailyReport.mockResolvedValueOnce({ date: "2026-07-15", status: "warning" });
    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/internal/cortex/ssi-integrity?date=2026-07-15", {
      headers: { authorization: "Bearer cortex-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ shadowOnly: true, report: { status: "warning" } });
    expect(getCortexSsiIntegrityDailyReport).toHaveBeenCalledWith({ date: "2026-07-15", tenantId: "spike-ua" });
  });
});
