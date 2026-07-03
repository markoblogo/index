import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRequestRateLimitForTests } from "@/lib/request-rate-limit";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/demo-auth", () => ({
  DEMO_SESSION_COOKIE: "demo_session",
  DEMO_SESSION_TTL_SECONDS: 3600,
  getRoleHome: () => "/admin",
  LEGACY_DEMO_SESSION_COOKIE: "legacy_demo_session",
}));

vi.mock("@/lib/password-reset", () => ({
  completePasswordReset: vi.fn(async () => null),
}));

beforeEach(() => {
  resetRequestRateLimitForTests();
  vi.restoreAllMocks();
});

describe("reset password route", () => {
  it("rate limits repeated reset completion attempts by token and client", async () => {
    const passwordReset = await import("@/lib/password-reset");
    const { POST } = await import("./route");
    const responses = [];

    for (let index = 0; index < 9; index += 1) {
      responses.push(await POST(resetRequest()));
    }

    expect(responses.at(-1)?.status).toBe(303);
    expect(responses.at(-1)?.headers.get("location")).toContain("error=rate_limited");
    expect(responses.at(-1)?.headers.get("retry-after")).toBeTruthy();
    expect(passwordReset.completePasswordReset).toHaveBeenCalledTimes(8);
  });
});

function resetRequest() {
  const formData = new FormData();
  formData.set("token", "token-a");
  formData.set("password", "valid-password");
  formData.set("confirmPassword", "valid-password");
  return new Request("https://example.com/api/reset-password", {
    body: formData,
    headers: { "x-forwarded-for": "203.0.113.61" },
    method: "POST",
  }) as never;
}
