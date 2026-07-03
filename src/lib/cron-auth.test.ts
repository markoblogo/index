import { describe, expect, it } from "vitest";
import {
  isBearerTokenAuthorized,
  isCronRequestAuthorized,
  timingSafeEqualString,
} from "@/lib/cron-auth";

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

  it("compares secret strings without accepting partial or different-length values", () => {
    expect(timingSafeEqualString("cron-secret", "cron-secret")).toBe(true);
    expect(timingSafeEqualString("cron", "cron-secret")).toBe(false);
    expect(timingSafeEqualString("wrong-secret", "cron-secret")).toBe(false);
    expect(timingSafeEqualString(null, "cron-secret")).toBe(false);
  });

  it("authorizes bearer tokens against multiple possible secrets", () => {
    const request = new Request("https://example.test/api/admin/task", {
      headers: { authorization: "Bearer repair-secret" },
    });

    expect(isBearerTokenAuthorized(request, [undefined, "smoke-secret", "repair-secret"])).toBe(true);
    expect(isBearerTokenAuthorized(request, [undefined, "smoke-secret"])).toBe(false);
  });

  it("fails closed for admin-style bearer auth when no secret is configured", () => {
    const request = new Request("https://example.test/api/admin/task", {
      headers: { authorization: "Bearer anything" },
    });

    expect(isBearerTokenAuthorized(request, [undefined, "", null])).toBe(false);
  });
});
