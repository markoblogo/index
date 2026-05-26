import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const fopSolovey = {
  id: "fop-solovey",
  legalName: "ФОП Соловей",
  contactName: "Oleksandr Solovey",
  email: "oleksandr.solo@gmail.com",
  phone: "+380503862991",
  telegramChatId: "447017744",
  telegramUsername: "o_solo",
};

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : null;
}

function requireInternalAccess(request: Request) {
  const expected =
    process.env.RESPONDENT_TELEGRAM_CRON_SECRET ?? process.env.CRON_SECRET;

  if (!expected) {
    return false;
  }

  return getBearerToken(request) === expected;
}

function generateTemporaryPassword() {
  return `SPIKE-SOLO-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!requireInternalAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const shouldSendOnboarding = url.searchParams.get("sendOnboarding") === "1";
  const shouldExposeTemporaryPassword =
    url.searchParams.get("exposeTemporaryPassword") === "1";

  await db.$executeRawUnsafe(`
    ALTER TABLE "RespondentContact"
    ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
    ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
    ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT NOT NULL DEFAULT 'uk'
  `);

  const existingAuth = await db.respondentAuthAccount.findUnique({
    where: { respondentId: fopSolovey.id },
  });
  const shouldSetTemporary =
    !existingAuth ||
    existingAuth.passwordSetupStatus !== "active" ||
    !existingAuth.passwordHash;
  const activeTemporaryPassword = shouldSetTemporary
    ? generateTemporaryPassword()
    : existingAuth.temporaryPassword;

  await db.$transaction(async (tx) => {
    await tx.respondent.updateMany({
      data: {
        active: false,
        status: "disabled",
      },
      where: {
        id: {
          notIn: ["MN7R_MONITOR", fopSolovey.id],
        },
      },
    });

    await tx.respondent.upsert({
      create: {
        id: fopSolovey.id,
        active: true,
        collectionMode: "self_service",
        displayName: fopSolovey.legalName,
        legalName: fopSolovey.legalName,
        status: "active",
      },
      update: {
        active: true,
        collectionMode: "self_service",
        displayName: fopSolovey.legalName,
        legalName: fopSolovey.legalName,
        status: "active",
      },
      where: { id: fopSolovey.id },
    });

    const contact = await tx.respondentContact.findFirst({
      where: { active: true, primary: true, respondentId: fopSolovey.id },
    });

    const contactData = {
      email: fopSolovey.email,
      name: fopSolovey.contactName,
      phone: fopSolovey.phone,
      preferredLocale: "uk",
      primary: true,
      role: "Primary contact",
      telegramChatId: fopSolovey.telegramChatId,
      telegramUsername: fopSolovey.telegramUsername,
    };

    if (contact) {
      await tx.respondentContact.update({
        data: contactData,
        where: { id: contact.id },
      });
    } else {
      await tx.respondentContact.create({
        data: {
          ...contactData,
          respondentId: fopSolovey.id,
        },
      });
    }

    await tx.respondentAuthAccount.upsert({
      create: {
        lastGeneratedAt: new Date(),
        loginEmail: fopSolovey.email,
        passwordSetupStatus: "temporary",
        respondentId: fopSolovey.id,
        temporaryPassword: activeTemporaryPassword,
      },
      update: {
        loginEmail: fopSolovey.email,
        ...(shouldSetTemporary
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword: activeTemporaryPassword,
            }
          : {}),
      },
      where: { respondentId: fopSolovey.id },
    });

    await tx.user.upsert({
      create: {
        active: true,
        email: fopSolovey.email,
        name: `${fopSolovey.legalName} respondent`,
        passwordSetupStatus: "temporary",
        respondentId: fopSolovey.id,
        role: "respondent",
        temporaryPassword: activeTemporaryPassword,
      },
      update: {
        active: true,
        email: fopSolovey.email,
        name: `${fopSolovey.legalName} respondent`,
        respondentId: fopSolovey.id,
        role: "respondent",
        ...(shouldSetTemporary
          ? {
              passwordHash: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword: activeTemporaryPassword,
            }
          : {}),
      },
      where: { email: fopSolovey.email },
    });

    const baskets = await tx.basket.findMany({ where: { active: true } });
    await Promise.all(
      baskets.map((basket) =>
        tx.basketRespondent.upsert({
          create: {
            active: true,
            basketId: basket.id,
            respondentId: fopSolovey.id,
          },
          update: { active: true },
          where: {
            basketId_respondentId: {
              basketId: basket.id,
              respondentId: fopSolovey.id,
            },
          },
        }),
      ),
    );
  });

  let onboardingSent = false;
  if (shouldSendOnboarding && activeTemporaryPassword) {
    await sendOnboardingEmail(activeTemporaryPassword);
    onboardingSent = true;
  }

  return NextResponse.json({
    disabledSeedRespondents: true,
    onboardingSent,
    respondentId: fopSolovey.id,
    schemaReady: true,
    temporaryPassword: shouldExposeTemporaryPassword
      ? activeTemporaryPassword
      : undefined,
    temporaryPasswordGenerated: shouldSetTemporary,
  });
}

async function sendOnboardingEmail(temporaryPassword: string) {
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
    throw new Error(
      `Resend onboarding failed: ${response.status} ${await response.text()}`,
    );
  }
}
