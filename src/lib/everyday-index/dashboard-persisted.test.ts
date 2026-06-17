import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  consumerPublishedValuesFindFirstMock,
  consumerPublishedValuesFindManyMock,
  getPersistedBurgerDatasetMock,
} = vi.hoisted(() => ({
  consumerPublishedValuesFindFirstMock: vi.fn(),
  consumerPublishedValuesFindManyMock: vi.fn(),
  getPersistedBurgerDatasetMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    consumerPublishedValue: {
      findFirst: consumerPublishedValuesFindFirstMock,
      findMany: consumerPublishedValuesFindManyMock,
    },
  },
  hasDatabaseUrl: () => true,
}));

vi.mock("@/lib/everyday-index/burger-publish", () => ({
  getPersistedBurgerDataset: getPersistedBurgerDatasetMock,
}));

describe("persisted everyday dashboard", () => {
  beforeEach(() => {
    consumerPublishedValuesFindFirstMock.mockReset();
    consumerPublishedValuesFindManyMock.mockReset();
    getPersistedBurgerDatasetMock.mockReset();
  });

  it("reads persisted burger values and does not mislabel source-defined US comparison as New York", async () => {
    getPersistedBurgerDatasetMock.mockResolvedValue({
      definitionId: "burger-id",
      latestPublishedDate: new Date("2026-01-01"),
    });
    consumerPublishedValuesFindFirstMock.mockResolvedValue({
      country: { currency: "EUR", iso3: "DEU" },
      localPrice: { toNumber: () => 5.5 },
      metadataJson: {
        sourceDefinedUsdRaw: 0.12,
      },
      observation: { metadataJson: null },
      publishedDate: new Date("2026-01-01"),
      usdPrice: { toNumber: () => 6.11 },
    });
    consumerPublishedValuesFindManyMock.mockResolvedValue([
      {
        country: { iso2: "DE", iso3: "DEU", name: "Germany" },
        localPrice: { toNumber: () => 5.2 },
        publishedDate: new Date("2025-12-01"),
        sourceStatus: "verified",
        usdPrice: { toNumber: () => 5.8 },
      },
      {
        country: { iso2: "DE", iso3: "DEU", name: "Germany" },
        localPrice: { toNumber: () => 5.5 },
        publishedDate: new Date("2026-01-01"),
        sourceStatus: "verified",
        usdPrice: { toNumber: () => 6.11 },
      },
      {
        country: { iso2: "FR", iso3: "FRA", name: "France" },
        publishedDate: new Date("2026-01-01"),
        sourceStatus: "verified",
        usdPrice: { toNumber: () => 7.1 },
      },
      {
        country: { iso2: "JP", iso3: "JPN", name: "Japan" },
        publishedDate: new Date("2026-01-01"),
        sourceStatus: "verified",
        usdPrice: { toNumber: () => 4.1 },
      },
    ]);

    const { getEverydayIndexDashboard } = await import("@/lib/everyday-index/dashboard");
    const dashboard = await getEverydayIndexDashboard({
      country: "DE",
      geoCountry: "DE",
    });
    const burgerCard = dashboard.cards.find((card) => card.key === "burger");

    expect(burgerCard).toEqual(
      expect.objectContaining({
        indexVsUsLabel: "Pending New York reference",
        localPriceLabel: "€5.50",
        sourceComparisonLabel: "12% vs source-defined US dataset row",
        status: "verified",
      }),
    );
    expect(burgerCard?.note).toContain("not represent the requested New York, NY retail reference");
  });

  it("returns explicit unavailable burger state when no persisted values exist", async () => {
    getPersistedBurgerDatasetMock.mockResolvedValue(null);
    consumerPublishedValuesFindFirstMock.mockResolvedValue(null);
    consumerPublishedValuesFindManyMock.mockResolvedValue([]);

    const { getEverydayIndexDashboard } = await import("@/lib/everyday-index/dashboard");
    const dashboard = await getEverydayIndexDashboard({
      country: "DE",
      geoCountry: "DE",
    });
    const burgerCard = dashboard.cards.find((card) => card.key === "burger");

    expect(burgerCard).toEqual(
      expect.objectContaining({
        key: "burger",
        localPriceLabel: "Unavailable",
        sourceComparisonLabel: "Unavailable",
      }),
    );
    expect(dashboard.chartSeries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "latte", status: "unsupported" }),
        expect.objectContaining({ key: "iphone_price", status: "unsupported" }),
        expect.objectContaining({ key: "wti_oil", status: "unsupported" }),
      ]),
    );
  });
});
