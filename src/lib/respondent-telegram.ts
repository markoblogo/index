import { randomBytes } from "node:crypto";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { syncIndexPositionDirectory } from "@/lib/position-directory-sync";

type TelegramTrigger = "manual" | "scheduled" | "smoke";

export type TelegramReminderLevel = "initial" | "reminder_18" | "final_19";

export type TelegramRecipient = {
  chatId: string;
  contactId: string;
  companyName: string;
  locale: "uk" | "en";
  respondentId: string;
};

export async function sendRespondentTelegramInitialRequest(params: {
  botToken: string;
  recipient: TelegramRecipient;
}) {
  return sendTelegramSurveyMessage({
    botToken: params.botToken,
    recipient: params.recipient,
    reminderLevel: "initial",
    trigger: "manual",
  });
}

export type TelegramSubmissionSummaryItem = {
  commodityId: string;
  price: number;
};

export type TelegramContactBinding = {
  chatId: string;
  contactId: string;
  locale: "uk" | "en";
  respondentId: string;
};

export async function sendRespondentTelegramNotifications({
  reminderLevel,
  respondentId,
  trigger,
}: {
  reminderLevel?: TelegramReminderLevel;
  respondentId?: string;
  trigger: TelegramTrigger;
}) {
  if (!hasDatabaseUrl()) {
    return { delivered: [], skippedReason: "database_not_configured" };
  }

  await syncIndexPositionDirectory(getActiveIndexConfig());

  const token = getTelegramBotToken();

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
      : await getTelegramRecipients(respondentId);
  const eligibleRecipients =
    trigger === "scheduled"
      ? await filterScheduledRecipients(recipients, level ?? "initial")
      : recipients;
  const delivered = await Promise.all(
    eligibleRecipients.map((recipient) =>
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

export async function sendRespondentTelegramSubmissionConfirmation({
  date,
  items,
  locale,
  respondentId,
}: {
  date: string;
  items: TelegramSubmissionSummaryItem[];
  locale: "uk" | "en";
  respondentId: string;
}) {
  if (!hasDatabaseUrl()) {
    return { delivered: [], skippedReason: "database_not_configured" };
  }

  await syncIndexPositionDirectory(getActiveIndexConfig());

  const token = getTelegramBotToken();

  if (!token) {
    return { delivered: [], skippedReason: "telegram_bot_token_missing" };
  }

  const respondent = await db.respondent.findUnique({
    include: {
      contacts: {
        where: {
          active: true,
          telegramChatId: { not: null },
        },
      },
    },
    where: { id: respondentId },
  });

  if (!respondent || respondent.contacts.length === 0) {
    return { delivered: [], skippedReason: "telegram_contact_missing" };
  }

  const commodityIds = items.map((item) => item.commodityId);
  const commodities = await db.commodity.findMany({
    where: { id: { in: commodityIds } },
  });
  const commodityById = new Map(commodities.map((commodity) => [commodity.id, commodity]));
  const summary = items.map((item) => {
    const commodity = commodityById.get(item.commodityId);

    return {
      name:
        locale === "uk"
          ? commodity?.nameUk ?? item.commodityId
          : commodity?.nameEn ?? commodity?.nameUk ?? item.commodityId,
      price: item.price,
    };
  });
  const delivered = await Promise.all(
    respondent.contacts.map((contact) =>
      sendTelegramConfirmationMessage({
        botToken: token,
        chatId: contact.telegramChatId ?? "",
        contactId: contact.id,
        date,
        locale,
        respondentId,
        summary,
      }),
    ),
  );

  return { delivered, skippedReason: null };
}

export async function createRespondentTelegramSurveyUrl({
  chatId,
  contactId,
  locale,
  respondentId,
}: TelegramContactBinding) {
  return createSurveyUrl({
    chatId,
    contactId,
    companyName: "",
    locale,
    respondentId,
  });
}

export function getRespondentTelegramBotToken() {
  return getTelegramBotToken();
}

export function getKyivReminderLevel(
  now = new Date(),
): TelegramReminderLevel | null {
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

  const schedule = getRespondentTelegramScheduleHours();

  if (hour === schedule.initial) return "initial";
  if (hour === schedule.firstReminder) return "reminder_18";
  if (hour === schedule.finalReminder) return "final_19";
  return null;
}

function getRespondentTelegramScheduleHours() {
  if (getActiveIndexConfig().id !== "spike-ua") {
    return {
      finalReminder: "18",
      firstReminder: "17",
      initial: "16",
    };
  }

  const [firstReminder = "18", finalReminder = "19"] = (
    process.env.SPIKE_RESPONDENT_TELEGRAM_REMINDER_HOURS ?? "18,19"
  )
    .split(",")
    .map((value) => value.trim().padStart(2, "0"))
    .filter(Boolean);

  return {
    finalReminder,
    firstReminder,
    initial: (process.env.SPIKE_RESPONDENT_TELEGRAM_INITIAL_HOUR ?? "17")
      .trim()
      .padStart(2, "0"),
  };
}

async function filterScheduledRecipients(
  recipients: TelegramRecipient[],
  reminderLevel: TelegramReminderLevel,
) {
  if (recipients.length === 0) {
    return recipients;
  }

  const respondentIds = [...new Set(recipients.map((recipient) => recipient.respondentId))];
  const tradeDate = dateToUtcDate(todayKyivDate());
  const kyivBounds = getKyivDateBounds();

  const [submittedToday, alreadyDelivered] = await Promise.all([
    db.priceSubmission.findMany({
      distinct: ["respondentId"],
      select: { respondentId: true },
      where: {
        respondentId: { in: respondentIds },
        source: "respondent",
        tradeDate,
      },
    }),
    db.respondentEmailDelivery.findMany({
      distinct: ["respondentId"],
      select: { respondentId: true },
      where: {
        respondentId: { in: respondentIds },
        sentAt: {
          gte: kyivBounds.start,
          lt: kyivBounds.end,
        },
        status: "sent",
        trigger: `telegram_scheduled_${reminderLevel}`,
      },
    }),
  ]);

  const submittedRespondentIds = new Set(
    submittedToday.map((entry) => entry.respondentId),
  );
  const alreadyDeliveredRespondentIds = new Set(
    alreadyDelivered.map((entry) => entry.respondentId),
  );

  return recipients.filter(
    (recipient) =>
      !submittedRespondentIds.has(recipient.respondentId) &&
      !alreadyDeliveredRespondentIds.has(recipient.respondentId),
  );
}

async function getTelegramRecipients(
  respondentId?: string,
): Promise<TelegramRecipient[]> {
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
      collectionMode: {
        in: ["self_service", "telegram_request"],
      },
      id: respondentId
        ? respondentId
        : { not: process.env.MN7R_INDEX_RESPONDENT_CODE ?? "MN7R_MONITOR" },
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
  const chatId = getTelegramSmokeChatId();

  if (!chatId) {
    return [];
  }

  const respondent = await db.respondent.findFirst({
    where: {
      active: true,
      collectionMode: {
        in: ["self_service", "telegram_request"],
      },
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
  if (!isLikelyValidChatId(recipient.chatId)) {
    await db.respondentEmailDelivery.create({
      data: {
        contactId: recipient.contactId,
        email: `telegram:${recipient.chatId}`,
        error:
          "Invalid Telegram chat id format. Set chat id as numeric via /start in bot.",
        providerId: null,
        respondentId: recipient.respondentId,
        status: "failed",
        subject: `Telegram ${reminderLevel}`,
        trigger: `telegram_${trigger}_${reminderLevel}`,
      },
    });

    return {
      chatId: recipient.chatId,
      error:
        "Invalid Telegram chat id format. Set chat id as numeric via /start in bot.",
      providerId: undefined,
      respondentId: recipient.respondentId,
      status: "failed",
    };
  }

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

async function sendTelegramConfirmationMessage({
  botToken,
  chatId,
  contactId,
  date,
  locale,
  respondentId,
  summary,
}: {
  botToken: string;
  chatId: string;
  contactId: string;
  date: string;
  locale: "uk" | "en";
  respondentId: string;
  summary: Array<{ name: string; price: number }>;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: "HTML",
        text: buildTelegramSubmissionConfirmationText({ date, locale, summary }),
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
      contactId,
      email: `telegram:${chatId}`,
      error: status === "failed" ? payload.description ?? response.statusText : null,
      providerId: payload.result?.message_id
        ? String(payload.result.message_id)
        : null,
      respondentId,
      status,
      subject: "Telegram submission confirmation",
      trigger: "telegram_submission_confirmation",
    },
  });

  return {
    chatId,
    error: status === "failed" ? payload.description ?? response.statusText : undefined,
    providerId: payload.result?.message_id,
    respondentId,
    status,
  };
}

export function buildTelegramSubmissionConfirmationText({
  date,
  locale,
  summary,
}: {
  date: string;
  locale: "uk" | "en";
  summary: Array<{ name: string; price: number }>;
}) {
  const indexName = getActiveIndexConfig().name;
  const values = summary
    .map((item) => `• ${escapeTelegramHtml(item.name)} — ${formatTelegramPrice(item.price)} USD/t`)
    .join("\n");

  if (locale === "en") {
    return [
      `Thank you. Your ${indexName} data has been accepted by the service and recorded in the daily collection.`,
      "",
      `Date: ${escapeTelegramHtml(date)}`,
      "",
      "Submitted values:",
      values,
      "",
      "If needed, you can return to the survey form and update the values before the daily calculation is finalized.",
    ].join("\n");
  }

  return [
    `Дякуємо. Ваші дані для ${indexName} прийнято сервісом і зафіксовано у щоденному зборі.`,
    "",
    `Дата: ${escapeTelegramHtml(date)}`,
    "",
    "Подані значення:",
    values,
    "",
    "За потреби ви можете повернутися до анкети та відредагувати значення до фінального розрахунку дня.",
  ].join("\n");
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

  return absoluteUrl(
    `/respondent/access/${token}?locale=${recipient.locale}&channel=telegram&inTelegram=1`,
  );
}

function isLikelyValidChatId(value: string) {
  return /^-?\d+$/.test(value);
}

function getTelegramText(
  recipient: TelegramRecipient,
  reminderLevel: TelegramReminderLevel,
) {
  const indexName = getActiveIndexConfig().name;

  if (recipient.locale === "en") {
    if (reminderLevel === "reminder_18") {
      return `Reminder: please submit today's ${indexName} prices for ${recipient.companyName}.`;
    }
    if (reminderLevel === "final_19") {
      return `Final reminder: please submit today's prices now, otherwise they may not be included in today's index calculation.`;
    }
    return `Please submit today's ${indexName} prices for ${recipient.companyName}.`;
  }

  if (reminderLevel === "reminder_18") {
    return `Нагадуємо: будь ласка, внесіть сьогоднішні ціни для ${indexName} (${recipient.companyName}).`;
  }
  if (reminderLevel === "final_19") {
    return "Фінальне нагадування: внесіть ціни зараз, інакше вони можуть не потрапити до сьогоднішнього розрахунку індексу.";
  }
  return `Будь ласка, внесіть сьогоднішні ціни для ${indexName} (${recipient.companyName}).`;
}

function getButtonLabel(locale: "uk" | "en") {
  return locale === "en" ? "Submit prices" : "Внести ціни";
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatTelegramPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function todayKyivDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function getKyivDateBounds(date = new Date()) {
  const dateKey = todayKyivDate(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    end: zonedDateTimeToUtc(
      `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`,
      "Europe/Kyiv",
    ),
    start: zonedDateTimeToUtc(dateKey, "Europe/Kyiv"),
  };
}

function zonedDateTimeToUtc(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const candidate = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(candidate, timeZone);

  return new Date(utcGuess.getTime() - correctedOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour === 24 ? 0 : values.hour,
      values.minute,
      values.second,
    ) - date.getTime()
  );
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

function getTelegramBotToken() {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id === "uga-ua") {
    return process.env.UGA_TELEGRAM_BOT_TOKEN ?? process.env.INDEX_TELEGRAM_BOT_TOKEN;
  }

  return (
    process.env.SPIKE_TELEGRAM_BOT_TOKEN ??
    process.env.INDEX_TELEGRAM_BOT_TOKEN
  );
}

function getTelegramSmokeChatId() {
  const activeIndex = getActiveIndexConfig();

  if (activeIndex.id === "uga-ua") {
    return (
      process.env.UGA_TELEGRAM_ADMIN_CHAT_ID ??
      process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
    );
  }

  return (
    process.env.SPIKE_TELEGRAM_SMOKE_CHAT_ID ??
    process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID
  );
}
