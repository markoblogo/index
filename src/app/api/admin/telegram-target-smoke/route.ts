import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SmokeBody = {
  chatId?: string;
  text?: string;
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as SmokeBody;
  const botToken =
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN;
  const configuredChatId =
    body.chatId ??
    process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID ??
    process.env.MEDIA_HUB_TELEGRAM_CHAT_ID ??
    process.env.SPIKE_AI_TELEGRAM_CHAT_ID ??
    process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID;

  if (!botToken || !configuredChatId) {
    return NextResponse.json(
      {
        chatConfigured: Boolean(configuredChatId),
        error: "telegram_not_configured",
        tokenConfigured: Boolean(botToken),
      },
      { status: 500 },
    );
  }

  const chatId = normalizeTelegramChatId(configuredChatId);
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      disable_notification: true,
      disable_web_page_preview: true,
      text: body.text?.trim() || "SSI Telegram target smoke test: publication group is configured.",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = await response.json().catch(() => null) as {
    description?: string;
    error_code?: number;
    ok?: boolean;
    result?: { chat?: { id?: number | string; title?: string; type?: string }; message_id?: number };
  } | null;

  if (!response.ok || payload?.ok !== true) {
    return NextResponse.json(
      {
        chatId,
        error: "telegram_send_failed",
        telegram: {
          description: payload?.description,
          errorCode: payload?.error_code,
          ok: payload?.ok,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    chat: payload.result?.chat
      ? {
          id: payload.result.chat.id,
          title: payload.result.chat.title,
          type: payload.result.chat.type,
        }
      : null,
    chatId,
    messageId: payload.result?.message_id,
    ok: true,
  });
}

function isAuthorized(request: Request) {
  const configured =
    process.env.TELEGRAM_TARGET_SMOKE_SECRET ??
    process.env.MEDIA_HUB_SMOKE_TEST_SECRET;
  if (!configured) return false;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === configured;
}

function normalizeTelegramChatId(value: string) {
  const trimmed = value.trim();
  return /^\d{10,}$/.test(trimmed) ? `-100${trimmed}` : trimmed;
}
