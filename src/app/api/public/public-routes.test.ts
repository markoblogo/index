import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-api-data", () => ({
  getPublicHistoryData: vi.fn(),
  getPublicLatestData: vi.fn(),
}));

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("public API routes", () => {
  it("returns latest data with public cache headers", async () => {
    const dataModule = await import("@/lib/public-api-data");
    vi.mocked(dataModule.getPublicLatestData).mockResolvedValue([
      {
        basis: "CPT Odesa",
        changeAbs: 1,
        changePct: 0.5,
        commodityCode: "CORN",
        commodityId: "corn",
        commodityNameEn: "Corn",
        commodityNameUk: "Кукурудза",
        date: "2026-07-03",
        respondents: 4,
        valueUsdPerMt: 210,
      },
    ]);

    const { GET } = await import("./latest/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    expect(body.data).toHaveLength(1);
  });

  it("returns a no-store 503 when latest data loading fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dataModule = await import("@/lib/public-api-data");
    vi.mocked(dataModule.getPublicLatestData).mockRejectedValue(new Error("database down"));

    const { GET } = await import("./latest/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ error: "public_data_unavailable", ok: false });
    expect(error).toHaveBeenCalledWith("public_latest_unavailable", {
      message: "database down",
      name: "Error",
    });
  });

  it("returns a no-store 503 when history data loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dataModule = await import("@/lib/public-api-data");
    vi.mocked(dataModule.getPublicHistoryData).mockRejectedValue(new Error("database down"));

    const { GET } = await import("./history/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ error: "public_data_unavailable", ok: false });
  });
});
