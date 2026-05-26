import { randomBytes } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";

type TelegramTrigger = "manual" | "scheduled" | "smoke";

type TelegramReminderLevel = "initial" | "reminder_17" | "final_18";

type TelegramRecipient = {
  chatId: string;
  contactId: string;
  companyName: string;
  locale: "uk" | "en";
  respondentId: string;
};

export async function sendRespondentTelegramNotifications({
  reminderLevel,
  trigger,
}: {
  reminderLevel?: TelegramReminderLevel;
  trigger: TelegramTrigger;
}) {
  if (!hasDatabaseUrl()) {
    return { delivered: [], skippedReason: "database_not_configured" };
  }

  const token = process.env.SPIKE_TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { delivered: [], skippedReason: "telegram_bot_token_missing" };
  }

  const level = reminderLevel ?? getKyivReminderLevel();

  if (trigger === "scheduled" && !level) {
    return { delivered: [], skippedReason: "outside_telegram_window" };
  }

  const recipients =
    trigger === "smoke"
      ? await getSmokeRecipients()
      : await getTelegramRecipients();
  const delivered = await Promise.all(
    recipients.map((recipient) =>
      sendTelegramSurveyMessage({
        botToken: token,
        recipient,
        reminderLevel: level ?? "initial",
        trigger,
      }),
    ),
  );

  return { delivered, skippedReason: null };
}

function getKyivReminderLevel(now = new Date()): TelegramReminderLevel | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Kyiv",
    weekday: "short",
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;

  if (weekday === "Sat" || weekday === "Sun") {
    return null;
  }

  if (hour === "16") return "initial";
  if (hour === "17") return "reminder_17";
  if (hour === "18") return "final_18";
  return null;
}

async function getTelegramRecipients(): Promise<TelegramRecipient[]> {
  const respondents = await db.respondent.findMany({
    include: {
      contacts: {
        where: {
          active: true,
          telegramChatId: { not: null },
        },
      },
    },
    where: {
      active: true,
      collectionMode: "self_service",
      id: { not: process.env.MN7R_INDEX_RESPONDENT_CODE ?? "MN7R_MONITOR" },
      status: "active",
    },
  });

  return respondents.flatMap((respondent) =>
    respondent.contacts
      .filter((contact) => contact.telegramChatId)
      .map((contact) => ({
        chatId: contact.telegramChatId ?? "",
        contactId: contact.id,
        companyName: respondent.legalName,
        locale: contact.preferredLocale === "en" ? "en" : "uk",
        respondentId: respondent.id,
      })),
  );
}

async function getSmokeRecipients(): Promise<TelegramRecipient[]> {
  const chatId = process.env.SPIKE_TELEGRAM_SMOKE_CHAT_ID;

  if (!chatId) {
    return [];
  }

  const respondent = await db.respondent.findFirst({
    where: {
      active: true,
      collectionMode: "self_service",
      id: { not: process.env.MN7R_INDEX_RESPONDENT_CODE ?? "MN7R_MONITOR" },
      status: "active",
    },
  });

  if (!respondent) {
    return [];
  }

  return [
    {
      chatId,
      contactId: "telegram-smoke",
      companyName: respondent.legalName,
      locale: "uk",
      respondentId: respondent.id,
    },
  ];
}

async function sendTelegramSurveyMessage({
  botToken,
  recipient,
  reminderLevel,
  trigger,
}: {
  botToken: string;
  recipient: TelegramRecipient;
  reminderLevel: TelegramReminderLevel;
  trigger: TelegramTrigger;
}) {
  const surveyUrl = await createSurveyUrl(recipient);
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: recipient.chatId,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: getButtonLabel(recipient.locale),
                web_app: { url: surveyUrl },
              },
            ],
          ],
        },
        text: getTelegramText(recipient, reminderLevel),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    description?: string;
    ok?: boolean;
    result?: { message_id?: number };
  };
  const status = response.ok && payload.ok ? "sent" : "failed";

  await db.respondentEmailDelivery.create({
    data: {
      contactId: recipient.contactId,
      email: `telegram:${recipient.chatId}`,
      error: status === "failed" ? payload.description ?? response.statusText : null,
      providerId: payload.result?.message_id
        ? String(payload.result.message_id)
        : null,
      respondentId: recipient.respondentId,
      status,
      subject: `Telegram ${reminderLevel}`,
      trigger: `telegram_${trigger}_${reminderLevel}`,
    },
  });

  return {
    chatId: recipient.chatId,
    error: status === "failed" ? payload.description ?? response.statusText : undefined,
    providerId: payload.result?.message_id,
    respondentId: recipient.respondentId,
    status,
  };
}

async function createSurveyUrl(recipient: TelegramRecipient) {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8);

  await db.respondentSurveyToken.create({
    data: {
      contactId: recipient.contactId === "telegram-smoke" ? null : recipient.contactId,
      email: `telegram:${recipient.chatId}`,
      expiresAt,
      respondentId: recipient.respondentId,
      token,
    },
  });

  return absoluteUrl(`/respondent/access/${token}?locale=${recipient.locale}`);
}

function getTelegramText(
  recipient: TelegramRecipient,
  reminderLevel: TelegramReminderLevel,
) {
  if (recipient.locale === "en") {
    if (reminderLevel === "reminder_17") {
      return `Reminder: please submit today's SPIKE SPOT INDEX prices for ${recipient.companyName}.`;
    }
    if (reminderLevel === "final_18") {
      return `Final reminder: please submit today's prices now, otherwise they may not be included in today's index calculation.`;
    }
    return `Please submit today's SPIKE SPOT INDEX prices for ${recipient.companyName}.`;
  }

  if (reminderLevel === "reminder_17") {
    return `Нагадуємо: будь ласка, внесіть сьогоднішні ціни для SPIKE SPOT INDEX (${recipient.companyName}).`;
  }
  if (reminderLevel === "final_18") {
    return "Фінальне нагадування: внесіть ціни зараз, інакше вони можуть не потрапити до сьогоднішнього розрахунку індексу.";
  }
  return `Будь ласка, внесіть сьогоднішні ціни для SPIKE SPOT INDEX (${recipient.companyName}).`;
}

function getButtonLabel(locale: "uk" | "en") {
  return locale === "en" ? "Submit prices" : "Внести ціни";
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
