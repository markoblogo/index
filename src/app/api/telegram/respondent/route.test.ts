import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/respondent-onboarding", () => ({
  handleRespondentTelegramStart: vi.fn(async () => ({ ok: true })),
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    TELEGRAM_RESPONDENT_WEBHOOK_SECRET: "test-secret",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe("respondent telegram webhook route", () => {
  it("fails closed when webhook secret is missing", async () => {
    delete process.env.TELEGRAM_RESPONDENT_WEBHOOK_SECRET;

    const response = await postRespondentTelegram("anything");

    expect(response.status).toBe(401);
  });

  it("rejects mismatched webhook secret", async () => {
    const response = await postRespondentTelegram("wrong-secret");

    expect(response.status).toBe(401);
  });

  it("accepts matching webhook secret", async () => {
    const response = await postRespondentTelegram("test-secret");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });
});

async function postRespondentTelegram(secret: string) {
  const { POST } = await import("./route");
  return POST(new Request("https://example.com/api/telegram/respondent", {
    body: JSON.stringify({ message: { text: "/start" } }),
    headers: { "x-telegram-bot-api-secret-token": secret },
    method: "POST",
  }));
}
