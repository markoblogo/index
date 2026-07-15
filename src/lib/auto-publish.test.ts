import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  buildAutoPublishPlan,
  isKyivAutoPublishHour,
  selectAutoPublishCommodityIds,
} from "@/lib/auto-publish";

describe("buildAutoPublishPlan", () => {
  it("publishes a saved respondent draft using the SSI median rule", () => {
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
          status: "draft",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
      ],
    });

    expect(plan.get("corn")).toMatchObject({
      median: 233.5,
      rawCount: 1,
      rawValue: 233.5,
      usedCount: 1,
      value: 233.5,
    });
  });

  it("uses the respondent median, not a cleaned arithmetic average", () => {
    const plan = buildAutoPublishPlan({
      basisByCommodityId: new Map([["corn", "basis-corn"]]),
      submissions: [
        {
          id: "submission-1",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 208,
          respondentId: "MN7R_MONITOR",
          source: "admin",
          status: "draft",
          updatedAt: new Date("2026-05-25T14:05:00.000Z"),
        },
        {
          id: "submission-2",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 209,
          respondentId: "partner-1",
          source: "admin",
          status: "verified",
          updatedAt: new Date("2026-05-25T14:10:00.000Z"),
        },
        {
          id: "submission-3",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 209,
          respondentId: "partner-2",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:11:00.000Z"),
        },
        {
          id: "submission-4",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 210,
          respondentId: "partner-3",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:12:00.000Z"),
        },
        {
          id: "submission-5",
          commodityId: "corn",
          deliveryBasisId: "basis-corn",
          price: 210,
          respondentId: "partner-4",
          source: "respondent",
          status: "submitted",
          updatedAt: new Date("2026-05-25T14:13:00.000Z"),
        },
      ],
    });

    expect(plan.get("corn")).toMatchObject({
      median: 209,
      rawCount: 5,
      rawValue: 209,
      usedCount: 5,
      value: 209,
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
        ...[221, 222, 223, 224].map((price, index) => ({
          id: `valid-submission-${index + 2}`,
          commodityId: "corn-fca-chop",
          deliveryBasisId: "basis-chop",
          price,
          respondentId: `partner-${index + 2}`,
          source: "respondent" as const,
          status: "submitted",
          updatedAt: new Date(`2026-07-06T14:0${7 + index}:00.000Z`),
        })),
      ],
    });

    expect(plan.get("corn-fca-chop")).toMatchObject({
      excludedSubmissions: [{ id: "bad-submission", exclusionReason: "previous_day_5pct_deviation" }],
      rawCount: 6,
      usedCount: 5,
      value: 222.6,
    });
  });

  it("publishes missing commodities on a retry without overwriting existing ones", () => {
    expect(selectAutoPublishCommodityIds({
      existingPublishedCommodityIds: new Set(["corn", "wheat-115"]),
      plannedCommodityIds: ["corn", "wheat-115", "feed-wheat"],
      replaceExisting: false,
    })).toEqual(["feed-wheat"]);
  });

  it("detects the 19:00 Europe/Kyiv publish window", () => {
    expect(isKyivAutoPublishHour(new Date("2026-05-25T16:00:00.000Z"))).toBe(true);
    expect(isKyivAutoPublishHour(new Date("2026-05-25T15:00:00.000Z"))).toBe(false);
  });
});
