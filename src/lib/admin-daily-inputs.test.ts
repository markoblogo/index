import { describe, expect, it } from "vitest";
import { orderDailyInputRespondents } from "@/lib/respondent-ordering";

describe("orderDailyInputRespondents", () => {
  it("places MN7R Monitor before partner respondents", () => {
    const ordered = orderDailyInputRespondents([
      { id: "partner-2", legalName: "Spike Brokers Partner 2" },
      { id: "partner-1", legalName: "Spike Brokers Partner 1" },
      { id: "MN7R_MONITOR", legalName: "MN7R Monitor" },
    ]);

    expect(ordered.map((respondent) => respondent.id)).toEqual([
      "MN7R_MONITOR",
      "partner-1",
      "partner-2",
    ]);
  });
});
