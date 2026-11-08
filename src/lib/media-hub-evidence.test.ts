import { expect, it } from "vitest";
import { validateMediaHubReportClaims } from "./media-hub-evidence";

it("does not split Ukrainian abbreviated units into unrelated claim fragments", () => {
  const text = "За жовтень перевезено 1595.1 тис. т зернових вантажів, на 11.8% більше за вересень.";
  const result = validateMediaHubReportClaims({ reportText: text, evidence: [] });
  expect(result.unsupportedClaims.map(item => item.claim)).toEqual([text]);
  expect(result.status).toBe("needs_review");
});
