import { Prisma } from "@prisma/client";
import { db, hasDatabaseUrl } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/constants";
import {
  createRespondentTelegramSurveyUrl,
  getRespondentTelegramBotToken,
} from "@/lib/respondent-telegram";

type OnboardingContact = {
  email: string | null;
  id: string;
  name: string;
  preferredLocale: "uk" | "en";
  telegramChatId: string | null;
  telegramUsername: string | null;
};

type OnboardingRespondent = {
  id: string;
  legalName: string;
};

type OnboardingAuth = {
  loginEmail: string;
  temporaryPassword: string | null;
};

export async function sendRespondentOnboarding({
  auth,
  contact,
  respondent,
}: {
  auth: OnboardingAuth;
  contact: OnboardingContact;
  respondent: OnboardingRespondent;
}) {
  if (!hasDatabaseUrl()) {
    return {
      emailStatus: contact.email ? "mock_skipped" : "no_email",
      telegramStatus: "pending_start",
    };
  }

  const emailStatus = contact.email
    ? await sendRespondentOnboardingEmail({ auth, contact, respondent })
    : "no_email";
  const telegramStatus = contact.telegramChatId
    ? await sendRespondentLinkedTelegramWelcome({ auth, contact, respondent })
    : "pending_start";

  return { emailStatus, telegramStatus };
}

export async function handleRespondentTelegramStart(update: unknown) {
  if (!hasDatabaseUrl()) {
    return { ok: true, skippedReason: "database_not_configured" };
  }

  const message = extractTelegramMessage(update);

  if (!message || !message.text?.startsWith("/start")) {
    return { ok: true, skippedReason: "ignored_non_start" };
  }

  const chatId = String(message.chat.id);
  const username = normalizeTelegramUsername(message.from?.username ?? null);
  const token = getRespondentTelegramBotToken();

  if (!token) {
    return { ok: true, skippedReason: "telegram_bot_token_missing" };
  }

  const contact = await db.respondentContact.findFirst({
    include: {
      respondent: {
        include: {
          authAccount: true,
        },
      },
    },
    where: {
      active: true,
      respondent: {
        active: true,
        status: "active",
      },
      OR: [
        { telegramChatId: chatId },
        username ? { telegramUsername: username } : undefined,
      ].filter(Boolean) as Array<
        | { telegramChatId: string }
        | { telegramUsername: string }
      >,
    },
  });

  if (!contact) {
    await sendTelegramText({
      chatId,
      text:
        "Ваш Telegram ще не прив'язаний до респондента SPIKE SPOT INDEX. Зверніться до менеджера проєкту, щоб завершити підключення.",
      token,
    });
    return { ok: true, skippedReason: "contact_not_found" };
  }

  if (contact.respondent.collectionMode === "manual_outreach") {
    await sendTelegramText({
      chatId,
      text:
        "Для цієї компанії щоденний збір даних у Telegram ще не увімкнений. Зверніться до менеджера, щоб змінити режим подання.",
      token,
    });
    return { ok: true, skippedReason: "manual_outreach_contact" };
  }

  const updatedContact = await db.respondentContact.update({
    where: { id: contact.id },
    data: {
      telegramChatId: chatId,
      telegramUsername: username ?? contact.telegramUsername,
    },
    include: {
      respondent: {
        include: {
          authAccount: true,
        },
      },
    },
  });

  const surveyUrl = await createRespondentTelegramSurveyUrl({
    chatId,
    contactId: updatedContact.id,
    locale: updatedContact.preferredLocale === "en" ? "en" : "uk",
    respondentId: updatedContact.respondentId,
  });
  const welcomeText = buildTelegramStartText({
    companyName: updatedContact.respondent.legalName,
    locale: updatedContact.preferredLocale === "en" ? "en" : "uk",
  });
  const sendResult = await sendTelegramText({
    buttonLabel:
      updatedContact.preferredLocale === "en" ? "Open price form" : "Відкрити форму цін",
    chatId,
    log: {
      contactId: updatedContact.id,
      respondentId: updatedContact.respondentId,
      subject: "Telegram respondent start",
      trigger: "telegram_bot_start",
    },
    text: welcomeText,
    token,
    webAppUrl: surveyUrl,
  });

  await db.auditLog.create({
    data: {
      action: "respondent.telegram_start_linked",
      afterJson: {
        chatId,
        contactId: updatedContact.id,
        messageId: sendResult.providerId ?? null,
        username: username ?? null,
      },
      beforeJson: Prisma.JsonNull,
      entityId: updatedContact.respondentId,
      entityType: "Respondent",
      summary: `Linked Telegram start for ${updatedContact.respondent.legalName}.`,
    },
  });

  return { ok: true, skippedReason: null };
}

async function sendRespondentOnboardingEmail({
  auth,
  contact,
  respondent,
}: {
  auth: OnboardingAuth;
  contact: OnboardingContact;
  respondent: OnboardingRespondent;
}) {
  if (!contact.email) {
    return "no_email";
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return "skipped_no_email_provider";
  }

  const message = buildOnboardingEmailMessage({
    companyName: respondent.legalName,
    locale: contact.preferredLocale,
    loginEmail: auth.loginEmail,
    recipientName: contact.name,
    temporaryPassword: auth.temporaryPassword ?? "",
  });
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: getOnboardingSender(),
      html: message.html,
      reply_to: getOnboardingReplyTo(),
      subject: message.subject,
      text: message.text,
      to: [contact.email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };
  const status = response.ok ? "sent" : "failed";

  await db.respondentEmailDelivery.create({
    data: {
      contactId: contact.id,
      email: contact.email,
      error: response.ok ? null : payload.message ?? payload.name ?? response.statusText,
      providerId: payload.id ?? null,
      respondentId: respondent.id,
      status,
      subject: message.subject,
      trigger: "respondent_onboarding_email",
    },
  });

  return status;
}

async function sendRespondentLinkedTelegramWelcome({
  auth,
  contact,
  respondent,
}: {
  auth: OnboardingAuth;
  contact: OnboardingContact;
  respondent: OnboardingRespondent;
}) {
  const token = getRespondentTelegramBotToken();

  if (!token || !contact.telegramChatId) {
    return "pending_start";
  }

  const text = buildLinkedTelegramWelcomeText({
    locale: contact.preferredLocale,
    loginEmail: auth.loginEmail,
    temporaryPassword: auth.temporaryPassword ?? "",
  });

  const result = await sendTelegramText({
    buttonLabel: contact.preferredLocale === "en" ? "Open login" : "Відкрити вхід",
    chatId: contact.telegramChatId,
    log: {
      contactId: contact.id,
      respondentId: respondent.id,
      subject: "Telegram respondent onboarding",
      trigger: "telegram_onboarding_linked",
    },
    text,
    token,
    url: `${getSiteUrl()}/login`,
  });

  return result.status;
}

function buildOnboardingEmailMessage({
  companyName,
  locale,
  loginEmail,
  recipientName,
  temporaryPassword,
}: {
  companyName: string;
  locale: "uk" | "en";
  loginEmail: string;
  recipientName: string;
  temporaryPassword: string;
}) {
  const loginUrl = `${getSiteUrl()}/login`;
  const botHandle = getTelegramBotHandle();

  if (locale === "en") {
    const text = [
      `Hello ${recipientName},`,
      "",
      `Your ${SITE_CONFIG.name} respondent access for ${companyName} is ready.`,
      "",
      `1. Open ${loginUrl}`,
      `2. Sign in with login ${loginEmail}`,
      `3. Use temporary password ${temporaryPassword}`,
      "4. Set your permanent password",
      "",
      `Then open ${botHandle} in Telegram, send /start and complete your first submission.`,
      "From the next workday you will receive the daily Telegram request automatically.",
    ].join("\n");

    return {
      html: renderParagraphs(text),
      subject: `${SITE_CONFIG.name} respondent access`,
      text,
    };
  }

  const text = [
    `Вітаємо, ${recipientName}.`,
    "",
    `Ваш доступ респондента до ${SITE_CONFIG.name} для ${companyName} готовий.`,
    "",
    `1. Перейдіть на ${loginUrl}`,
    `2. Увійдіть з логіном ${loginEmail}`,
    `3. Використайте тимчасовий пароль ${temporaryPassword}`,
    "4. Встановіть свій постійний пароль",
    "",
    `Після цього відкрийте в Telegram ${botHandle}, натисніть /start і зробіть перше заповнення форми.`,
    "З наступного робочого дня бот надсилатиме вам щоденний запит автоматично.",
  ].join("\n");

  return {
    html: renderParagraphs(text),
    subject: `Доступ респондента до ${SITE_CONFIG.name}`,
    text,
  };
}

function buildLinkedTelegramWelcomeText({
  locale,
  loginEmail,
  temporaryPassword,
}: {
  locale: "uk" | "en";
  loginEmail: string;
  temporaryPassword: string;
}) {
  if (locale === "en") {
    return [
      `${SITE_CONFIG.name}: your respondent account is ready.`,
      "",
      `Login: ${loginEmail}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "Open the site, sign in, set your permanent password, then use /start here for your first submission.",
    ].join("\n");
  }

  return [
    `${SITE_CONFIG.name}: ваш доступ респондента готовий.`,
    "",
    `Логін: ${loginEmail}`,
    `Тимчасовий пароль: ${temporaryPassword}`,
    "",
    "Зайдіть на сайт, встановіть свій постійний пароль, а потім натисніть /start тут для першого заповнення.",
  ].join("\n");
}

function buildTelegramStartText({
  companyName,
  locale,
}: {
  companyName: string;
  locale: "uk" | "en";
}) {
  if (locale === "en") {
    return [
      `You are connected to ${SITE_CONFIG.name} for ${companyName}.`,
      "",
      "Open your personal form and submit the first daily prices. Starting next workday, Telegram reminders will arrive here automatically.",
    ].join("\n");
  }

  return [
    `Вас підключено до ${SITE_CONFIG.name} для ${companyName}.`,
    "",
    "Відкрийте персональну форму і зробіть перше щоденне подання цін. Починаючи з наступного робочого дня, нагадування в Telegram приходитимуть сюди автоматично.",
  ].join("\n");
}

async function sendTelegramText({
  buttonLabel,
  chatId,
  log,
  text,
  token,
  url,
  webAppUrl,
}: {
  buttonLabel?: string;
  chatId: string;
  log?: {
    contactId?: string;
    respondentId?: string;
    subject: string;
    trigger: string;
  };
  text: string;
  token: string;
  url?: string;
  webAppUrl?: string;
}) {
  const button =
    webAppUrl && buttonLabel
      ? {
          text: buttonLabel,
          web_app: { url: webAppUrl },
        }
      : url && buttonLabel
        ? {
            text: buttonLabel,
            url,
          }
        : null;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      reply_markup: button
        ? {
            inline_keyboard: [[button]],
          }
        : undefined,
      text,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    description?: string;
    ok?: boolean;
    result?: { message_id?: number };
  };
  const status = response.ok && payload.ok ? "sent" : "failed";

  if (log?.respondentId) {
    await db.respondentEmailDelivery.create({
      data: {
        contactId: log.contactId ?? null,
        email: `telegram:${chatId}`,
        error: status === "failed" ? payload.description ?? response.statusText : null,
        providerId: payload.result?.message_id
          ? String(payload.result.message_id)
          : null,
        respondentId: log.respondentId,
        status,
        subject: log.subject,
        trigger: log.trigger,
      },
    });
  }

  return {
    providerId: payload.result?.message_id
      ? String(payload.result.message_id)
      : undefined,
    status,
  };
}

function extractTelegramMessage(update: unknown) {
  if (!update || typeof update !== "object") {
    return null;
  }

  const record = update as {
    edited_message?: TelegramInboundMessage;
    message?: TelegramInboundMessage;
  };

  return record.message ?? record.edited_message ?? null;
}

type TelegramInboundMessage = {
  chat: { id: number | string };
  from?: { username?: string };
  text?: string;
};

function getOnboardingSender() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_ADMIN_INVITE_SENDER ?? "SPIKE SPOT INDEX <onboarding@resend.dev>"
    : "UGA Index <onboarding@resend.dev>";
}

function getOnboardingReplyTo() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_ADMIN_INVITE_REPLY_TO || "info@spike.broker"
    : "inbox@uga.ua";
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getTelegramBotHandle() {
  return SITE_CONFIG.tenantId === "spike-ua" ? "@spike_spot_bot" : "@uga_index_bot";
}

function normalizeTelegramUsername(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/^@+/, "").toLowerCase();
  return trimmed || null;
}

function renderParagraphs(value: string) {
  return value
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
