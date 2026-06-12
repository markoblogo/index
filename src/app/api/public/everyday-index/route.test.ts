import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public/everyday-index/route";

const {
  headersMock,
  getEverydayIndexDashboardMock,
  getEverydayArchitectureSummaryMock,
} = vi.hoisted(() => ({
  headersMock: vi.fn(),
  getEverydayIndexDashboardMock: vi.fn(),
  getEverydayArchitectureSummaryMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/everyday-index/dashboard", () => ({
  getEverydayIndexDashboard: getEverydayIndexDashboardMock,
  getEverydayArchitectureSummary: getEverydayArchitectureSummaryMock,
}));

describe("GET /api/public/everyday-index", () => {
  beforeEach(() => {
    headersMock.mockReset();
    getEverydayIndexDashboardMock.mockReset();
    getEverydayArchitectureSummaryMock.mockReset();
  });

  it("returns the current scaffold payload shape without implying unsupported series are live", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        "x-vercel-ip-country": "DE",
      }),
    );
    getEverydayIndexDashboardMock.mockResolvedValue({
      selectedCountry: { iso2: "DE", name: "Germany" },
      countries: [],
      detectedCountryIso2: "DE",
      chartMode: "rebased_to_100",
      cards: [
        { key: "burger", status: "verified" },
        { key: "latte", status: "unsupported" },
        { key: "iphone_price", status: "unsupported" },
      ],
      chartSeries: [
        { key: "burger", status: "verified", values: [{ date: "2026-01-01", value: 100 }] },
        { key: "latte", status: "unsupported", values: [] },
        { key: "iphone_price", status: "unsupported", values: [] },
        { key: "iphone_workdays", status: "unsupported", values: [] },
        { key: "wti_oil", status: "unsupported", values: [] },
        { key: "brent_oil", status: "unsupported", values: [] },
        { key: "gold", status: "unsupported", values: [] },
      ],
      rankings: [],
      methodology: [],
      updatePolicy:
        "Checked daily. Published weekly or when verified source data changes.",
      generatedAt: "2026-06-12T00:00:00.000Z",
    });
    getEverydayArchitectureSummaryMock.mockReturnValue({
      countries: 7,
      sourceRegistry: [
        { productKey: "burger", enabled: true },
        { productKey: "latte", enabled: false },
        { productKey: "iphone_price", enabled: false },
      ],
    });

    const response = await GET(
      new Request("https://day.1d3x.com/api/public/everyday-index?country=DE"),
    );
    const body = await response.json();

    expect(getEverydayIndexDashboardMock).toHaveBeenCalledWith({
      country: "DE",
      geoCountry: "DE",
    });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
    expect(body.data.chartMode).toBe("rebased_to_100");
    expect(body.data.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "latte", status: "unsupported" }),
        expect.objectContaining({ key: "iphone_price", status: "unsupported" }),
      ]),
    );
    expect(body.data.chartSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "iphone_workdays", status: "unsupported" }),
        expect.objectContaining({ key: "wti_oil", status: "unsupported" }),
        expect.objectContaining({ key: "brent_oil", status: "unsupported" }),
        expect.objectContaining({ key: "gold", status: "unsupported" }),
      ]),
    );
    expect(body.architecture.sourceRegistry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productKey: "latte", enabled: false }),
        expect.objectContaining({ productKey: "iphone_price", enabled: false }),
      ]),
    );
  });
});
