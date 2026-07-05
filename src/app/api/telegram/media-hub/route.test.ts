import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    ID3X_TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET: "test-secret",
  };
  vi.stubGlobal("fetch", vi.fn(async () => new Response(
    JSON.stringify({ ok: true, result: { message_id: 1 } }),
    { headers: { "content-type": "application/json" }, status: 200 },
  )));
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("media hub telegram route", () => {
  it("/start returns help text", async () => {
    await postTelegramUpdate(buildMessageUpdate("/start"));

    expectSentTelegramText("Вітаємо. Це бот");
    const fetchMock = vi.mocked(fetch);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("/help returns help text", async () => {
    await postTelegramUpdate(buildMessageUpdate("/help"));

    expectSentTelegramText("Вітаємо. Це бот");
  });

  it("/materials returns material submission instruction", async () => {
    await postTelegramUpdate(buildMessageUpdate("/materials"));

    expectSentTelegramText("Як надіслати матеріал для звіту");
  });

  it("/tags returns tag rules", async () => {
    await postTelegramUpdate(buildMessageUpdate("/tags"));

    expectSentTelegramText("Доступні теги");
  });

  it("/status returns empty status when the chat has no materials", async () => {
    await postTelegramUpdate(buildMessageUpdate("/status"));

    expectSentTelegramText("Поки немає матеріалів");
  });

  it("allowlist denied user receives a clear denial reply", async () => {
    process.env.MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS = "999";

    const response = await postTelegramUpdate(buildMessageUpdate("/start", {
      chatId: 111,
      userId: 222,
    }));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, skippedReason: "sender_not_allowed" });
    expectSentTelegramText("Access denied.");
    expectSentTelegramText("Your user id: 222.");
  });

  it("missing bot token fails with safe diagnostic", async () => {
    delete process.env.MEDIA_HUB_TELEGRAM_BOT_TOKEN;
    delete process.env.ID3X_TELEGRAM_BOT_TOKEN;
    delete process.env.SPIKE_TELEGRAM_BOT_TOKEN;

    const { GET } = await import("./route");
    const response = await GET(new Request(
      "https://example.com/api/telegram/media-hub?action=getMe",
      { headers: { authorization: "Bearer test-secret" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "media_hub_bot_token_missing",
      ok: false,
    });
    expect(body.requiredEnv).toContain("ID3X_TELEGRAM_BOT_TOKEN");
  });

  it("wrong webhook secret returns 401", async () => {
    const response = await postTelegramUpdate(buildMessageUpdate("/start"), "wrong-secret");

    expect(response.status).toBe(401);
  });

  it("missing webhook secret fails closed", async () => {
    delete process.env.TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET;

    const response = await postTelegramUpdate(buildMessageUpdate("/start"), "test-secret");

    expect(response.status).toBe(401);
  });

  it("sendMessage failure is logged safely", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("telegram failed", { status: 500 })));

    await postTelegramUpdate(buildMessageUpdate("/start"));

    expect(warn).toHaveBeenCalledWith(
      "media_hub_telegram_send_failed",
      expect.objectContaining({ status: 500 }),
    );
  });

  it("immediately acknowledges received tagged materials", async () => {
    await postTelegramUpdate(buildMessageUpdate("#ssi #weekly Україна експортувала зерно через портові та прикордонні маршрути протягом тижня."));

    expectSentTelegramText("Матеріал отримано для SSI: weekly.");
    expectSentTelegramText("Все добре, будемо з ним працювати.");
  });

  it("ignores bot-authored messages to prevent acknowledgement loops", async () => {
    const response = await postTelegramUpdate(buildMessageUpdate("Матеріал отримано для SSI: weekly.", {
      isBot: true,
      userId: 777,
    }));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, skippedReason: "bot_authored_message" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores acknowledgement echo text even when Telegram omits bot author metadata", async () => {
    const response = await postTelegramUpdate(buildMessageUpdate([
      "Матеріал отримано для SSI: weekly.",
      "Все добре, будемо з ним працювати.",
      "Буде враховано у звіті за weekly.",
    ].join("\n")));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, skippedReason: "ack_echo_message" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores processed file acknowledgement echo text", async () => {
    const response = await postTelegramUpdate(buildMessageUpdate([
      "Файл прийнято для SSI: weekly. Тип: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet. Статус: обробка.",
      "Матеріал оброблено для SSI: weekly. Буде враховано у звіті за weekly.",
    ].join("\n")));
    const body = await response.json();

    expect(body).toMatchObject({ ok: true, skippedReason: "ack_echo_message" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

async function postTelegramUpdate(update: unknown, secret = "test-secret") {
  const { POST } = await import("./route");
  return POST(new Request("https://example.com/api/telegram/media-hub", {
    body: JSON.stringify(update),
    headers: { "x-telegram-bot-api-secret-token": secret },
    method: "POST",
  }));
}

function buildMessageUpdate(
  text: string,
  ids: { chatId?: number; isBot?: boolean; userId?: number } = {},
) {
  return {
    message: {
      chat: { id: ids.chatId ?? 111 },
      from: { id: ids.userId ?? 222, is_bot: ids.isBot ?? false, username: "tester" },
      message_id: 10,
      text,
    },
  };
}

function expectSentTelegramText(expected: string) {
  const fetchMock = vi.mocked(fetch);
  const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body ?? "{}")));
  expect(bodies.some((body) => String(body.text).includes(expected))).toBe(true);
}
