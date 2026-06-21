import { NextResponse } from "next/server";
import {
  extractUrlsFromText,
  ingestMediaHubFileMaterial,
  ingestMediaHubLinkMaterial,
  parseMediaHubMaterialHashtags,
  type MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";

export const dynamic = "force-dynamic";

type TelegramMessage = {
  caption?: string;
  chat: { id: number | string };
  document?: {
    file_id: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  };
  from?: { id?: number | string; username?: string };
  message_id: number;
  text?: string;
};

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const message = extractMessage(payload);
  if (!message) {
    return NextResponse.json({ ok: true, skippedReason: "no_message" });
  }

  if (!isAllowedMediaHubTelegramSender(message)) {
    return NextResponse.json({ ok: true, skippedReason: "sender_not_allowed" });
  }

  const botToken = process.env.ID3X_TELEGRAM_BOT_TOKEN ?? process.env.SPIKE_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: true, skippedReason: "telegram_bot_token_missing" });
  }

  const text = [message.text, message.caption].filter(Boolean).join(" ");
  const routed = parseMediaHubMaterialHashtags(text);
  if (routed.tenantIds.length === 0) {
    await sendTelegramText(botToken, String(message.chat.id), "Додайте #ssi або #1d3x до файлу чи лінку, щоб прив’язати матеріал до потрібного звіту.");
    return NextResponse.json({ ok: true, skippedReason: "missing_tenant_hashtag" });
  }

  const urls = extractUrlsFromText(text);
  const results = [];

  for (const tenantId of routed.tenantIds) {
    for (const url of urls) {
      const result = await ingestMediaHubLinkMaterial({
        kind: routed.kind,
        receivedFrom: "telegram",
        sourceType: "telegram_link",
        telegramChatId: String(message.chat.id),
        telegramFromId: message.from?.id ? String(message.from.id) : undefined,
        telegramMessageId: String(message.message_id),
        tenantId,
        url,
      });
      results.push(result);
      await replyForResult(botToken, message, tenantId, result.extractionStatus, url);
    }
  }

  if (message.document) {
    const file = await downloadTelegramFile(botToken, message.document.file_id);
    for (const tenantId of routed.tenantIds) {
      const result = file
        ? await ingestMediaHubFileMaterial({
            bytes: file,
            filename: message.document.file_name ?? "telegram-upload",
            kind: routed.kind,
            mimeType: message.document.mime_type ?? "application/octet-stream",
            receivedFrom: "telegram",
            sourceType: "telegram_file",
            telegramChatId: String(message.chat.id),
            telegramFromId: message.from?.id ? String(message.from.id) : undefined,
            telegramMessageId: String(message.message_id),
            tenantId,
          })
        : {
            extractionStatus: "failed",
            kind: routed.kind,
            message: "Telegram file download failed.",
            tenantId,
          };
      results.push(result);
      await replyForResult(
        botToken,
        message,
        tenantId,
        result.extractionStatus,
        message.document.file_name ?? "file",
      );
    }
  }

  if (results.length === 0) {
    await sendTelegramText(botToken, String(message.chat.id), "Матеріал не знайдено. Надішліть посилання або PDF/XLSX/CSV/TXT файл з #ssi або #1d3x.");
  }

  return NextResponse.json({ ok: true, results });
}

function extractMessage(update: unknown): TelegramMessage | null {
  if (!update || typeof update !== "object") {
    return null;
  }
  const candidate = (update as { message?: unknown; edited_message?: unknown }).message ??
    (update as { edited_message?: unknown }).edited_message;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  return candidate as TelegramMessage;
}

function isAllowedMediaHubTelegramSender(message: TelegramMessage) {
  const chatAllowlist = parseAllowlist(process.env.MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS);
  const userAllowlist = parseAllowlist(process.env.MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS);
  const chatId = String(message.chat.id);
  const userId = message.from?.id ? String(message.from.id) : "";

  return (chatAllowlist.length === 0 || chatAllowlist.includes(chatId)) &&
    (userAllowlist.length === 0 || userAllowlist.includes(userId));
}

function parseAllowlist(value?: string) {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function downloadTelegramFile(botToken: string, fileId: string) {
  const metadataResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!metadataResponse.ok) {
    return null;
  }
  const metadata = await metadataResponse.json() as { result?: { file_path?: string } };
  const filePath = metadata.result?.file_path;
  if (!filePath) {
    return null;
  }
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!fileResponse.ok) {
    return null;
  }
  return Buffer.from(await fileResponse.arrayBuffer());
}

async function replyForResult(
  botToken: string,
  message: TelegramMessage,
  tenantId: MediaHubManualMaterialTenant,
  status: string,
  label: string,
) {
  const tenantLabel = tenantId === "1d3x" ? "1D3X" : "SSI";
  if (status === "duplicate") {
    await sendTelegramText(botToken, String(message.chat.id), `Цей матеріал уже є в системі для ${tenantLabel} за цей період. Дублікат не додано.`);
    return;
  }
  if (status === "unsupported" || status === "unsupported_image_ocr") {
    await sendTelegramText(botToken, String(message.chat.id), "Файл отримано, але цей формат поки не підтримується для автоматичного аналізу. Надішліть PDF, XLSX, CSV або посилання.");
    return;
  }
  if (status === "failed") {
    await sendTelegramText(botToken, String(message.chat.id), "Матеріал отримано, але автоматичне читання не вдалося. Він збережений як metadata-only і не буде використаний у звіті без повторної обробки.");
    return;
  }
  await sendTelegramText(botToken, String(message.chat.id), `Матеріал оброблено для ${tenantLabel} weekly report: ${label}. Статус: ${status}.`);
}

async function sendTelegramText(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({ chat_id: chatId, text }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}
