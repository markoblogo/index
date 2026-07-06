import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
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

  it("excludes values more than 5 percent away from the previous published value", () => {
    const plan = buildAutoPublishPlan({
      basisByCommodityId: new Map([["corn-fca-chop", "basis-chop"]]),
      previousPublishedByCommodityId: new Map([["corn-fca-chop", 222]]),
      submissions: [
        {
          id: "bad-submission",
          commodityId: "corn-fca-chop",
          deliveryBasisId: "basis-chop",
          price: 200,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-07-06T14:05:00.000Z"),
        },
      ],
    });

    expect(plan.has("corn-fca-chop")).toBe(false);
  });

  it("keeps valid values and records previous-day exclusions in the plan", () => {
    const plan = buildAutoPublishPlan({
      basisByCommodityId: new Map([["corn-fca-chop", "basis-chop"]]),
      previousPublishedByCommodityId: new Map([["corn-fca-chop", 222]]),
      submissions: [
        {
          id: "valid-submission",
          commodityId: "corn-fca-chop",
          deliveryBasisId: "basis-chop",
          price: 223,
          respondentId: "partner-1",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-07-06T14:05:00.000Z"),
        },
        {
          id: "bad-submission",
          commodityId: "corn-fca-chop",
          deliveryBasisId: "basis-chop",
          price: 200,
          respondentId: "MN7R_MONITOR",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-07-06T14:06:00.000Z"),
        },
      ],
    });

    expect(plan.get("corn-fca-chop")).toMatchObject({
      excludedSubmissions: [{ id: "bad-submission", exclusionReason: "previous_day_5pct_deviation" }],
      rawCount: 2,
      usedCount: 1,
      value: 223,
    });
  });

  it("detects the 19:00 Europe/Kyiv publish window", () => {
    expect(isKyivAutoPublishHour(new Date("2026-05-25T16:00:00.000Z"))).toBe(true);
    expect(isKyivAutoPublishHour(new Date("2026-05-25T15:00:00.000Z"))).toBe(false);
  });
});
