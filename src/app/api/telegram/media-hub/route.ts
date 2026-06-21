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

const MEDIA_HUB_BOT_TOKEN_ENV_NAMES = [
  "MEDIA_HUB_TELEGRAM_BOT_TOKEN",
  "ID3X_TELEGRAM_BOT_TOKEN",
  "SPIKE_TELEGRAM_BOT_TOKEN",
  "INDEX_TELEGRAM_BOT_TOKEN",
] as const;

const MEDIA_HUB_ROUTE_PATH = "/api/telegram/media-hub";
const TELEGRAM_ALLOWED_UPDATES = ["message", "edited_message", "callback_query"] as const;

export async function GET(request: Request) {
  const auth = isDiagnosticRequestAuthorized(request);
  if (!auth.ok) {
    safeWarn("media_hub_telegram_diagnostic_unauthorized", auth.meta);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = getMediaHubBotToken();
  if (!token.value) {
    return NextResponse.json(
      {
        error: "media_hub_bot_token_missing",
        ok: false,
        requiredEnv: MEDIA_HUB_BOT_TOKEN_ENV_NAMES,
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "getWebhookInfo";

  if (action === "getMe") {
    const result = await callTelegramBotApi(token.value, "getMe");
    return NextResponse.json(sanitizeTelegramGetMe(result, token.name));
  }

  if (action === "getWebhookInfo") {
    const result = await callTelegramBotApi(token.value, "getWebhookInfo");
    return NextResponse.json(sanitizeTelegramWebhookInfo(result, token.name));
  }

  if (action === "setWebhook") {
    const webhookUrl = getMediaHubWebhookUrl(request);
    const result = await callTelegramBotApi(token.value, "setWebhook", {
      allowed_updates: TELEGRAM_ALLOWED_UPDATES,
      drop_pending_updates: url.searchParams.get("dropPending") === "1",
      secret_token: process.env.TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET || undefined,
      url: webhookUrl,
    });
    return NextResponse.json({
      ...sanitizeTelegramApiResult(result),
      allowed_updates: TELEGRAM_ALLOWED_UPDATES,
      botTokenEnv: token.name,
      webhookUrl,
    });
  }

  return NextResponse.json(
    { error: "Unsupported action. Use getMe, getWebhookInfo or setWebhook." },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret && provided !== secret) {
    safeWarn("media_hub_telegram_webhook_secret_mismatch", {
      hasProvided: Boolean(provided),
      hasSecret: true,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = getMediaHubBotToken();
  if (!botToken.value) {
    safeWarn("media_hub_telegram_bot_token_missing", {
      requiredEnv: MEDIA_HUB_BOT_TOKEN_ENV_NAMES,
    });
    return NextResponse.json(
      {
        error: "media_hub_bot_token_missing",
        ok: false,
        requiredEnv: MEDIA_HUB_BOT_TOKEN_ENV_NAMES,
      },
      { status: 500 },
    );
  }

  const payload = await request.json().catch(() => null);
  const message = extractMessage(payload);
  if (!message) {
    return NextResponse.json({ ok: true, skippedReason: "no_message" });
  }

  if (!isAllowedMediaHubTelegramSender(message)) {
    await sendTelegramText(
      botToken.value,
      String(message.chat.id),
      buildAccessDeniedText(message),
    );
    return NextResponse.json({ ok: true, skippedReason: "sender_not_allowed" });
  }

  const text = [message.text, message.caption].filter(Boolean).join(" ");
  const isCorporateGroupMessage = isCorporateTelegramChat(message.chat.id);
  const command = parseMediaHubMaterialBotCommand(message.text);
  if (command) {
    await handleBotCommand(botToken.value, message, command);
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
        await sendTelegramText(botToken.value, String(message.chat.id), "Матеріал збережено як corporate Telegram unrouted. Додайте #ssi або #1d3x, щоб він автоматично потрапив у відповідний Media Hub report.");
        return NextResponse.json({ ok: true, skippedReason: "corporate_telegram_unrouted" });
      }
    }
    if (tenantIds.length === 0) {
      await sendTelegramText(botToken.value, String(message.chat.id), buildMissingProjectTagText());
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
        botToken: botToken.value,
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
    const file = await downloadTelegramFile(botToken.value, message.document.file_id);
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
        botToken: botToken.value,
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
        botToken: botToken.value,
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
    await sendTelegramText(botToken.value, String(message.chat.id), "Матеріал не знайдено. Надішліть посилання або PDF/XLSX/CSV/TXT файл з #ssi або #1d3x.");
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

function getMediaHubBotToken() {
  for (const name of MEDIA_HUB_BOT_TOKEN_ENV_NAMES) {
    const value = process.env[name];
    if (value) {
      return { name, value };
    }
  }
  return { name: null, value: null };
}

function isDiagnosticRequestAuthorized(request: Request) {
  const configuredSecret = process.env.TELEGRAM_MEDIA_HUB_WEBHOOK_SECRET;
  if (!configuredSecret) {
    return {
      meta: { reason: "diagnostic_secret_not_configured" },
      ok: false,
    };
  }

  const url = new URL(request.url);
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const provided = bearer ??
    request.headers.get("x-telegram-bot-api-secret-token") ??
    url.searchParams.get("secret");

  return {
    meta: {
      hasBearer: Boolean(bearer),
      hasHeaderSecret: Boolean(request.headers.get("x-telegram-bot-api-secret-token")),
      hasQuerySecret: Boolean(url.searchParams.get("secret")),
    },
    ok: provided === configuredSecret,
  };
}

function getMediaHubWebhookUrl(request: Request) {
  const url = new URL(request.url);
  const explicit = url.searchParams.get("webhookUrl") ??
    process.env.MEDIA_HUB_TELEGRAM_WEBHOOK_URL;
  if (explicit) {
    return explicit;
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    url.origin.replace(/\/$/, "");
  return `${base}${MEDIA_HUB_ROUTE_PATH}`;
}

function buildAccessDeniedText(message: TelegramMessage) {
  const userId = message.from?.id ? String(message.from.id) : "unknown";
  return [
    "Access denied.",
    "This Media Hub bot accepts materials only from allowed Telegram users/chats.",
    `Your chat id: ${String(message.chat.id)}.`,
    `Your user id: ${userId}.`,
    "Ask an admin to add the needed id to MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_CHAT_IDS or MEDIA_HUB_MATERIAL_ALLOWED_TELEGRAM_USER_IDS.",
  ].join("\n");
}

async function downloadTelegramFile(botToken: string, fileId: string) {
  const metadataResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!metadataResponse.ok) {
    safeWarn("media_hub_telegram_get_file_failed", { status: metadataResponse.status });
    return null;
  }
  const metadata = await metadataResponse.json() as { result?: { file_path?: string } };
  const filePath = metadata.result?.file_path;
  if (!filePath) {
    return null;
  }
  const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  if (!fileResponse.ok) {
    safeWarn("media_hub_telegram_file_download_failed", { status: fileResponse.status });
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
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    body: JSON.stringify({ chat_id: chatId, text }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch((error: unknown) => {
    safeWarn("media_hub_telegram_send_exception", {
      message: getSafeErrorMessage(error),
    });
    return null;
  });

  if (!response) {
    return false;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    safeWarn("media_hub_telegram_send_failed", {
      body: body.slice(0, 300),
      status: response.status,
    });
    return false;
  }
  return true;
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

async function callTelegramBotApi(
  botToken: string,
  method: "getMe" | "getWebhookInfo" | "setWebhook",
  body?: Record<string, unknown>,
) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    method: body ? "POST" : "GET",
  }).catch((error: unknown) => ({
    error: getSafeErrorMessage(error),
    ok: false,
  }));

  if (!(response instanceof Response)) {
    safeWarn("media_hub_telegram_api_exception", { method, message: response.error });
    return response;
  }

  const payload = await response.json().catch(async () => ({
    description: (await response.text().catch(() => "")).slice(0, 300),
    ok: false,
  }));

  if (!response.ok) {
    safeWarn("media_hub_telegram_api_failed", {
      method,
      status: response.status,
    });
  }

  return payload;
}

function sanitizeTelegramGetMe(result: unknown, botTokenEnv: string | null) {
  const payload = sanitizeTelegramApiResult(result) as {
    ok: boolean;
    result?: {
      first_name?: string;
      id?: number;
      is_bot?: boolean;
      username?: string;
    };
  };
  return {
    botTokenEnv,
    ok: payload.ok,
    result: payload.result
      ? {
          first_name: payload.result.first_name,
          id: payload.result.id,
          is_bot: payload.result.is_bot,
          username: payload.result.username,
        }
      : undefined,
  };
}

function sanitizeTelegramWebhookInfo(result: unknown, botTokenEnv: string | null) {
  const payload = sanitizeTelegramApiResult(result) as {
    ok: boolean;
    result?: {
      allowed_updates?: string[];
      has_custom_certificate?: boolean;
      ip_address?: string;
      last_error_date?: number;
      last_error_message?: string;
      max_connections?: number;
      pending_update_count?: number;
      url?: string;
    };
  };
  return {
    botTokenEnv,
    ok: payload.ok,
    result: payload.result
      ? {
          allowed_updates: payload.result.allowed_updates,
          has_custom_certificate: payload.result.has_custom_certificate,
          ip_address: payload.result.ip_address,
          last_error_date: payload.result.last_error_date,
          last_error_message: payload.result.last_error_message,
          max_connections: payload.result.max_connections,
          pending_update_count: payload.result.pending_update_count,
          url: payload.result.url,
        }
      : undefined,
  };
}

function sanitizeTelegramApiResult(result: unknown) {
  if (!result || typeof result !== "object") {
    return { ok: false };
  }
  const payload = result as {
    description?: string;
    error_code?: number;
    ok?: boolean;
    result?: unknown;
  };
  return {
    description: payload.description,
    error_code: payload.error_code,
    ok: Boolean(payload.ok),
    result: payload.result,
  };
}

function safeWarn(message: string, meta?: Record<string, unknown>) {
  console.warn(message, meta);
}

function getSafeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
