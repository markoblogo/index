import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, hasDatabaseUrl } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { getActiveIndexConfig } from "@/lib/index-platform";
import {
  createRespondentTelegramSurveyUrl,
  getRespondentTelegramBotToken,
  sendRespondentTelegramInitialRequest,
} from "@/lib/respondent-telegram";

type OnboardingContact = {
  email: string | null;
  id: string;
  name: string;
  preferredLocale: "uk" | "en";
  telegramChatId: string | null;
  telegramUsername: string | null;
};

const ONBOARDING_EMAIL_TIMEOUT_MS = 15_000;
const TELEGRAM_DELIVERY_TIMEOUT_MS = 15_000;

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

  const onboardingLocale =
    getActiveIndexConfig().id === "spike-ua" ? "uk" : contact.preferredLocale;

  const emailStatus = contact.email
    ? await sendRespondentOnboardingEmail({
        auth,
        contact: {
          ...contact,
          preferredLocale: onboardingLocale,
        },
        respondent,
      })
    : "no_email";
  const telegramStatus = contact.telegramChatId
    ? await sendRespondentLinkedTelegramWelcome({
        auth,
        contact: {
          ...contact,
          preferredLocale: onboardingLocale,
        },
        respondent,
      })
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
  const startPayload = extractStartPayload(message.text);
  const token = getRespondentTelegramBotToken();

  if (!token) {
    return { ok: true, skippedReason: "telegram_bot_token_missing" };
  }

  const tokenContact = startPayload
    ? await resolveRespondentTelegramStartToken({
        chatId,
        token: startPayload,
        username,
      })
    : null;
  const contact = startPayload
    ? tokenContact
    : await db.respondentContact.findFirst({
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
      text: buildTelegramUnmatchedText(),
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

  const wasUnlinked = !contact.telegramChatId;
  const alreadyLinkedToSameChat = contact.telegramChatId === chatId;

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
  const authForTelegramStart = updatedContact.respondent.authAccount
    ? {
        loginEmail: updatedContact.respondent.authAccount.loginEmail,
        passwordSetupStatus: updatedContact.respondent.authAccount.passwordSetupStatus,
        temporaryPassword: updatedContact.respondent.authAccount.temporaryPassword,
      }
    : null;
  const credentials = buildTelegramTemporaryCredentialsBlock(
    authForTelegramStart,
    updatedContact.preferredLocale === "en" ? "en" : "uk",
  );
  const welcomeText = alreadyLinkedToSameChat
    ? buildSpikeTelegramAlreadyLinkedText({
        companyName: updatedContact.respondent.legalName,
        credentials,
      })
    : buildTelegramStartText({
        auth: authForTelegramStart,
        companyName: updatedContact.respondent.legalName,
        locale: updatedContact.preferredLocale === "en" ? "en" : "uk",
      });
  const sendResult = await sendTelegramText({
    buttonLabel: "Відкрити форму цін",
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

  if (wasUnlinked) {
    await sendRespondentTelegramInitialRequest({
      botToken: token,
      recipient: {
        chatId,
        contactId: updatedContact.id,
        companyName: updatedContact.respondent.legalName,
        locale: updatedContact.preferredLocale === "en" ? "en" : "uk",
        respondentId: updatedContact.respondentId,
      },
    });
  }

  await db.auditLog.create({
    data: {
      action: "respondent.telegram_start_linked",
      afterJson: {
        chatId,
        contactId: updatedContact.id,
        messageId: sendResult.providerId ?? null,
        username: username ?? null,
        viaToken: Boolean(tokenContact),
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
    await db.respondentEmailDelivery.create({
      data: {
        contactId: contact.id,
        email: contact.email,
        error: "RESEND_API_KEY is not configured",
        providerId: null,
        respondentId: respondent.id,
        status: "skipped_no_email_provider",
        subject:
          SITE_CONFIG.tenantId === "spike-ua"
            ? "Ваш доступ респондента до SPIKE SPOT INDEX"
            : `${SITE_CONFIG.name} respondent access`,
        trigger: "respondent_onboarding_email",
      },
    });
    return "skipped_no_email_provider";
  }

  const telegramLink = await createRespondentTelegramLinkToken({
    contactId: contact.id,
    respondentId: respondent.id,
  });
  const message = buildOnboardingEmailMessage({
    companyName: respondent.legalName,
    locale: contact.preferredLocale,
    loginEmail: auth.loginEmail,
    recipientName: contact.name,
    telegramDeepLink: telegramLink.deepLink,
    temporaryPassword: auth.temporaryPassword ?? "",
  });
  const response = await fetchWithTimeout("https://api.resend.com/emails", {
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
  }, ONBOARDING_EMAIL_TIMEOUT_MS);
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
  await db.auditLog.create({
    data: {
      action:
        status === "sent"
          ? "respondent.onboarding_email_sent"
          : "respondent.onboarding_email_failed",
      afterJson: {
        contactId: contact.id,
        email: contact.email,
        providerId: payload.id ?? null,
        status,
      },
      beforeJson: Prisma.JsonNull,
      entityId: respondent.id,
      entityType: "Respondent",
      summary:
        status === "sent"
          ? `Sent respondent onboarding email for ${respondent.legalName}.`
          : `Failed respondent onboarding email for ${respondent.legalName}.`,
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

  const surveyUrl = await createRespondentTelegramSurveyUrl({
    chatId: contact.telegramChatId,
    contactId: contact.id,
    locale: contact.preferredLocale === "en" ? "en" : "uk",
    respondentId: respondent.id,
  });
  const text = buildTelegramStartText({
    auth: auth.temporaryPassword
      ? {
          loginEmail: auth.loginEmail,
          passwordSetupStatus: "temporary",
          temporaryPassword: auth.temporaryPassword,
        }
      : null,
    companyName: respondent.legalName,
    locale: contact.preferredLocale,
  });
  const result = await sendTelegramText({
    buttonLabel: "Відкрити форму цін",
    chatId: contact.telegramChatId,
    log: {
      contactId: contact.id,
      respondentId: respondent.id,
      subject: "Telegram respondent onboarding",
      trigger: "telegram_onboarding_linked",
    },
    text,
    token,
    webAppUrl: surveyUrl,
  });

  return result.status;
}

function buildOnboardingEmailMessage({
  companyName,
  locale,
  loginEmail,
  recipientName,
  telegramDeepLink,
  temporaryPassword,
}: {
  companyName: string;
  locale: "uk" | "en";
  loginEmail: string;
  recipientName: string;
  telegramDeepLink?: string;
  temporaryPassword: string;
}) {
  const loginUrl = `${getSiteUrl()}/login`;
  const botHandle = getTelegramBotHandle();

  if (SITE_CONFIG.tenantId === "spike-ua") {
    return buildSpikeRespondentOnboardingEmailMessage({
      botHandle,
      companyName,
      loginEmail,
      loginUrl,
      publicProjectUrl: getSpikePublicProjectUrl(),
      recipientName,
      telegramDeepLink: telegramDeepLink ?? getTelegramBotUrl(),
      temporaryPassword,
    });
  }

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

function buildTelegramStartText({
  auth,
  companyName,
  locale,
}: {
  auth?: {
    loginEmail: string;
    passwordSetupStatus: string;
    temporaryPassword: string | null;
  } | null;
  companyName: string;
  locale: "uk" | "en";
}) {
  const credentials = buildTelegramTemporaryCredentialsBlock(auth, locale);
  if (SITE_CONFIG.tenantId === "spike-ua") {
    return buildSpikeTelegramStartText({ companyName, credentials });
  }

  if (locale === "en") {
    return [
      `You are connected to ${SITE_CONFIG.name} for ${companyName}.`,
      "",
      ...credentials,
      "Open your personal form and submit the first daily prices. Starting next workday, Telegram reminders will arrive here automatically.",
    ].join("\n");
  }

  return [
    `Вас підключено до ${SITE_CONFIG.name} для ${companyName}.`,
    "",
    ...credentials,
    "Відкрийте персональну форму і зробіть перше щоденне подання цін. Починаючи з наступного робочого дня, нагадування в Telegram приходитимуть сюди автоматично.",
  ].join("\n");
}

function buildTelegramTemporaryCredentialsBlock(
  auth: {
    loginEmail: string;
    passwordSetupStatus: string;
    temporaryPassword: string | null;
  } | null | undefined,
  locale: "uk" | "en",
) {
  if (
    !auth ||
    auth.passwordSetupStatus !== "temporary" ||
    !auth.temporaryPassword
  ) {
    return [];
  }

  if (locale === "en") {
    return [
      "Website access:",
      `Login: ${auth.loginEmail}`,
      `Temporary password: ${auth.temporaryPassword}`,
      "",
      "After first sign-in, set a permanent password.",
      "",
    ];
  }

  return [
    "Дані для входу на сайт:",
    `Логін: ${auth.loginEmail}`,
    `Тимчасовий пароль: ${auth.temporaryPassword}`,
    "",
    "Після першого входу встановіть постійний пароль.",
    "",
  ];
}

export function buildSpikeRespondentOnboardingEmailMessage({
  botHandle,
  companyName,
  loginEmail,
  loginUrl,
  publicProjectUrl,
  recipientName,
  telegramDeepLink,
  temporaryPassword,
}: {
  botHandle: string;
  companyName: string;
  loginEmail: string;
  loginUrl: string;
  publicProjectUrl: string;
  recipientName: string;
  telegramDeepLink: string;
  temporaryPassword: string;
}) {
  const subject = "Ваш доступ респондента до SPIKE SPOT INDEX";
  const text = [
    `Вітаємо, ${recipientName}.`,
    "",
    "Дякуємо за готовність долучитися до SPIKE SPOT INDEX — незалежного бенчмарку спотових цін аграрного ринку України.",
    "",
    `Для компанії ${companyName} створено доступ респондента.`,
    "",
    "Дані для входу:",
    `Сайт: ${loginUrl}`,
    `Логін: ${loginEmail}`,
    `Тимчасовий пароль: ${temporaryPassword}`,
    "",
    "Що потрібно зробити:",
    "1. Увійти на сайт і встановити постійний пароль.",
    `2. Підключити Telegram-бота: ${botHandle}`,
    "3. Натиснути Start або скористатися персональним посиланням з цього листа.",
    "4. З понеділка по п’ятницю після 17:00 бот надсилатиме коротку форму для внесення цін.",
    "5. Щодня витрачати близько 1 хвилини, щоб вказати своє бачення справедливої спотової ціни.",
    "",
    "Ваш внесок допомагає формувати прозорий ринковий бенчмарк, який стане основою для розвитку інструментів управління ціновими ризиками та підвищить прозорість ринку для всіх його учасників.",
    "",
    "Детальніше про проєкт:",
    publicProjectUrl,
    "",
    "Якщо виникнуть питання, просто відповідайте на цей лист.",
    "",
    "Команда SPIKE SPOT INDEX",
    "https://spike.1d3x.com/",
  ].join("\n");
  const html = [
    `<p>Вітаємо, ${escapeHtml(recipientName)}.</p>`,
    "<p>Дякуємо за готовність долучитися до <strong>SPIKE SPOT INDEX</strong> — незалежного бенчмарку спотових цін аграрного ринку України.</p>",
    `<p>Для компанії <strong>${escapeHtml(companyName)}</strong> створено доступ респондента.</p>`,
    '<div style="border:1px solid #d7dde8;border-radius:12px;padding:16px;margin:18px 0;background:#f7f9fc">',
    "<p><strong>Дані для входу</strong></p>",
    `<p>Сайт: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a><br />`,
    `Логін: <strong>${escapeHtml(loginEmail)}</strong><br />`,
    `Тимчасовий пароль: <strong>${escapeHtml(temporaryPassword)}</strong></p>`,
    "</div>",
    "<p><strong>Що потрібно зробити:</strong></p>",
    "<ol>",
    "<li>Увійти на сайт і встановити постійний пароль.</li>",
    `<li>Підключити Telegram-бота: ${escapeHtml(botHandle)}.</li>`,
    "<li>Натиснути Start або скористатися персональним посиланням з цього листа.</li>",
    "<li>З понеділка по п’ятницю після 17:00 бот надсилатиме коротку форму для внесення цін.</li>",
    "<li>Щодня витрачати близько 1 хвилини, щоб вказати своє бачення справедливої спотової ціни.</li>",
    "</ol>",
    '<p style="margin:20px 0">',
    `<a href="${escapeHtml(loginUrl)}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 16px;border-radius:10px;background:#111827;color:#ffffff;text-decoration:none">Увійти на сайт</a>`,
    `<a href="${escapeHtml(telegramDeepLink)}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 16px;border-radius:10px;background:#33ff33;color:#06110a;text-decoration:none">Підключити Telegram</a>`,
    "</p>",
    "<p>Ваш внесок допомагає формувати прозорий ринковий бенчмарк, який стане основою для розвитку інструментів управління ціновими ризиками та підвищить прозорість ринку для всіх його учасників.</p>",
    `<p>Детальніше про проєкт:<br /><a href="${escapeHtml(publicProjectUrl)}">${escapeHtml(publicProjectUrl)}</a></p>`,
    "<p>Якщо виникнуть питання, просто відповідайте на цей лист.</p>",
    '<p>Команда SPIKE SPOT INDEX<br /><a href="https://spike.1d3x.com/">https://spike.1d3x.com/</a></p>',
  ].join("");

  return { html, subject, text };
}

export function buildSpikeTelegramStartText({
  companyName,
  credentials = [],
}: {
  companyName: string;
  credentials?: string[];
}) {
  return [
    `Вітаємо! Telegram підключено до SPIKE SPOT INDEX для ${companyName}.`,
    "",
    "SPIKE SPOT INDEX — незалежний бенчмарк спотових цін аграрного ринку України.",
    "",
    ...credentials,
    "Що буде далі:",
    "✅ З понеділка по п’ятницю після 17:00 бот надсилатиме персональну форму для внесення цін.",
    "✅ Заповнення займає близько 1 хвилини.",
    "✅ Вкажіть своє бачення справедливої спотової ціни за доступними позиціями.",
    "✅ За потреби ви зможете повернутися до форми та оновити дані до фінального розрахунку дня.",
    "",
    "Ваш внесок допомагає формувати прозорий ринковий бенчмарк і підвищувати прозорість аграрного ринку України.",
    "",
    "Натисніть кнопку нижче, щоб відкрити першу форму.",
    "",
    "Детальніше про проєкт:",
    getSpikePublicProjectUrl(),
  ].join("\n");
}

export function buildSpikeTelegramAlreadyLinkedText({
  companyName,
  credentials = [],
}: {
  companyName: string;
  credentials?: string[];
}) {
  return [
    `Ви вже підключені до SPIKE SPOT INDEX для ${companyName}.`,
    "",
    ...credentials,
    "Натисніть кнопку нижче, щоб відкрити форму цін.",
  ].join("\n");
}

export function buildSpikeTelegramUnmatchedText() {
  return "Вітаємо! Щоб підключити Telegram до SPIKE SPOT INDEX, скористайтеся персональним посиланням з onboarding-листа або повідомте менеджеру ваш Telegram username/ID.";
}

function buildTelegramUnmatchedText() {
  if (SITE_CONFIG.tenantId === "spike-ua") {
    return buildSpikeTelegramUnmatchedText();
  }

  return "Ваш Telegram ще не прив'язаний до респондента. Зверніться до менеджера проєкту, щоб завершити підключення.";
}

export function buildRespondentTelegramDeepLink(token: string) {
  return `${getTelegramBotUrl()}?start=${encodeURIComponent(token)}`;
}

export function hashRespondentTelegramLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createRespondentTelegramLinkTokenValue() {
  return randomBytes(32).toString("base64url");
}

async function createRespondentTelegramLinkToken({
  contactId,
  respondentId,
}: {
  contactId: string;
  respondentId: string;
}) {
  const rawToken = createRespondentTelegramLinkTokenValue();
  const tokenHash = hashRespondentTelegramLinkToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const tenantId = getActiveIndexConfig().id;

  await db.respondentTelegramLinkToken.create({
    data: {
      contactId,
      expiresAt,
      respondentId,
      tenantId,
      tokenHash,
    },
  });
  await db.auditLog.create({
    data: {
      action: "respondent.telegram_link_token_created",
      afterJson: {
        contactId,
        expiresAt: expiresAt.toISOString(),
        tenantId,
      },
      beforeJson: Prisma.JsonNull,
      entityId: respondentId,
      entityType: "Respondent",
      summary: "Created respondent Telegram link token.",
    },
  });

  return {
    deepLink: buildRespondentTelegramDeepLink(rawToken),
  };
}

async function resolveRespondentTelegramStartToken({
  chatId,
  token,
  username,
}: {
  chatId: string;
  token: string;
  username: string | null;
}) {
  const tokenHash = hashRespondentTelegramLinkToken(token);
  const linkToken = await db.respondentTelegramLinkToken.findUnique({
    include: {
      contact: {
        include: {
          respondent: {
            include: {
              authAccount: true,
            },
          },
        },
      },
    },
    where: { tokenHash },
  });

  if (!linkToken || linkToken.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const contact = linkToken.contact;

  if (!contact.active || !contact.respondent.active || contact.respondent.status !== "active") {
    return null;
  }

  if (linkToken.usedAt && contact.telegramChatId !== chatId) {
    return null;
  }

  if (!linkToken.usedAt) {
    await db.respondentTelegramLinkToken.update({
      where: { id: linkToken.id },
      data: { usedAt: new Date() },
    });
    await db.auditLog.create({
      data: {
        action: "respondent.telegram_link_token_used",
        afterJson: {
          chatId,
          contactId: contact.id,
          username: username ?? null,
        },
        beforeJson: Prisma.JsonNull,
        entityId: contact.respondentId,
        entityType: "Respondent",
        summary: "Used respondent Telegram link token.",
      },
    });
  }

  return contact;
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
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
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
  }, TELEGRAM_DELIVERY_TIMEOUT_MS);
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

function extractStartPayload(text: string | undefined) {
  const parts = text?.trim().split(/\s+/) ?? [];

  if (parts[0] !== "/start" || !parts[1]) {
    return null;
  }

  return parts[1];
}

type TelegramInboundMessage = {
  chat: { id: number | string };
  from?: { username?: string };
  text?: string;
};

function getOnboardingSender() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_RESPONDENT_ONBOARDING_SENDER ??
        process.env.SPIKE_ADMIN_INVITE_SENDER ??
        "SPIKE SPOT INDEX <onboarding@resend.dev>"
    : "UGA Index <onboarding@resend.dev>";
}

function getOnboardingReplyTo() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_RESPONDENT_ONBOARDING_REPLY_TO ||
        process.env.SPIKE_ADMIN_INVITE_REPLY_TO ||
        "info@spike.broker"
    : "inbox@uga.ua";
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getTelegramBotHandle() {
  return SITE_CONFIG.tenantId === "spike-ua" ? "@spike_spot_bot" : "@uga_index_bot";
}

function getTelegramBotUrl() {
  return getActiveIndexConfig().id === "spike-ua"
    ? "https://t.me/spike_spot_bot"
    : "https://t.me/uga_index_bot";
}

function getSpikePublicProjectUrl() {
  const siteUrl = getSiteUrl();

  if (siteUrl.includes("localhost")) {
    return "https://spike.1d3x.com/uk";
  }

  return `${siteUrl}/uk`;
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
