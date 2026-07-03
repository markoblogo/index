import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRequestRateLimitForTests } from "@/lib/request-rate-limit";

beforeEach(() => {
  resetRequestRateLimitForTests();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("platform contact route", () => {
  it("rate limits repeated contact submissions before sending email", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 }),
    );
    const { POST } = await import("./route");

    const responses = [];
    for (let index = 0; index < 6; index += 1) {
      responses.push(await POST(contactRequest()));
    }

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(true);
    expect(responses[5].status).toBe(429);
    expect(responses[5].headers.get("retry-after")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

function contactRequest() {
  const formData = new FormData();
  formData.set("name", "Test User");
  formData.set("email", "test@example.com");
  formData.set("message", "Hello");
  return new Request("https://example.com/api/platform-contact", {
    body: formData,
    headers: { "x-forwarded-for": "203.0.113.44" },
    method: "POST",
  });
}
