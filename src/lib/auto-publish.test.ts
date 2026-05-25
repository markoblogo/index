import { describe, expect, it } from "vitest";
import {
  buildAutoPublishPlan,
  isKyivAutoPublishHour,
} from "@/lib/auto-publish";

describe("buildAutoPublishPlan", () => {
  it("builds one publishable value from MN7R only", () => {
    const plan = buildAutoPublishPlan({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          id: "submission-1",
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

    expect(plan.get("corn")).toMatchObject({
      rawCount: 1,
      usedCount: 1,
      value: 233.5,
    });
  });

  it("averages all current respondent values for a commodity", () => {
    const plan = buildAutoPublishPlan({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          id: "submission-1",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 233.5,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
        {
          id: "submission-2",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 236.5,
          respondentId: "partner-1",
          source: "admin",
          status: "verified",
          updatedAt: new Date("2026-05-25T14:10:00.000Z"),
        },
      ],
    });

    expect(plan.get("corn")).toMatchObject({
      rawCount: 2,
      usedCount: 2,
      value: 235,
    });
  });

  it("detects the 19:00 Europe/Kyiv publish window", () => {
    expect(isKyivAutoPublishHour(new Date("2026-05-25T16:00:00.000Z"))).toBe(true);
    expect(isKyivAutoPublishHour(new Date("2026-05-25T15:00:00.000Z"))).toBe(false);
  });
});
