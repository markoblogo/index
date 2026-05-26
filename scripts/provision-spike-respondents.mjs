import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fopSolovey = {
  id: "fop-solovey",
  legalName: "ФОП Соловей",
  contactName: "Oleksandr Solovey",
  email: "oleksandr.solo@gmail.com",
  phone: "+380503862991",
  telegramChatId: "447017744",
  telegramUsername: "o_solo",
};

function generateTemporaryPassword() {
  return `SPIKE-SOLO-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function main() {
  const temporaryPassword = generateTemporaryPassword();
  const existingAuth = await prisma.respondentAuthAccount.findUnique({
    where: { respondentId: fopSolovey.id },
  });
  const shouldSetTemporary =
    !existingAuth ||
    existingAuth.passwordSetupStatus !== "active" ||
    !existingAuth.passwordHash;
  const activeTemporaryPassword = shouldSetTemporary
    ? temporaryPassword
    : existingAuth.temporaryPassword;

  await prisma.$transaction(async (tx) => {
    await tx.respondent.updateMany({
      where: {
        id: {
          notIn: ["MN7R_MONITOR", fopSolovey.id],
        },
        legalName: {
          startsWith: "Spike Brokers Partner",
        },
      },
      data: {
        active: false,
        status: "disabled",
      },
    });

    await tx.respondent.upsert({
      where: { id: fopSolovey.id },
      update: {
        active: true,
        collectionMode: "self_service",
        displayName: fopSolovey.legalName,
        legalName: fopSolovey.legalName,
        status: "active",
      },
      create: {
        id: fopSolovey.id,
        active: true,
        collectionMode: "self_service",
        displayName: fopSolovey.legalName,
        legalName: fopSolovey.legalName,
        status: "active",
      },
    });

    const contact = await tx.respondentContact.findFirst({
      where: { respondentId: fopSolovey.id, active: true, primary: true },
    });

    if (contact) {
      await tx.respondentContact.update({
        where: { id: contact.id },
        data: {
          email: fopSolovey.email,
          name: fopSolovey.contactName,
          phone: fopSolovey.phone,
          preferredLocale: "uk",
          primary: true,
          role: "Primary contact",
          telegramChatId: fopSolovey.telegramChatId,
          telegramUsername: fopSolovey.telegramUsername,
        },
      });
    } else {
      await tx.respondentContact.create({
        data: {
          respondentId: fopSolovey.id,
          email: fopSolovey.email,
          name: fopSolovey.contactName,
          phone: fopSolovey.phone,
          preferredLocale: "uk",
          primary: true,
          role: "Primary contact",
          telegramChatId: fopSolovey.telegramChatId,
          telegramUsername: fopSolovey.telegramUsername,
        },
      });
    }

    await tx.respondentAuthAccount.upsert({
      where: { respondentId: fopSolovey.id },
      update: {
        loginEmail: fopSolovey.email,
        ...(shouldSetTemporary
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetupStatus: "temporary",
              temporaryPassword: activeTemporaryPassword,
            }
          : {}),
      },
      create: {
        respondentId: fopSolovey.id,
        lastGeneratedAt: new Date(),
        loginEmail: fopSolovey.email,
        passwordSetupStatus: "temporary",
        temporaryPassword: activeTemporaryPassword,
      },
    });

    await tx.user.upsert({
      where: { email: fopSolovey.email },
      update: {
        active: true,
        name: `${fopSolovey.legalName} respondent`,
        respondentId: fopSolovey.id,
        role: "respondent",
        ...(shouldSetTemporary
          ? {
              passwordHash: null,
              passwordSetupStatus: "temporary",
              temporaryPassword: activeTemporaryPassword,
            }
          : {}),
      },
      create: {
        active: true,
        email: fopSolovey.email,
        name: `${fopSolovey.legalName} respondent`,
        respondentId: fopSolovey.id,
        role: "respondent",
        passwordSetupStatus: "temporary",
        temporaryPassword: activeTemporaryPassword,
      },
    });

    const baskets = await tx.basket.findMany({ where: { active: true } });
    await Promise.all(
      baskets.map((basket) =>
        tx.basketRespondent.upsert({
          where: {
            basketId_respondentId: {
              basketId: basket.id,
              respondentId: fopSolovey.id,
            },
          },
          update: { active: true },
          create: {
            active: true,
            basketId: basket.id,
            respondentId: fopSolovey.id,
          },
        }),
      ),
    );
  });

  if (process.env.SEND_SOLOVEY_ONBOARDING === "1" && activeTemporaryPassword) {
    await sendOnboardingEmail(activeTemporaryPassword);
  }

  console.log(
    JSON.stringify(
      {
        respondentId: fopSolovey.id,
        loginEmail: fopSolovey.email,
        sentOnboarding: process.env.SEND_SOLOVEY_ONBOARDING === "1",
        temporaryPassword: activeTemporaryPassword,
      },
      null,
      2,
    ),
  );
}

async function sendOnboardingEmail(temporaryPassword) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike-ua.cr0pto.com";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: "SPIKE SPOT INDEX <onboarding@resend.dev>",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111">
          <h1>Доступ до SPIKE SPOT INDEX</h1>
          <p>Ви додані як респондент SPIKE SPOT INDEX.</p>
          <p><strong>Логін:</strong> ${fopSolovey.email}<br/>
          <strong>Тимчасовий пароль:</strong> ${temporaryPassword}</p>
          <p>Увійдіть на сайт і встановіть власний постійний пароль.</p>
          <p><a href="${siteUrl}/login" style="font-weight:700;color:#111">Відкрити сторінку входу</a></p>
        </div>
      `,
      subject: "Доступ респондента до SPIKE SPOT INDEX",
      text: [
        "Ви додані як респондент SPIKE SPOT INDEX.",
        `Логін: ${fopSolovey.email}`,
        `Тимчасовий пароль: ${temporaryPassword}`,
        `Вхід: ${siteUrl}/login`,
      ].join("\n"),
      to: [fopSolovey.email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Resend onboarding failed: ${response.status} ${await response.text()}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
