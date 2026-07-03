import { describe, expect, it, vi } from "vitest";
import type { Api } from "grammy";
import {
  buildTelegramIdempotencyKey,
  evaluateTelegramConnectorPolicy,
  normalizeTelegramUpdate,
  telegramConnectorCopyMessage,
  telegramConnectorForwardMessage,
  telegramConnectorSendDocument,
  telegramConnectorSendMessage,
  telegramConnectorSendPhoto,
} from "./telegram-connector";

describe("telegram connector", () => {
  it("normalizes messages into the shared MediaHub contract", () => {
    const normalized = normalizeTelegramUpdate({
      message: {
        caption: "caption https://example.com/report.pdf",
        chat: { id: -1001, title: "Materials", type: "supergroup" },
        date: 1_781_000_000,
        document: {
          file_id: "doc-1",
          file_name: "report.pdf",
          file_size: 123,
          mime_type: "application/pdf",
        },
        forward_origin: {
          chat: { id: -2002, title: "Source channel", username: "source" },
          date: 1_780_999_999,
          message_id: 77,
          type: "channel",
        },
        from: { first_name: "Ada", id: 42, is_bot: false, last_name: "Lovelace", username: "ada" },
        message_id: 11,
        text: "#ssi weekly https://example.com/post",
      },
      update_id: 99,
    });

    expect(normalized).toMatchObject({
      author: { id: "42", isBot: false, name: "Ada Lovelace", username: "ada" },
      caption: "caption https://example.com/report.pdf",
      chatId: "-1001",
      chatTitle: "Materials",
      chatType: "supergroup",
      forwardFrom: {
        chatId: "-2002",
        messageId: "77",
        name: "Source channel",
        username: "source",
      },
      idempotencyKey: "telegram:-1001:11",
      links: ["https://example.com/post", "https://example.com/report.pdf"],
      media: [{
        fileId: "doc-1",
        fileName: "report.pdf",
        fileSize: 123,
        mediaType: "document",
        mimeType: "application/pdf",
      }],
      messageId: "11",
      source: "telegram",
      timestamp: "2026-06-09T10:13:20.000Z",
      updateId: 99,
    });
  });

  it("normalizes channel posts and photo media", () => {
    const normalized = normalizeTelegramUpdate({
      channel_post: {
        caption: "market note",
        chat: { id: -1009, title: "Channel", type: "channel", username: "market" },
        date: 1_781_000_100,
        message_id: 12,
        photo: [
          { file_id: "small", file_size: 10, height: 10, width: 10 },
          { file_id: "large", file_size: 20, height: 100, width: 100 },
        ],
        sender_chat: { id: -1009, title: "Channel", type: "channel", username: "market" },
      },
      update_id: 100,
    });

    expect(normalized).toMatchObject({
      author: { id: "-1009", name: "Channel", username: "market" },
      chatId: "-1009",
      idempotencyKey: "telegram:-1009:12",
      media: [{ fileId: "large", fileSize: 20, mediaType: "photo" }],
      text: "market note",
    });
  });

  it("evaluates read/post policy with manual approval", () => {
    expect(evaluateTelegramConnectorPolicy(
      { chatId: "1" },
      { manualApprovalRequired: true, postableChatIds: ["1"], readableChatIds: ["1"] },
    )).toEqual({
      manualApprovalRequired: true,
      postAllowed: false,
      readAllowed: true,
    });

    expect(evaluateTelegramConnectorPolicy(
      { chatId: "1" },
      {
        autopostApproved: true,
        manualApprovalRequired: true,
        postableChatIds: ["1"],
        readableChatIds: ["2"],
      },
    )).toEqual({
      manualApprovalRequired: true,
      postAllowed: true,
      readAllowed: false,
    });
  });

  it("builds stable Telegram idempotency keys", () => {
    expect(buildTelegramIdempotencyKey(-1001, 11)).toBe("telegram:-1001:11");
  });

  it("wraps grammY outbound methods", async () => {
    const api = {
      copyMessage: vi.fn(async () => ({ message_id: 4 })),
      forwardMessage: vi.fn(async () => ({ message_id: 5 })),
      sendDocument: vi.fn(async () => ({ message_id: 3 })),
      sendMessage: vi.fn(async () => ({ message_id: 1 })),
      sendPhoto: vi.fn(async () => ({ message_id: 2 })),
    } as unknown as Api;
    const signal = new AbortController().signal;

    await telegramConnectorSendMessage({ api, chatId: "1", signal, text: "hello" });
    await telegramConnectorSendPhoto({ api, chatId: "1", photo: "photo-id", signal });
    await telegramConnectorSendDocument({ api, chatId: "1", document: "doc-id", signal });
    await telegramConnectorCopyMessage({ api, chatId: "1", fromChatId: "2", messageId: 10, signal });
    await telegramConnectorForwardMessage({ api, chatId: "1", fromChatId: "2", messageId: 10, signal });

    expect(api.sendMessage).toHaveBeenCalledWith("1", "hello", undefined, signal);
    expect(api.sendPhoto).toHaveBeenCalledWith("1", "photo-id", undefined, signal);
    expect(api.sendDocument).toHaveBeenCalledWith("1", "doc-id", undefined, signal);
    expect(api.copyMessage).toHaveBeenCalledWith("1", "2", 10, undefined, signal);
    expect(api.forwardMessage).toHaveBeenCalledWith("1", "2", 10, undefined, signal);
  });
});
