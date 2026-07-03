import { Api } from "grammy";
import type { Update } from "grammy/types";

export type TelegramConnectorMedia = {
  fileId: string;
  fileName?: string;
  fileSize?: number;
  mediaType: "animation" | "audio" | "document" | "photo" | "video" | "voice";
  mimeType?: string;
};

export type TelegramConnectorMessage = {
  author: {
    id?: string;
    isBot?: boolean;
    name?: string;
    username?: string;
  };
  caption: string | null;
  chatId: string;
  chatTitle: string | null;
  chatType: string | null;
  forwardFrom: {
    chatId?: string;
    messageId?: string;
    name?: string;
    username?: string;
  } | null;
  idempotencyKey: string;
  links: string[];
  media: TelegramConnectorMedia[];
  messageId: string;
  rawUpdate: unknown;
  source: "telegram";
  text: string;
  timestamp: string | null;
  updateId?: number;
};

export type TelegramConnectorPolicy = {
  manualApprovalRequired: boolean;
  postAllowed: boolean;
  readAllowed: boolean;
};

export type TelegramConnectorPolicyInput = {
  autopostApproved?: boolean;
  manualApprovalRequired?: boolean;
  postableChatIds?: string[];
  readableChatIds?: string[];
};

const TELEGRAM_LINK_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export function normalizeTelegramUpdate(update: unknown): TelegramConnectorMessage | null {
  const typed = update as Update | null;
  if (!typed || typeof typed !== "object") return null;
  const message = getUpdateMessage(typed);
  if (!message) return null;
  const chat = message.chat;
  const messageId = "message_id" in message ? message.message_id : undefined;
  if (!chat?.id || messageId === undefined) return null;

  const text = getMessageText(message);
  const chatId = String(chat.id);
  const rawTimestamp = "date" in message ? message.date : undefined;

  return {
    author: getMessageAuthor(message),
    caption: "caption" in message && message.caption ? message.caption : null,
    chatId,
    chatTitle: "title" in chat && chat.title ? chat.title : null,
    chatType: "type" in chat && chat.type ? chat.type : null,
    forwardFrom: getForwardFrom(message),
    idempotencyKey: buildTelegramIdempotencyKey(chatId, String(messageId)),
    links: extractTelegramLinks(text),
    media: getMessageMedia(message),
    messageId: String(messageId),
    rawUpdate: update,
    source: "telegram",
    text,
    timestamp: typeof rawTimestamp === "number"
      ? new Date(rawTimestamp * 1000).toISOString()
      : null,
    updateId: typed.update_id,
  };
}

export function buildTelegramIdempotencyKey(chatId: string | number, messageId: string | number) {
  return `telegram:${String(chatId)}:${String(messageId)}`;
}

export function evaluateTelegramConnectorPolicy(
  message: Pick<TelegramConnectorMessage, "chatId">,
  input: TelegramConnectorPolicyInput = {},
): TelegramConnectorPolicy {
  const readableChatIds = input.readableChatIds ?? parseTelegramConnectorList(process.env.TELEGRAM_CONNECTOR_READ_CHAT_IDS);
  const postableChatIds = input.postableChatIds ?? parseTelegramConnectorList(process.env.TELEGRAM_CONNECTOR_POST_CHAT_IDS);
  const manualApprovalRequired = input.manualApprovalRequired ??
    process.env.TELEGRAM_CONNECTOR_MANUAL_APPROVAL_REQUIRED !== "0";

  return {
    manualApprovalRequired,
    postAllowed: (postableChatIds.length === 0 || postableChatIds.includes(message.chatId)) &&
      (!manualApprovalRequired || input.autopostApproved === true),
    readAllowed: readableChatIds.length === 0 || readableChatIds.includes(message.chatId),
  };
}

export function parseTelegramConnectorList(value?: string) {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createTelegramConnectorApi(token: string, timeoutSeconds = 15) {
  return new Api(token, { timeoutSeconds });
}

export async function telegramConnectorSendMessage(input: {
  api: Api;
  chatId: string | number;
  signal?: Parameters<Api["sendMessage"]>[3];
  text: string;
  options?: Parameters<Api["sendMessage"]>[2];
}) {
  return input.api.sendMessage(input.chatId, input.text, input.options, input.signal);
}

export async function telegramConnectorSendPhoto(input: {
  api: Api;
  chatId: string | number;
  photo: string;
  signal?: Parameters<Api["sendPhoto"]>[3];
  options?: Parameters<Api["sendPhoto"]>[2];
}) {
  return input.api.sendPhoto(input.chatId, input.photo, input.options, input.signal);
}

export async function telegramConnectorSendDocument(input: {
  api: Api;
  chatId: string | number;
  document: string;
  signal?: Parameters<Api["sendDocument"]>[3];
  options?: Parameters<Api["sendDocument"]>[2];
}) {
  return input.api.sendDocument(input.chatId, input.document, input.options, input.signal);
}

export async function telegramConnectorCopyMessage(input: {
  api: Api;
  chatId: string | number;
  fromChatId: string | number;
  messageId: number;
  signal?: Parameters<Api["copyMessage"]>[4];
  options?: Parameters<Api["copyMessage"]>[3];
}) {
  return input.api.copyMessage(input.chatId, input.fromChatId, input.messageId, input.options, input.signal);
}

export async function telegramConnectorForwardMessage(input: {
  api: Api;
  chatId: string | number;
  fromChatId: string | number;
  messageId: number;
  signal?: Parameters<Api["forwardMessage"]>[4];
  options?: Parameters<Api["forwardMessage"]>[3];
}) {
  return input.api.forwardMessage(input.chatId, input.fromChatId, input.messageId, input.options, input.signal);
}

function getUpdateMessage(update: Update) {
  return update.message ?? update.channel_post ?? update.edited_message ?? update.edited_channel_post ?? null;
}

function getMessageText(message: NonNullable<ReturnType<typeof getUpdateMessage>>) {
  return [
    "text" in message ? message.text : "",
    "caption" in message ? message.caption : "",
  ].filter(Boolean).join("\n").trim();
}

function getMessageAuthor(message: NonNullable<ReturnType<typeof getUpdateMessage>>) {
  const from = "from" in message ? message.from : undefined;
  const senderChat = "sender_chat" in message ? message.sender_chat : undefined;
  return {
    id: from?.id ? String(from.id) : senderChat?.id ? String(senderChat.id) : undefined,
    isBot: from?.is_bot,
    name: [from?.first_name, from?.last_name].filter(Boolean).join(" ") || senderChat?.title,
    username: from?.username ?? senderChat?.username,
  };
}

function getForwardFrom(message: NonNullable<ReturnType<typeof getUpdateMessage>>) {
  const origin = "forward_origin" in message ? message.forward_origin : undefined;
  if (!origin) return null;
  if (origin.type === "channel") {
    return {
      chatId: String(origin.chat.id),
      messageId: origin.message_id ? String(origin.message_id) : undefined,
      name: origin.chat.title,
      username: origin.chat.username,
    };
  }
  if (origin.type === "chat") {
    return {
      chatId: String(origin.sender_chat.id),
      name: origin.sender_chat.title,
      username: origin.sender_chat.username,
    };
  }
  if (origin.type === "user") {
    return {
      name: [origin.sender_user.first_name, origin.sender_user.last_name].filter(Boolean).join(" "),
      username: origin.sender_user.username,
    };
  }
  return {
    name: origin.sender_user_name,
  };
}

function getMessageMedia(message: NonNullable<ReturnType<typeof getUpdateMessage>>): TelegramConnectorMedia[] {
  const media: TelegramConnectorMedia[] = [];
  if ("document" in message && message.document) {
    media.push({
      fileId: message.document.file_id,
      fileName: message.document.file_name,
      fileSize: message.document.file_size,
      mediaType: "document",
      mimeType: message.document.mime_type,
    });
  }
  if ("photo" in message && message.photo?.length) {
    const photo = message.photo.at(-1);
    if (photo) {
      media.push({
        fileId: photo.file_id,
        fileSize: photo.file_size,
        mediaType: "photo",
      });
    }
  }
  for (const key of ["animation", "audio", "video", "voice"] as const) {
    if (key in message && message[key]) {
      const item = message[key];
      media.push({
        fileId: item.file_id,
        fileName: "file_name" in item ? item.file_name : undefined,
        fileSize: item.file_size,
        mediaType: key,
        mimeType: "mime_type" in item ? item.mime_type : undefined,
      });
    }
  }
  return media;
}

function extractTelegramLinks(text: string) {
  return [...text.matchAll(TELEGRAM_LINK_RE)].map((match) => match[0]);
}
