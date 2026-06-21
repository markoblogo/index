import { NextResponse } from "next/server";
import {
  extractUrlsFromText,
  ingestMediaHubFileMaterial,
  ingestMediaHubLinkMaterial,
  ingestMediaHubTextMaterial,
  listRecentMediaHubManualMaterialsForChat,
  parseMediaHubMaterialHashtags,
  type MediaHubManualMaterialTenant,
} from "@/lib/media-hub-manual-materials";
import {
  inferCorporateTelegramTenants,
  isCorporateTelegramChat,
} from "@/lib/media-hub-corporate-telegram";
import {
  buildMediaHubMaterialHelpText,
  buildMediaHubMaterialsText,
  buildMediaHubSubmissionReply,
  buildMediaHubTagsText,
  buildMissingProjectTagText,
  getMediaHubProjectName,
  getMediaHubReportKindLabel,
  parseMediaHubMaterialBotCommand,
} from "@/lib/media-hub-material-bot";

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
  const isCorporateGroupMessage = isCorporateTelegramChat(message.chat.id);
  const command = parseMediaHubMaterialBotCommand(message.text);
  if (command) {
    await handleBotCommand(botToken, message, command);
    return NextResponse.json({ command, ok: true });
  }

  const routed = parseMediaHubMaterialHashtags(text);
  const inferredTenantIds = isCorporateGroupMessage && routed.tenantIds.length === 0
    ? inferCorporateTelegramTenants(text)
    : [];
  const tenantIds = routed.tenantIds.length > 0
    ? routed.tenantIds
    : inferredTenantIds;
  if (routed.tenantIds.length === 0) {
    if (isCorporateGroupMessage && tenantIds.length === 0 && text.trim()) {
      await ingestMediaHubTextMaterial({
        kind: "source_candidate",
        receivedFrom: "telegram",
        sourceType: "corporate_telegram_group",
        telegramChatId: String(message.chat.id),
        telegramFromId: message.from?.id ? String(message.from.id) : undefined,
        telegramMessageId: String(message.message_id),
        tenantId: "corporate-unrouted",
        text,
      });
      if (tenantIds.length === 0) {
        await sendTelegramText(botToken, String(message.chat.id), "Матеріал збережено як corporate Telegram unrouted. Додайте #ssi або #1d3x, щоб він автоматично потрапив у відповідний Media Hub report.");
        return NextResponse.json({ ok: true, skippedReason: "corporate_telegram_unrouted" });
      }
    }
    if (tenantIds.length === 0) {
      await sendTelegramText(botToken, String(message.chat.id), buildMissingProjectTagText());
      return NextResponse.json({ ok: true, skippedReason: "missing_tenant_hashtag" });
    }
  }

  const urls = extractUrlsFromText(text);
  const results = [];

  for (const tenantId of tenantIds) {
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
      await replyForResult({
        botToken,
        kind: routed.kind,
        label: url,
        message,
        sourceType: "link",
        status: result.extractionStatus,
        tenantId,
      });
    }
  }

  if (message.document) {
    const file = await downloadTelegramFile(botToken, message.document.file_id);
    for (const tenantId of tenantIds) {
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
      await replyForResult({
        botToken,
        kind: routed.kind,
        label: message.document.file_name ?? "file",
        message,
        mimeType: message.document.mime_type ?? "application/octet-stream",
        sourceType: "file",
        status: result.extractionStatus,
        tenantId,
      });
    }
  }

  if (isCorporateGroupMessage && results.length === 0 && text.trim()) {
    for (const tenantId of tenantIds) {
      const result = await ingestMediaHubTextMaterial({
        kind: routed.kind,
        receivedFrom: "telegram",
        sourceType: "corporate_telegram_group",
        telegramChatId: String(message.chat.id),
        telegramFromId: message.from?.id ? String(message.from.id) : undefined,
        telegramMessageId: String(message.message_id),
        tenantId,
        text,
      });
      results.push(result);
      await replyForResult({
        botToken,
        kind: routed.kind,
        label: "corporate Telegram message",
        message,
        sourceType: "text",
        status: result.extractionStatus,
        tenantId,
      });
    }
  }

  if (results.length === 0) {
    await sendTelegramText(botToken, String(message.chat.id), "Матеріал не знайдено. Надішліть посилання або PDF/XLSX/CSV/TXT файл з #ssi або #1d3x.");
  }

  return NextResponse.json({ ok: true, results });
}

async function handleBotCommand(
  botToken: string,
  message: TelegramMessage,
  command: "help" | "materials" | "start" | "status" | "tags",
) {
  const chatId = String(message.chat.id);
  if (command === "materials") {
    await sendTelegramText(botToken, chatId, buildMediaHubMaterialsText(getAdminMaterialsUrl()));
    return;
  }
  if (command === "tags") {
    await sendTelegramText(botToken, chatId, buildMediaHubTagsText());
    return;
  }
  if (command === "status") {
    const materials = await listRecentMediaHubManualMaterialsForChat(chatId);
    await sendTelegramText(botToken, chatId, buildStatusText(materials));
    return;
  }
  await sendTelegramText(botToken, chatId, buildMediaHubMaterialHelpText());
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

async function replyForResult({
  botToken,
  kind,
  label,
  message,
  mimeType,
  sourceType,
  status,
  tenantId,
}: {
  botToken: string;
  kind: ReturnType<typeof parseMediaHubMaterialHashtags>["kind"];
  label: string;
  message: TelegramMessage;
  mimeType?: string;
  sourceType: "file" | "link" | "text";
  status: string;
  tenantId: MediaHubManualMaterialTenant;
}) {
  await sendTelegramText(
    botToken,
    String(message.chat.id),
    buildMediaHubSubmissionReply({
      kind,
      label,
      mimeType,
      sourceType,
      status,
      tenantId,
    }),
  );
}

async function sendTelegramText(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({ chat_id: chatId, text }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
}

function buildStatusText(
  materials: Awaited<ReturnType<typeof listRecentMediaHubManualMaterialsForChat>>,
) {
  if (materials.length === 0) {
    return "Поки немає матеріалів, надісланих з цього чату.";
  }

  const lines = materials.map((material) => {
    const label = material.originalFilename || material.sourceDomain || material.originalUrl || material.id;
    const receivedAt = material.receivedAt instanceof Date
      ? material.receivedAt.toISOString().slice(0, 16).replace("T", " ")
      : String(material.receivedAt);
    return `• ${getMediaHubProjectName(material.tenantId as MediaHubManualMaterialTenant)} · ${getMediaHubReportKindLabel(material.kind as ReturnType<typeof parseMediaHubMaterialHashtags>["kind"])} · ${label} · ${material.extractionStatus} · ${receivedAt}`;
  });

  return ["Останні матеріали з цього чату:", "", ...lines].join("\n");
}

function getAdminMaterialsUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return siteUrl ? `${siteUrl}/admin/media-hub/materials` : "/admin/media-hub/materials";
}
