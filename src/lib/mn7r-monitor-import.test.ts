import { afterEach, describe, expect, it } from "vitest";
import {
  formatDateKyiv,
  importMn7rMonitorRespondentPrices,
  type Mn7rPayload,
} from "@/lib/mn7r-monitor-import";
import type { RespondentPriceInput } from "@/lib/respondent-prices";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("importMn7rMonitorRespondentPrices", () => {
  it("updates the same MN7R Monitor respondent price instead of creating a duplicate", async () => {
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";
    process.env.MN7R_INDEX_RESPONDENT_CODE = "MN7R_MONITOR";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-05-25",
      generatedAt: "2026-05-25T14:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v1",
      positions: [
        {
          indexCode: "CORN_CPT_CHORNOMORSK",
          currency: "USD",
          avgBid: 231,
          avgOffer: 236,
          monitorPrice: 233.5,
          bidCount: 2,
          offerCount: 1,
          sampleCount: 3,
          quality: "ok",
        },
      ],
    };
    const saved = new Map<string, RespondentPriceInput>();
    const upsert = async (input: RespondentPriceInput) => {
      saved.set(`${input.date}:${input.respondentCode}:${input.indexCode}`, input);
    };
    const fetchImpl = async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    await importMn7rMonitorRespondentPrices("2026-05-25", {
      fetchImpl,
      upsertRespondentPriceImpl: upsert,
    });
    payload.positions[0].monitorPrice = 234.25;
    await importMn7rMonitorRespondentPrices("2026-05-25", {
      fetchImpl,
      upsertRespondentPriceImpl: upsert,
    });

    expect(saved).toHaveLength(1);
    expect(saved.get("2026-05-25:MN7R_MONITOR:CORN_CPT_CHORNOMORSK")?.price).toBe(
      234.25,
    );
  });

  it("skips null and no_data monitor prices", async () => {
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-05-25",
      generatedAt: "2026-05-25T14:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v1",
      positions: [
        {
          indexCode: "CORN_CPT_CHORNOMORSK",
          currency: "USD",
          avgBid: null,
          avgOffer: null,
          monitorPrice: null,
          bidCount: 0,
          offerCount: 0,
          sampleCount: 0,
          quality: "thin",
        },
        {
          indexCode: "WHT_115_CPT_CHORNOMORSK",
          currency: "USD",
          avgBid: null,
          avgOffer: null,
          monitorPrice: 222,
          bidCount: 0,
          offerCount: 0,
          sampleCount: 0,
          quality: "no_data",
        },
      ],
    };
    const calls: RespondentPriceInput[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-05-25", {
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      upsertRespondentPriceImpl: async (input) => {
        calls.push(input);
      },
    });

    expect(result).toEqual({ date: "2026-05-25", imported: 0, skipped: 2 });
    expect(calls).toEqual([]);
  });

  it("converts non-USD monitor prices to USD before saving", async () => {
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-05-26",
      generatedAt: "2026-05-26T13:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v1",
      positions: [
        {
          indexCode: "SUNPR",
          currency: "UAH",
          avgBid: null,
          avgOffer: 35000,
          monitorPrice: 35000,
          bidCount: 0,
          offerCount: 1,
          sampleCount: 1,
          quality: "ok",
        },
        {
          indexCode: "SOYPR",
          currency: "EUR",
          avgBid: null,
          avgOffer: 1105,
          monitorPrice: 1105,
          bidCount: 0,
          offerCount: 1,
          sampleCount: 1,
          quality: "thin",
        },
      ],
    };
    const calls: RespondentPriceInput[] = [];

    await importMn7rMonitorRespondentPrices("2026-05-26", {
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      getFxRatesImpl: async () => ({
        eurUah: 45,
        fetchedAt: "2026-05-26T13:00:00.000Z",
        rateDate: "2026-05-26",
        source: "NBU",
        usdUah: 42,
      }),
      upsertRespondentPriceImpl: async (input) => {
        calls.push(input);
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({
      currency: "USD",
      indexCode: "SUNPR",
      price: 833.33,
    });
    expect(calls[0].meta).toMatchObject({
      originalCurrency: "UAH",
      originalMonitorPrice: 35000,
    });
    expect(calls[1]).toMatchObject({
      currency: "USD",
      indexCode: "SOYPR",
      price: 1183.93,
    });
  });
});

describe("formatDateKyiv", () => {
  it("formats the date in Europe/Kyiv", () => {
    expect(formatDateKyiv(new Date("2026-05-25T21:30:00.000Z"))).toBe(
      "2026-05-26",
    );
  });
});
