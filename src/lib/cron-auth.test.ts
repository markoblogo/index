import { afterEach, describe, expect, it, vi } from "vitest";
import { hasConfiguredCronSecret, isCronRequestAuthorized } from "@/lib/cron-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cron auth", () => {
  it("fails closed in production when no secret is configured", () => {
    vi.stubEnv("UGA_INDEX_RUNTIME_MODE", "production");

    expect(isCronRequestAuthorized(new Request("https://example.com"), [])).toBe(false);
  });

  it("allows local/demo cron calls without a configured secret", () => {
    vi.stubEnv("UGA_INDEX_RUNTIME_MODE", "demo");

    expect(isCronRequestAuthorized(new Request("https://example.com"), [])).toBe(true);
  });

  it("requires a matching bearer token when secrets exist", () => {
    const request = new Request("https://example.com", {
      headers: { authorization: "Bearer expected" },
    });

    expect(isCronRequestAuthorized(request, ["expected"])).toBe(true);
    expect(isCronRequestAuthorized(request, ["other"])).toBe(false);
    expect(hasConfiguredCronSecret([""])).toBe(false);
    expect(hasConfiguredCronSecret(["expected"])).toBe(true);
  });
});

