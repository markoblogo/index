import { describe, expect, it, beforeEach } from "vitest";
import {
  buildRequestRateLimitKey,
  consumeRequestRateLimit,
  resetRequestRateLimitForTests,
} from "@/lib/request-rate-limit";

beforeEach(() => {
  resetRequestRateLimitForTests();
});

describe("request rate limit", () => {
  it("allows requests until the bucket limit and then returns retry-after", () => {
    const options = { limit: 2, windowMs: 10_000 };
    expect(consumeRequestRateLimit("key", options, 1000)).toMatchObject({ allowed: true });
    expect(consumeRequestRateLimit("key", options, 2000)).toMatchObject({ allowed: true });
    expect(consumeRequestRateLimit("key", options, 3000)).toMatchObject({
      allowed: false,
      retryAfterSeconds: 8,
    });
    expect(consumeRequestRateLimit("key", options, 11_001)).toMatchObject({ allowed: true });
  });

  it("builds stable keys without storing raw IP or subject", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.10, 198.51.100.2" },
    });
    const key = buildRequestRateLimitKey(request, "password-reset", "User@Example.com");

    expect(key).toBe(buildRequestRateLimitKey(request, "password-reset", "user@example.com"));
    expect(key).toContain("password-reset:");
    expect(key).not.toContain("203.0.113.10");
    expect(key).not.toContain("User@Example.com");
    expect(key).not.toContain("user@example.com");
  });
});
