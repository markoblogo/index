import { afterEach, describe, expect, it } from "vitest";
import {
  buildMn7rRawRecordDiagnostics,
  formatDateKyiv,
  importMn7rMonitorRespondentPrices,
  isKyivMn7rImportHour,
  type Mn7rPayload,
} from "@/lib/mn7r-monitor-import";
import type { RespondentPriceInput } from "@/lib/respondent-prices";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("importMn7rMonitorRespondentPrices", () => {
  it("updates the same MN7R Monitor respondent price instead of creating a duplicate", async () => {
    process.env.INDEX_TENANT = "spike-ua";
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
    payload.positions![0].monitorPrice = 234.25;
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
    process.env.INDEX_TENANT = "spike-ua";
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
    const cleared: string[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-05-25", {
      clearRespondentPriceImpl: async (input) => {
        cleared.push(`${input.date}:${input.indexCode}:${input.reason}`);
      },
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
    expect(cleared).toEqual([
      "2026-05-25:CORN_CPT_CHORNOMORSK:mn7r_monitor_price_null",
      "2026-05-25:WHT_115_CPT_CHORNOMORSK:mn7r_no_data",
    ]);
  });

  it("converts non-USD monitor prices to USD before saving", async () => {
    process.env.INDEX_TENANT = "spike-ua";
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
          indexCode: "CRNEX",
          currency: "UAH INCL. VAT",
          avgBid: null,
          avgOffer: 35000,
          monitorPrice: 35000,
          bidCount: 0,
          offerCount: 1,
          sampleCount: 1,
          quality: "ok",
        },
        {
          indexCode: "WHTEX",
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
      indexCode: "CRNEX",
      price: 833.33,
    });
    expect(calls[0].meta).toMatchObject({
      originalCurrency: "UAH",
      originalMonitorPrice: 35000,
    });
    expect(calls[1]).toMatchObject({
      currency: "USD",
      indexCode: "WHTEX",
      price: 1183.93,
    });
  });

  it("skips unsupported MN7R positions without failing the import", async () => {
    process.env.INDEX_TENANT = "spike-ua";
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
          indexCode: "RAPPR",
          currency: "EUR",
          avgBid: null,
          avgOffer: 536,
          monitorPrice: 536,
          bidCount: 0,
          offerCount: 1,
          sampleCount: 1,
          quality: "ok",
        },
      ],
    };
    const calls: RespondentPriceInput[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-05-26", {
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      upsertRespondentPriceImpl: async (input) => {
        calls.push(input);
      },
    });

    expect(result).toEqual({ date: "2026-05-26", imported: 0, skipped: 1 });
    expect(calls).toEqual([]);
  });

  it("imports Corn FCA Chop as a separate monitor position", async () => {
    process.env.INDEX_TENANT = "spike-ua";
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-06-03",
      generatedAt: "2026-06-03T13:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v1",
      positions: [
        {
          indexCode: "CORN_FCA_CHOP",
          currency: "USD",
          avgBid: 214,
          avgOffer: 218,
          monitorPrice: 216,
          bidCount: 1,
          offerCount: 1,
          sampleCount: 2,
          quality: "ok",
        },
      ],
    };
    const calls: RespondentPriceInput[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-06-03", {
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      upsertRespondentPriceImpl: async (input) => {
        calls.push(input);
      },
    });

    expect(result).toEqual({ date: "2026-06-03", imported: 1, skipped: 0 });
    expect(calls[0]).toMatchObject({
      currency: "USD",
      indexCode: "CORN_FCA_CHOP",
      price: 216,
      respondentCode: "MN7R_MONITOR",
    });
  });

  it("aggregates raw Monitor records by commodity, basis and 10-day overlap within the 30-day window", async () => {
    process.env.INDEX_TENANT = "spike-ua";
    process.env.MN7R_API_URL = "http://monitor.test";
    process.env.MN7R_INDEX_EXPORT_TOKEN = "token";

    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-06-11",
      generatedAt: "2026-06-11T14:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v2",
      records: [
        {
          commodity: "Corn",
          basis: "CPT Odesa export",
          deliveryStart: "2026-06-15",
          deliveryEnd: "2026-07-10",
          monitorPrice: 220,
          currency: "USD",
          quality: "ok",
        },
        {
          commodity: "Maize",
          basis: "CPT Odesa export",
          deliveryStart: "2026-06-20",
          deliveryEnd: "2026-07-05",
          monitorPrice: 224,
          currency: "USD",
          quality: "thin",
        },
        {
          commodity: "Corn",
          basis: "CPT Odesa export",
          deliveryStart: "2026-07-09",
          deliveryEnd: "2026-07-12",
          monitorPrice: 230,
          currency: "USD",
          quality: "ok",
        },
      ],
    };
    const calls: RespondentPriceInput[] = [];
    const cleared: string[] = [];

    const result = await importMn7rMonitorRespondentPrices("2026-06-11", {
      clearRespondentPriceImpl: async (input) => {
        cleared.push(`${input.indexCode}:${input.reason}`);
      },
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      upsertRespondentPriceImpl: async (input) => {
        calls.push(input);
      },
    });

    expect(result).toEqual({ date: "2026-06-11", imported: 1, skipped: 13 });
    expect(calls[0]).toMatchObject({
      currency: "USD",
      indexCode: "CORN",
      price: 222,
      respondentCode: "MN7R_MONITOR",
    });
    expect(cleared).toContain("WHT_115:mn7r_no_matching_records");
    expect(cleared).toContain("SUNFLOWER:mn7r_no_matching_records");
  });

  it("explains raw Monitor matching decisions and does not map wheat 12.5 as SSI wheat 11.5", () => {
    const payload: Mn7rPayload = {
      source: "MN7R_MONITOR",
      respondentCode: "MN7R_MONITOR",
      asOfDate: "2026-06-24",
      generatedAt: "2026-06-24T14:00:00.000Z",
      timezone: "Europe/Kyiv",
      methodologyVersion: "mn7r-monitor-index-v2",
      records: [
        {
          title: "WHEAT 12,5PRO CPT CHORNOMORSK, UKR 01/07-31/07 @ 218$",
          deliveryStart: "2026-07-01",
          deliveryEnd: "2026-07-31",
          monitorPrice: 218,
          currency: "USD",
          quality: "ok",
        },
        {
          title: "WHEAT 11,5PRO CPT CHORNOMORSK, UKR 01/07-31/07 @ 216$",
          deliveryStart: "2026-07-01",
          deliveryEnd: "2026-07-31",
          monitorPrice: 216,
          currency: "USD",
          quality: "ok",
        },
      ],
    };

    const diagnostics = buildMn7rRawRecordDiagnostics(payload);

    expect(diagnostics[0]).toMatchObject({
      decision: "skipped",
      matchedIndexCode: null,
      passedDeliveryWindow: true,
      reason: "no_index_match",
    });
    expect(diagnostics[1]).toMatchObject({
      decision: "matched",
      matchedIndexCode: "WHT_115",
      overlapDays: 23,
      reason: "matched",
    });
  });
});

describe("formatDateKyiv", () => {
  it("formats the date in Europe/Kyiv", () => {
    expect(formatDateKyiv(new Date("2026-05-25T21:30:00.000Z"))).toBe(
      "2026-05-26",
    );
  });

  it("detects the 17:00 Europe/Kyiv import window", () => {
    expect(isKyivMn7rImportHour(new Date("2026-06-11T14:00:00.000Z"))).toBe(true);
    expect(isKyivMn7rImportHour(new Date("2026-06-11T13:00:00.000Z"))).toBe(false);
  });
});
