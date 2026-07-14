import { afterEach, describe, expect, it } from "vitest";
import {
  importMn7rMonitorRespondentPrices,
  type Mn7rPayload,
} from "@/lib/mn7r-monitor-import";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MN7R Monitor spot delivery guard", () => {
  it("rejects and clears a direct Monitor position outside the 30-day SSI window", async () => {
    process.env.INDEX_TENANT = "spike-ua";
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-07-14",
      generatedAt: "2026-07-14T14:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v2",
      positions: [
        {
          indexCode: "CORN",
          currency: "USD",
          avgBid: 219,
          avgOffer: 221,
          bidCount: 1,
          deliveryEnd: "2026-11-30",
          deliveryStart: "2026-10-01",
          monitorPrice: 220,
          offerCount: 1,
          quality: "ok",
          sampleCount: 2,
        },
      ],
    };
    const upserts: string[] = [];
    const clears: string[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-07-14", {
      clearRespondentPriceImpl: async (input) => {
        clears.push(`${input.indexCode}:${input.reason}`);
      },
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      upsertRespondentPriceImpl: async (input) => {
        upserts.push(input.indexCode);
      },
    });

    expect(result).toEqual({ date: "2026-07-14", imported: 0, skipped: 1 });
    expect(upserts).toEqual([]);
    expect(clears).toEqual(["CORN:mn7r_no_matching_records"]);
  });
});
