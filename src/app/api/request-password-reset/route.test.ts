import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRequestRateLimitForTests } from "@/lib/request-rate-limit";

vi.mock("@/lib/password-reset", () => ({
  requestPasswordReset: vi.fn(async () => ({ status: "accepted" })),
}));

beforeEach(() => {
  resetRequestRateLimitForTests();
  vi.restoreAllMocks();
});

describe("request password reset route", () => {
  it("silently throttles repeated reset requests without revealing account existence", async () => {
    const passwordReset = await import("@/lib/password-reset");
    const { POST } = await import("./route");

    const responses = [];
    for (let index = 0; index < 4; index += 1) {
      responses.push(await POST(resetRequest()));
    }

    expect(responses.every((response) => response.status === 303)).toBe(true);
    expect(responses[3].headers.get("location")).toContain("reset=sent");
    expect(responses[3].headers.get("retry-after")).toBeTruthy();
    expect(passwordReset.requestPasswordReset).toHaveBeenCalledTimes(3);
  });
});

function resetRequest() {
  const formData = new FormData();
  formData.set("email", "user@example.com");
  formData.set("locale", "en");
  return new Request("https://example.com/api/request-password-reset", {
    body: formData,
    headers: { "x-forwarded-for": "203.0.113.55" },
    method: "POST",
  }) as never;
}
