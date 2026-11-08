import { expect, it, vi } from "vitest";
import { withSsiPartRepair } from "./ssi-weekly-draft-repair";

it("repairs an oversized draft once without weakening validation or exceeding the request budget", async () => {
  let time = 0;
  const generate = vi.fn(async (repair: boolean, _timeout: number) => {
    time += 80000;
    return repair ? { report: { title: "verified" } } : { error: "weekly_part_too_long" };
  });
  expect(await withSsiPartRepair(generate, () => time)).toEqual({ report: { title: "verified" } });
  expect(generate.mock.calls).toEqual([[false, 150000], [true, 150000]]);
});
it("stops after two invalid responses instead of looping", async () => {
  const generate = vi.fn(async () => ({ error: "weekly_part_incomplete" }));
  expect(await withSsiPartRepair(generate, () => 0)).toEqual({ error: "weekly_part_incomplete" });
  expect(generate).toHaveBeenCalledTimes(2);
});
it("never retries a basis/contract/provider failure or an exhausted budget", async () => {
  for (const error of ["weekly_basis_mismatch", "weekly_contract_crop_mismatch", "responses_incomplete", "provider_timeout"]) {
    const generate = vi.fn(async () => ({ error }));
    expect(await withSsiPartRepair(generate, () => 0)).toEqual({ error });
    expect(generate).toHaveBeenCalledTimes(1);
  }
  let time = 0;
  const generate = vi.fn(async () => { time = 200000; return { error: "weekly_part_too_long" }; });
  await withSsiPartRepair(generate, () => time);
  expect(generate).toHaveBeenCalledTimes(1);
});
