import { describe, expect, it } from "vitest";
import { isCronRequestAuthorized } from "@/lib/cron-auth";

describe("isCronRequestAuthorized", () => {
  it("fails closed when no secret is configured", () => {
    const request = new Request("https://example.test/api/cron/task", {
      headers: { authorization: "Bearer anything" },
    });

    expect(isCronRequestAuthorized(request, [undefined, "", null])).toBe(false);
  });

  it("accepts a matching bearer token", () => {
    const request = new Request("https://example.test/api/cron/task", {
      headers: { authorization: "Bearer cron-secret" },
    });

    expect(isCronRequestAuthorized(request, ["cron-secret"])).toBe(true);
  });

  it("rejects missing or mismatched bearer tokens", () => {
    const missing = new Request("https://example.test/api/cron/task");
    const mismatched = new Request("https://example.test/api/cron/task", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(isCronRequestAuthorized(missing, ["cron-secret"])).toBe(false);
    expect(isCronRequestAuthorized(mismatched, ["cron-secret"])).toBe(false);
  });
});
