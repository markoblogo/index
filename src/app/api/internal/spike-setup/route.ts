import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import {
  MN7R_MONITOR_RESPONDENT_ID,
  SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
} from "@/lib/index-platform";
import { sendRespondentTelegramNotifications } from "@/lib/respondent-telegram";

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

const adminFallback = {
  id: SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
  legalName: "Admin market fallback",
};

function requireInternalAccess(request: Request) {
  return isCronRequestAuthorized(request, [
    process.env.RESPONDENT_TELEGRAM_CRON_SECRET,
    process.env.CRON_SECRET,
  ]);
}

function generateTemporaryPassword() {
  return `SPIKE-SOLO-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!requireInternalAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const shouldDebug = url.searchParams.get("debug") === "1";
  const cleanupDate = url.searchParams.get("cleanupNonMonitorDate");
  const moveMonitorAdminFallbackDate = url.searchParams.get(
    "moveMonitorAdminFallbackDate",
  );
  const forceTemporary = url.searchParams.get("forceTemporary") === "1";
  const shouldSendOnboarding = url.searchParams.get("sendOnboarding") === "1";
  const shouldSendTelegramOnboarding =
    url.searchParams.get("sendTelegramOnboarding") === "1";
  const shouldSendTelegramSurvey =
    url.searchParams.get("sendTelegramSurvey") === "1";
  const shouldExposeTemporaryPassword =
    url.searchParams.get("exposeTemporaryPassword") === "1";
  const submitDraftsDate = url.searchParams.get("submitDraftsDate");
  const submitDraftsRespondentId =
    url.searchParams.get("submitDraftsRespondentId") ?? fopSolovey.id;

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
    forceTemporary ||
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
          notIn: [
            MN7R_MONITOR_RESPONDENT_ID,
            adminFallback.id,
            fopSolovey.id,
          ],
        },
      },
    });

    await tx.respondent.upsert({
      create: {
        id: adminFallback.id,
        active: true,
        collectionMode: "manual_outreach",
        displayName: adminFallback.legalName,
        legalName: adminFallback.legalName,
        status: "active",
      },
      update: {
        active: true,
        collectionMode: "manual_outreach",
        displayName: adminFallback.legalName,
        legalName: adminFallback.legalName,
        status: "active",
      },
      where: { id: adminFallback.id },
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
              passwordSetAt: null,
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
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetAt: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword: activeTemporaryPassword,
            }
          : {}),
      },
      where: { email: fopSolovey.email },
    });

    const baskets = await tx.basket.findMany({ where: { active: true } });
    await Promise.all(
      baskets.flatMap((basket) =>
        [adminFallback.id, fopSolovey.id].map((respondentId) =>
          tx.basketRespondent.upsert({
            create: {
              active: true,
              basketId: basket.id,
              respondentId,
            },
            update: { active: true },
            where: {
              basketId_respondentId: {
                basketId: basket.id,
                respondentId,
              },
            },
          }),
        ),
      ),
    );
  });

  const movedMonitorAdminFallback = moveMonitorAdminFallbackDate
    ? await moveMonitorAdminEntriesToFallback(moveMonitorAdminFallbackDate)
    : undefined;

  let onboardingSent = false;
  if (shouldSendOnboarding && activeTemporaryPassword) {
    await sendOnboardingEmail(activeTemporaryPassword);
    onboardingSent = true;
  }

  let telegramOnboardingSent = false;
  if (shouldSendTelegramOnboarding && activeTemporaryPassword) {
    await sendOnboardingTelegram(activeTemporaryPassword);
    telegramOnboardingSent = true;
  }

  const telegramSurvey = shouldSendTelegramSurvey
    ? await sendRespondentTelegramNotifications({
        reminderLevel: "initial",
        respondentId: fopSolovey.id,
        trigger: "manual",
      })
    : undefined;

  return NextResponse.json({
    adminFallbackRespondentId: adminFallback.id,
    cleanup: cleanupDate ? await cleanupNonMonitorSubmissions(cleanupDate) : undefined,
    debug: shouldDebug ? await getDebugSnapshot() : undefined,
    disabledSeedRespondents: true,
    movedMonitorAdminFallback,
    onboardingSent,
    respondentId: fopSolovey.id,
    schemaReady: true,
    submittedDrafts: submitDraftsDate
      ? await submitRespondentDrafts({
          date: submitDraftsDate,
          respondentId: submitDraftsRespondentId,
        })
      : undefined,
    temporaryPassword: shouldExposeTemporaryPassword
      ? activeTemporaryPassword
      : undefined,
    temporaryPasswordGenerated: shouldSetTemporary,
    telegramOnboardingSent,
    telegramSurvey,
  });
}

async function cleanupNonMonitorSubmissions(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { skippedReason: "invalid_date", updated: 0 };
  }

  const result = await db.priceSubmission.updateMany({
    data: {
      status: "draft",
    },
    where: {
      respondentId: { not: MN7R_MONITOR_RESPONDENT_ID },
      status: { in: ["submitted", "verified", "published"] },
      tradeDate: new Date(`${date}T00:00:00.000Z`),
    },
  });

  return { skippedReason: null, updated: result.count };
}

async function moveMonitorAdminEntriesToFallback(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { skippedReason: "invalid_date", moved: 0 };
  }

  const tradeDate = new Date(`${date}T00:00:00.000Z`);
  const entries = await db.priceSubmission.findMany({
    where: {
      respondentId: MN7R_MONITOR_RESPONDENT_ID,
      source: "admin",
      tradeDate,
    },
  });

  for (const entry of entries) {
    await db.priceSubmission.upsert({
      create: {
        commodityId: entry.commodityId,
        deliveryBasisId: entry.deliveryBasisId,
        metadata: {
          movedAt: new Date().toISOString(),
          movedFromRespondentId: MN7R_MONITOR_RESPONDENT_ID,
          movedReason: "admin_fallback_separation",
        },
        priceUsdPerMt: entry.priceUsdPerMt,
        respondentId: adminFallback.id,
        source: "admin",
        status: entry.status,
        submittedAt: entry.submittedAt ?? new Date(),
        submittedById: entry.submittedById,
        tradeDate,
      },
      update: {
        metadata: {
          movedAt: new Date().toISOString(),
          movedFromRespondentId: MN7R_MONITOR_RESPONDENT_ID,
          movedReason: "admin_fallback_separation",
        },
        priceUsdPerMt: entry.priceUsdPerMt,
        status: entry.status,
        submittedAt: entry.submittedAt ?? new Date(),
        submittedById: entry.submittedById,
      },
      where: {
        tradeDate_commodityId_deliveryBasisId_respondentId_source: {
          commodityId: entry.commodityId,
          deliveryBasisId: entry.deliveryBasisId,
          respondentId: adminFallback.id,
          source: "admin",
          tradeDate,
        },
      },
    });

    await db.priceSubmission.delete({ where: { id: entry.id } });
  }

  if (entries.length > 0) {
    await db.auditLog.create({
      data: {
        action: "price_submission.admin_fallback_migrated",
        actorRole: "admin",
        afterJson: {
          date,
          moved: entries.length,
          targetRespondentId: adminFallback.id,
        },
        beforeJson: {
          source: "admin",
          sourceRespondentId: MN7R_MONITOR_RESPONDENT_ID,
        },
        entityType: "PriceSubmission",
        summary: `Moved ${entries.length} admin-entered MN7R submissions to Admin market fallback for ${date}.`,
      },
    });
  }

  return { skippedReason: null, moved: entries.length };
}

async function submitRespondentDrafts({
  date,
  respondentId,
}: {
  date: string;
  respondentId: string;
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { skippedReason: "invalid_date", updated: 0 };
  }

  const result = await db.priceSubmission.updateMany({
    data: {
      status: "submitted",
      submittedAt: new Date(),
    },
    where: {
      respondentId,
      source: "respondent",
      status: "draft",
      tradeDate: new Date(`${date}T00:00:00.000Z`),
    },
  });

  return { respondentId, skippedReason: null, updated: result.count };
}

async function getDebugSnapshot() {
  const tradeDate = new Date("2026-05-26T00:00:00.000Z");
  const [respondents, submissions, published] = await Promise.all([
    db.respondent.findMany({
      orderBy: { id: "asc" },
      select: {
        active: true,
        id: true,
        legalName: true,
        status: true,
      },
    }),
    db.priceSubmission.findMany({
      include: {
        commodity: { select: { code: true } },
        respondent: {
          select: {
            active: true,
            id: true,
            legalName: true,
            status: true,
          },
        },
      },
      orderBy: [{ commodity: { sortOrder: "asc" } }, { respondentId: "asc" }],
      where: {
        tradeDate,
      },
    }),
    db.publishedIndex.findMany({
      include: { commodity: { select: { code: true } } },
      orderBy: { commodity: { sortOrder: "asc" } },
      where: { tradeDate },
    }),
  ]);

  return {
    published: published.map((row) => ({
      code: row.commodity.code,
      locked: row.locked,
      status: row.status,
      value: row.valueUsdPerMt.toNumber(),
    })),
    respondents,
    submissions: submissions.map((row) => ({
      code: row.commodity.code,
      price: row.priceUsdPerMt.toNumber(),
      respondent: row.respondent,
      source: row.source,
      status: row.status,
    })),
  };
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

async function sendOnboardingTelegram(temporaryPassword: string) {
  const token = process.env.SPIKE_TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("SPIKE_TELEGRAM_BOT_TOKEN is not configured.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike-ua.cr0pto.com";
  const text = [
    "Доступ до SPIKE SPOT INDEX оновлено.",
    "",
    "Ваш попередній пароль скинуто. Для входу використайте новий тимчасовий пароль, після входу система попросить встановити власний постійний пароль двічі.",
    "",
    `Логін: ${fopSolovey.email}`,
    `Тимчасовий пароль: ${temporaryPassword}`,
    "",
    `Сторінка входу: ${siteUrl}/login`,
    "",
    "Після встановлення власного пароля надалі входьте саме з ним.",
  ].join("\n");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: fopSolovey.telegramChatId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Відкрити вхід",
              url: `${siteUrl}/login`,
            },
          ],
        ],
      },
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

  await db.respondentEmailDelivery.create({
    data: {
      email: `telegram:${fopSolovey.telegramChatId}`,
      error: status === "failed" ? payload.description ?? response.statusText : null,
      providerId: payload.result?.message_id
        ? String(payload.result.message_id)
        : null,
      respondentId: fopSolovey.id,
      status,
      subject: "Telegram respondent re-onboarding",
      trigger: "telegram_manual_reonboarding",
    },
  });

  if (status === "failed") {
    throw new Error(
      `Telegram onboarding failed: ${response.status} ${
        payload.description ?? response.statusText
      }`,
    );
  }
}
