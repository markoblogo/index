import { describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitForTests } from "@/lib/rate-limit";

describe("rate limit", () => {
  it("blocks requests after the configured limit", () => {
    resetRateLimitForTests();

    expect(checkRateLimit({ key: "login:1", limit: 2, windowMs: 60_000 }).allowed).toBe(
      true,
    );
    expect(checkRateLimit({ key: "login:1", limit: 2, windowMs: 60_000 }).allowed).toBe(
      true,
    );
    expect(checkRateLimit({ key: "login:1", limit: 2, windowMs: 60_000 }).allowed).toBe(
      false,
    );
  });
});

