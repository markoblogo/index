import { describe, expect, it } from "vitest";
import { buildLiveSubmissionValues } from "@/lib/live-submission-values";

describe("buildLiveSubmissionValues", () => {
  it("uses MN7R Monitor as the public value when it is the only submission", () => {
    const values = buildLiveSubmissionValues({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 233.5,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
      ],
    });

    expect(values.get("corn")).toMatchObject({
      respondentCount: 1,
      value: 233.5,
    });
  });

  it("averages MN7R Monitor and additional respondent submissions", () => {
    const values = buildLiveSubmissionValues({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 233.5,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
        {
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 236.5,
          respondentId: "partner-1",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:10:00.000Z"),
        },
      ],
    });

    expect(values.get("corn")).toMatchObject({
      respondentCount: 2,
      value: 235,
    });
  });

  it("prefers admin override over respondent submission for the same respondent", () => {
    const values = buildLiveSubmissionValues({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 233.5,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
        {
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 240,
          respondentId: "MN7R_MONITOR",
          source: "admin",
          status: "verified",
          updatedAt: new Date("2026-05-25T14:10:00.000Z"),
        },
      ],
    });

    expect(values.get("corn")).toMatchObject({
      respondentCount: 1,
      value: 240,
    });
  });
});
