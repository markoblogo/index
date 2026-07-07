import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-api-data", () => ({
  getPublicHistoryData: vi.fn(),
  getPublicLatestData: vi.fn(),
}));
vi.mock("@/lib/fx-rates", () => ({
  getFxRates: vi.fn(),
}));

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("public API routes", () => {
  it("returns latest data with public snapshot cache headers", async () => {
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
    const response = await GET(new Request("https://example.com/api/public/latest"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=43200");
    expect(response.headers.get("etag")).toMatch(/^W\//);
    expect(body.data).toHaveLength(1);
  });

  it("returns 304 for matching public data ETag", async () => {
    const dataModule = await import("@/lib/public-api-data");
    vi.mocked(dataModule.getPublicLatestData).mockResolvedValue([{ commodityId: "corn" }] as never);

    const { GET } = await import("./latest/route");
    const first = await GET(new Request("https://example.com/api/public/latest"));
    const etag = first.headers.get("etag");
    const second = await GET(new Request("https://example.com/api/public/latest", {
      headers: { "if-none-match": etag ?? "" },
    }));

    expect(second.status).toBe(304);
    expect(second.headers.get("etag")).toBe(etag);
  });

  it("returns a no-store 503 when latest data loading fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dataModule = await import("@/lib/public-api-data");
    vi.mocked(dataModule.getPublicLatestData).mockRejectedValue(new Error("database down"));

    const { GET } = await import("./latest/route");
    const response = await GET(new Request("https://example.com/api/public/latest"));
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
    const response = await GET(new Request("https://example.com/api/public/history"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ error: "public_data_unavailable", ok: false });
  });

  it("returns fx rates with long public cache and ETag", async () => {
    const fxModule = await import("@/lib/fx-rates");
    vi.mocked(fxModule.getFxRates).mockResolvedValue({
      eurUah: 45,
      fetchedAt: "2026-07-03T00:00:00.000Z",
      rateDate: "2026-07-03",
      source: "NBU",
      usdUah: 41,
    });

    const { GET } = await import("./fx-rates/route");
    const response = await GET(new Request("https://example.com/api/public/fx-rates?date=2026-07-03"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=21600");
    expect(response.headers.get("etag")).toMatch(/^W\//);
    expect(body.data.usdUah).toBe(41);
    expect(fxModule.getFxRates).toHaveBeenCalledWith("2026-07-03");
  });

  it("returns a no-store 503 when fx loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fxModule = await import("@/lib/fx-rates");
    vi.mocked(fxModule.getFxRates).mockRejectedValue(new Error("fx down"));

    const { GET } = await import("./fx-rates/route");
    const response = await GET(new Request("https://example.com/api/public/fx-rates"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({ error: "public_data_unavailable", ok: false });
  });
});
