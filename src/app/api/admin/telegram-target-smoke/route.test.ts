import { afterEach, describe, expect, it, vi } from "vitest";

describe("telegram target smoke route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("sends Telegram smoke messages with an abort signal", async () => {
    vi.stubEnv("TELEGRAM_TARGET_SMOKE_SECRET", "smoke-secret");
    vi.stubEnv("SPIKE_TELEGRAM_BOT_TOKEN", "bot-token");
    vi.stubEnv("INDEX_TELEGRAM_SMOKE_CHAT_ID", "4877462929");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        ok: true,
        result: {
          chat: { id: -1004877462929, title: "Smoke", type: "supergroup" },
          message_id: 123,
        },
      }),
    );
    const { POST } = await import("./route");

    const response = await POST(new Request("https://example.com/api/admin/telegram-target-smoke", {
      body: JSON.stringify({ text: "smoke" }),
      headers: {
        authorization: "Bearer smoke-secret",
        "content-type": "application/json",
      },
      method: "POST",
    }));

    expect(response.status).toBe(200);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
