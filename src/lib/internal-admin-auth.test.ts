import { describe, expect, it, vi } from "vitest";
import { isInternalSecretHeaderAuthorized } from "./internal-admin-auth";

vi.mock("server-only", () => ({}));

describe("isInternalSecretHeaderAuthorized", () => {
  it("fails closed when the expected secret is missing", () => {
    const request = new Request("https://example.com", {
      headers: { "x-test-secret": "secret" },
    });

    expect(isInternalSecretHeaderAuthorized(request, "x-test-secret", undefined)).toBe(false);
  });

  it("requires an exact timing-safe header match", () => {
    const request = new Request("https://example.com", {
      headers: { "x-test-secret": "secret" },
    });

    expect(isInternalSecretHeaderAuthorized(request, "x-test-secret", "secret")).toBe(true);
    expect(isInternalSecretHeaderAuthorized(request, "x-test-secret", "wrong")).toBe(false);
  });
});
