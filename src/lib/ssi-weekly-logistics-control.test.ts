import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {}, hasDatabaseUrl: () => false }));

import { findMissingSsiWeeklyLogisticsTypes } from "./ssi-weekly-logistics-control";

describe("SSI weekly logistics control", () => {
  it("requires the four typed logistics inputs", () => {
    expect(findMissingSsiWeeklyLogisticsTypes([
      ["ssi", "weekly", "agro_ex_im"],
      ["ssi", "weekly", "checkpoints"],
      ["ssi", "weekly", "operational_wagons"],
    ])).toEqual(["uz_statistics"]);
  });

  it("accepts a complete typed package", () => {
    expect(findMissingSsiWeeklyLogisticsTypes([
      ["agro_ex_im"],
      ["checkpoints"],
      ["operational_wagons"],
      ["uz_statistics"],
    ])).toEqual([]);
  });
});
