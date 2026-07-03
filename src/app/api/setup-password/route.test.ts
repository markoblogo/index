import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRequestRateLimitForTests } from "@/lib/request-rate-limit";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/demo-auth", () => ({
  createDemoSessionCookieValue: vi.fn(() => "session"),
  DEMO_SESSION_COOKIE: "demo_session",
  DEMO_SESSION_TTL_SECONDS: 3600,
  getCurrentDemoUser: vi.fn(async () => null),
  getSafeRoleRedirect: vi.fn(() => "/admin"),
  LEGACY_DEMO_SESSION_COOKIE: "legacy_demo_session",
  parseDemoSessionCookieValue: vi.fn(() => null),
}));

vi.mock("@/lib/password-setup", () => ({
  setPermanentPasswordForUser: vi.fn(async () => undefined),
}));

beforeEach(() => {
  resetRequestRateLimitForTests();
  vi.restoreAllMocks();
});

describe("setup password route", () => {
  it("rate limits repeated setup attempts before parsing or writing passwords", async () => {
    const passwordSetup = await import("@/lib/password-setup");
    const { POST } = await import("./route");
    const responses = [];

    for (let index = 0; index < 9; index += 1) {
      responses.push(await POST(setupRequest()));
    }

    expect(responses.at(-1)?.status).toBe(303);
    expect(responses.at(-1)?.headers.get("location")).toContain("error=rate_limited");
    expect(responses.at(-1)?.headers.get("retry-after")).toBeTruthy();
    expect(passwordSetup.setPermanentPasswordForUser).not.toHaveBeenCalled();
  });
});

function setupRequest() {
  const formData = new FormData();
  formData.set("setupSession", "setup-session-a");
  formData.set("password", "short");
  formData.set("confirmPassword", "different");
  const request = new Request("https://example.com/api/setup-password", {
    body: formData,
    headers: { "x-forwarded-for": "203.0.113.62" },
    method: "POST",
  }) as Request & { cookies: { get: () => undefined } };
  request.cookies = { get: () => undefined };
  return request as never;
}
