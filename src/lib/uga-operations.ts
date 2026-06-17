import { randomBytes } from "node:crypto";

import { db, hasDatabaseUrl } from "@/lib/db";
import { SITE_CONFIG } from "@/lib/constants";
import { sendRespondentOnboarding } from "@/lib/respondent-onboarding";

type ProvisionedCredential = {
  email: string;
  name: string;
  respondentId?: string;
  role: "admin" | "respondent";
  temporaryPassword: string;
};

const UGA_ADMINS = [
  {
    email: process.env.UGA_PRIMARY_ADMIN_EMAIL || "a.biletskiy@gmail.com",
    name: process.env.UGA_PRIMARY_ADMIN_NAME || "Anton Biletskiy",
  },
  {
    email: process.env.UGA_OS_ADMIN_EMAIL || "os@spike.broker",
    name: process.env.UGA_OS_ADMIN_NAME || "Oleksandr Solovey",
  },
];

const UGA_SOLOVEY_RESPONDENT = {
  id: process.env.UGA_SOLOVEY_RESPONDENT_ID || "fop-solovey",
  legalName: process.env.UGA_SOLOVEY_LEGAL_NAME || "ФОП Соловей",
  contactName: process.env.UGA_SOLOVEY_CONTACT_NAME || "Oleksandr Solovey",
  email: process.env.UGA_SOLOVEY_EMAIL || "oleksandr.solo@gmail.com",
  phone: process.env.UGA_SOLOVEY_PHONE || "+380503862991",
  telegramUsername: process.env.UGA_SOLOVEY_TELEGRAM_USERNAME || "o_solo",
};

export async function provisionUgaOperations({
  sendEmails = false,
}: {
  sendEmails?: boolean;
} = {}) {
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required.");
  }

  if (SITE_CONFIG.tenantId !== "uga-ua") {
    throw new Error(`UGA provisioning can run only for uga-ua, got ${SITE_CONFIG.tenantId}.`);
  }

  const baskets = await db.basket.findMany({
    orderBy: { code: "asc" },
    where: { active: true },
  });
  const credentials: ProvisionedCredential[] = [];

  await db.$transaction(async (tx) => {
    for (const admin of UGA_ADMINS) {
      const temporaryPassword = generateTemporaryPassword("UGA-ADMIN");

      await tx.user.upsert({
        where: { email: admin.email },
        update: {
          active: true,
          lastGeneratedAt: new Date(),
          name: admin.name,
          passwordHash: null,
          passwordSetAt: null,
          passwordSetupStatus: "temporary",
          respondentId: null,
          role: "admin",
          temporaryPassword,
        },
        create: {
          active: true,
          email: admin.email,
          lastGeneratedAt: new Date(),
          name: admin.name,
          passwordSetupStatus: "temporary",
          role: "admin",
          temporaryPassword,
        },
      });

      credentials.push({
        email: admin.email,
        name: admin.name,
        role: "admin",
        temporaryPassword,
      });
    }

    const temporaryPassword = generateTemporaryPassword("UGA-SOLO");

    await tx.respondent.upsert({
      where: { id: UGA_SOLOVEY_RESPONDENT.id },
      update: {
        active: true,
        collectionMode: "telegram_request",
        displayName: UGA_SOLOVEY_RESPONDENT.legalName,
        legalName: UGA_SOLOVEY_RESPONDENT.legalName,
        status: "active",
      },
      create: {
        id: UGA_SOLOVEY_RESPONDENT.id,
        active: true,
        collectionMode: "telegram_request",
        displayName: UGA_SOLOVEY_RESPONDENT.legalName,
        legalName: UGA_SOLOVEY_RESPONDENT.legalName,
        status: "active",
      },
    });

    const existingContact = await tx.respondentContact.findFirst({
      orderBy: [{ primary: "desc" }, { createdAt: "asc" }],
      where: { respondentId: UGA_SOLOVEY_RESPONDENT.id },
    });
    const contactData = {
      active: true,
      email: UGA_SOLOVEY_RESPONDENT.email,
      name: UGA_SOLOVEY_RESPONDENT.contactName,
      phone: UGA_SOLOVEY_RESPONDENT.phone,
      preferredLocale: "uk" as const,
      primary: true,
      role: "Primary contact",
      telegramChatId: null,
      telegramUsername: UGA_SOLOVEY_RESPONDENT.telegramUsername,
    };

    if (existingContact) {
      await tx.respondentContact.update({
        where: { id: existingContact.id },
        data: contactData,
      });
    } else {
      await tx.respondentContact.create({
        data: {
          respondentId: UGA_SOLOVEY_RESPONDENT.id,
          ...contactData,
        },
      });
    }

    await tx.respondentAuthAccount.upsert({
      where: { respondentId: UGA_SOLOVEY_RESPONDENT.id },
      update: {
        lastGeneratedAt: new Date(),
        loginEmail: UGA_SOLOVEY_RESPONDENT.email,
        passwordHash: null,
        passwordSetAt: null,
        passwordSetupStatus: "temporary",
        temporaryPassword,
      },
      create: {
        respondentId: UGA_SOLOVEY_RESPONDENT.id,
        lastGeneratedAt: new Date(),
        loginEmail: UGA_SOLOVEY_RESPONDENT.email,
        passwordSetupStatus: "temporary",
        temporaryPassword,
      },
    });

    await tx.user.upsert({
      where: { email: UGA_SOLOVEY_RESPONDENT.email },
      update: {
        active: true,
        lastGeneratedAt: new Date(),
        name: `${UGA_SOLOVEY_RESPONDENT.legalName} respondent`,
        passwordHash: null,
        passwordSetAt: null,
        passwordSetupStatus: "temporary",
        respondentId: UGA_SOLOVEY_RESPONDENT.id,
        role: "respondent",
        temporaryPassword,
      },
      create: {
        active: true,
        email: UGA_SOLOVEY_RESPONDENT.email,
        lastGeneratedAt: new Date(),
        name: `${UGA_SOLOVEY_RESPONDENT.legalName} respondent`,
        passwordSetupStatus: "temporary",
        respondentId: UGA_SOLOVEY_RESPONDENT.id,
        role: "respondent",
        temporaryPassword,
      },
    });

    for (const basket of baskets) {
      await tx.basketRespondent.upsert({
        where: {
          basketId_respondentId: {
            basketId: basket.id,
            respondentId: UGA_SOLOVEY_RESPONDENT.id,
          },
        },
        update: { active: true },
        create: {
          active: true,
          basketId: basket.id,
          respondentId: UGA_SOLOVEY_RESPONDENT.id,
        },
      });
    }

    credentials.push({
      email: UGA_SOLOVEY_RESPONDENT.email,
      name: UGA_SOLOVEY_RESPONDENT.legalName,
      respondentId: UGA_SOLOVEY_RESPONDENT.id,
      role: "respondent",
      temporaryPassword,
    });
  });

  const emailResults = sendEmails
    ? await Promise.all(credentials.map((credential) => sendProvisioningEmail(credential)))
    : [];

  return {
    basketCount: baskets.length,
    credentials,
    emailResults,
    sentEmails: sendEmails,
    siteUrl: getSiteUrl(),
  };
}

function generateTemporaryPassword(prefix: string) {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function sendProvisioningEmail(credential: ProvisionedCredential) {
  if (credential.role === "admin") {
    return sendAdminOnboardingEmail(credential);
  }

  const contact = await db.respondentContact.findFirst({
    orderBy: [{ primary: "desc" }, { createdAt: "asc" }],
    where: {
      active: true,
      respondentId: credential.respondentId,
    },
  });

  if (!contact || !credential.respondentId) {
    throw new Error(`Primary contact is missing for ${credential.email}.`);
  }

  const respondent = await db.respondent.findUnique({
    where: { id: credential.respondentId },
  });

  if (!respondent) {
    throw new Error(`Respondent ${credential.respondentId} was not found.`);
  }

  const onboarding = await sendRespondentOnboarding({
    auth: {
      loginEmail: credential.email,
      temporaryPassword: credential.temporaryPassword,
    },
    contact: {
      email: contact.email,
      id: contact.id,
      name: contact.name,
      preferredLocale: contact.preferredLocale === "en" ? "en" : "uk",
      telegramChatId: contact.telegramChatId,
      telegramUsername: contact.telegramUsername,
    },
    respondent: {
      id: respondent.id,
      legalName: respondent.legalName,
    },
  });

  return {
    email: credential.email,
    role: credential.role,
    status: onboarding.emailStatus,
    telegramStatus: onboarding.telegramStatus,
  };
}

async function sendAdminOnboardingEmail(credential: ProvisionedCredential) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      email: credential.email,
      role: credential.role,
      status: "skipped_no_email_provider",
    };
  }

  const text = [
    "Вітаю!",
    "",
    `Для вас створено доступ адміністратора до ${SITE_CONFIG.name}.`,
    "",
    `Логін: ${credential.email}`,
    `Тимчасовий пароль: ${credential.temporaryPassword}`,
    "",
    "Увійдіть на сайт і встановіть власний постійний пароль.",
    "",
    `Сторінка входу: ${getSiteUrl()}/login`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: getUgaSender(),
      html: renderParagraphs(text),
      reply_to: getUgaReplyTo(),
      subject: `Доступ адміністратора до ${SITE_CONFIG.name}`,
      text,
      to: [credential.email],
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

  return {
    email: credential.email,
    providerId: payload.id ?? null,
    role: credential.role,
    status: response.ok ? "sent" : "failed",
    error: response.ok ? null : payload.message ?? payload.name ?? response.statusText,
  };
}

function renderParagraphs(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const escaped = escapeHtml(line);
      return line.startsWith("https://")
        ? `<p><a href="${escaped}">${escaped}</a></p>`
        : `<p>${escaped || "&nbsp;"}</p>`;
    })
    .join("");
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getUgaSender() {
  return process.env.UGA_ONBOARDING_SENDER ?? "UGA Index <noreply@1d3x.com>";
}

function getUgaReplyTo() {
  return process.env.UGA_ONBOARDING_REPLY_TO || "inbox@uga.ua";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
