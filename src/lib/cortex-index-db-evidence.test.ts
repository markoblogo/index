import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildCortexIndexDbEvidence } from "@/lib/cortex-index-db-evidence";

describe("Cortex Index DB evidence", () => {
  it("builds redacted respondent input and calculation ledger evidence", async () => {
    const client = {
      indexCalculation: {
        findMany: vi.fn().mockResolvedValue([
          {
            basket: { code: "cpt-port" },
            calculatedAt: new Date("2026-07-06T12:00:00.000Z"),
            commodity: { code: "CORN", nameEn: "Corn" },
            deliveryBasis: { code: "CPT_PORT", name: "CPT Port" },
            id: "calc-1",
            items: [
              {
                deviationPct: decimal(0),
                exclusionReason: null,
                included: true,
                respondentId: "respondent-a",
              },
              {
                deviationPct: decimal(7.2),
                exclusionReason: "outside_2pct_median_band",
                included: false,
                respondentId: "respondent-b",
              },
            ],
            medianUsdPerMt: decimal(201.25),
            publicValueUsdPerMt: decimal(201.5),
            publishedIndex: { locked: true, valueUsdPerMt: decimal(202) },
            rawCount: 2,
            status: "published",
            usedCount: 1,
            version: 3,
          },
        ]),
      },
      priceSubmission: {
        findMany: vi.fn().mockResolvedValue([
          {
            commodity: { code: "CORN", nameEn: "Corn" },
            createdAt: new Date("2026-07-06T10:00:00.000Z"),
            deliveryBasis: { code: "CPT_PORT", name: "CPT Port" },
            id: "input-1",
            priceUsdPerMt: decimal(200),
            respondent: { collectionMode: "self_service", id: "private-respondent" },
            source: "respondent",
            status: "submitted",
            submittedAt: new Date("2026-07-06T11:00:00.000Z"),
            tradeDate: new Date("2026-07-06T00:00:00.000Z"),
          },
          {
            commodity: { code: "WHEAT", nameEn: "Wheat" },
            createdAt: new Date("2026-07-06T10:00:00.000Z"),
            deliveryBasis: { code: "CPT_PORT", name: "CPT Port" },
            id: "input-2",
            priceUsdPerMt: decimal(210),
            respondent: { collectionMode: "manual_outreach", id: "MN7R_MONITOR" },
            source: "respondent",
            status: "submitted",
            submittedAt: null,
            tradeDate: new Date("2026-07-06T00:00:00.000Z"),
          },
        ]),
      },
    };

    const evidence = await buildCortexIndexDbEvidence({
      client,
      periodEndDate: "2026-07-06",
      periodStartDate: "2026-07-01",
      tenantId: "spike-ua",
    });

    expect(evidence.respondentInputs).toHaveLength(2);
    expect(evidence.respondentInputs[0]).toMatchObject({
      commodityCode: "CORN",
      id: "input-1",
      respondentType: "respondent:self_service",
      tenantId: "spike-ua",
      valueUsdPerMt: 200,
    });
    expect(evidence.respondentInputs[0].summary).toContain("respondentRef=respondent:");
    expect(evidence.respondentInputs[0].summary).not.toContain("private-respondent");
    expect(evidence.respondentInputs[1].summary).toContain("respondentRef=MN7R_MONITOR");

    expect(evidence.calculationEvidence).toEqual([
      {
        basis: "CPT_PORT",
        calculatedAt: new Date("2026-07-06T12:00:00.000Z"),
        commodityCode: "CORN",
        id: "calc-1",
        summary: "status=published; version=3; basket=cpt-port; rawCount=2; usedCount=1; excludedCount=1; median=201.25; publishedLocked=true; exclusionReasons=outside_2pct_median_band",
        tenantId: "spike-ua",
        valueUsdPerMt: 202,
      },
    ]);
    expect(client.priceSubmission.findMany).toHaveBeenCalledOnce();
    expect(client.indexCalculation.findMany).toHaveBeenCalledOnce();
  });
});

function decimal(value: number) {
  return { toNumber: () => value };
}
