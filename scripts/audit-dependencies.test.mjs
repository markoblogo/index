import { describe, expect, it } from "vitest";

import { findUnreviewed, reachesAllowedRoot } from "./audit-dependencies.mjs";

const vulnerabilities = {
  prisma: { severity: "high", effects: [] },
  transitive: { severity: "high", effects: ["prisma"] },
};

describe("dependency audit policy", () => {
  it("accepts a transitive advisory only when it reaches a reviewed root", () => {
    expect(reachesAllowedRoot(vulnerabilities, new Set(["prisma"]), "transitive")).toBe(true);
    expect(reachesAllowedRoot(vulnerabilities, new Set(), "transitive")).toBe(false);
  });

  it("rejects critical advisories and expired reviews", () => {
    const policy = { review_by: "2026-09-01", allowed_roots: { prisma: "reviewed" } };
    const result = findUnreviewed(
      { prisma: { severity: "critical", effects: [] } },
      policy,
      "2026-09-14",
    );
    expect(result).toEqual([
      "prisma (critical)",
      "dependency risk review expired on 2026-09-01",
    ]);
  });
});
