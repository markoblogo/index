import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import {
  MN7R_MONITOR_RESPONDENT_ID,
  SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
} from "@/lib/index-platform";
import { createPasswordSetupLinkForRespondent } from "@/lib/password-setup-token";
import { sendRespondentTelegramNotifications } from "@/lib/respondent-telegram";
import { isProductionRuntime } from "@1d3x/data";
import { tenantScopedWhere } from "@1d3x/data";

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

export async function POST(request: Request) {
  if (isProductionRuntime()) {
    return NextResponse.json(
      { error: "Spike setup helper is disabled in production." },
      { status: 404 },
    );
  }

  if (!requireInternalAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const shouldDebug = url.searchParams.get("debug") === "1";
  const cleanupDate = url.searchParams.get("cleanupNonMonitorDate");
  const moveMonitorAdminFallbackDate = url.searchParams.get(
    "moveMonitorAdminFallbackDate",
  );
  const forceSetupLink = url.searchParams.get("forceSetupLink") === "1";
  const shouldSendOnboarding = url.searchParams.get("sendOnboarding") === "1";
  const shouldSendTelegramOnboarding =
    url.searchParams.get("sendTelegramOnboarding") === "1";
  const shouldSendTelegramSurvey =
    url.searchParams.get("sendTelegramSurvey") === "1";
  const submitDraftsDate = url.searchParams.get("submitDraftsDate");
  const submitDraftsRespondentId =
    url.searchParams.get("submitDraftsRespondentId") ?? fopSolovey.id;
  const tenantScope = tenantScopedWhere();

  await db.$executeRawUnsafe(`
    ALTER TABLE "RespondentContact"
    ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
    ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT,
    ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT NOT NULL DEFAULT 'uk'
  `);

  const existingAuth = await db.respondentAuthAccount.findUnique({
    where: { respondentId: fopSolovey.id },
  });
  const shouldGenerateSetupLink =
    forceSetupLink ||
    !existingAuth ||
    existingAuth.passwordSetupStatus !== "active" ||
    !existingAuth.passwordHash;

  const setupLinkTarget = await db.$transaction(async (tx) => {
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
        ...tenantScope,
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
        ...tenantScope,
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

    const auth = await tx.respondentAuthAccount.upsert({
      create: {
        lastGeneratedAt: new Date(),
        loginEmail: fopSolovey.email,
        passwordSetupStatus: "temporary",
        respondentId: fopSolovey.id,
        temporaryPassword: null,
      },
      update: {
        loginEmail: fopSolovey.email,
        ...(shouldGenerateSetupLink
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetAt: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword: null,
            }
          : {}),
      },
      where: { respondentId: fopSolovey.id },
    });

    const user = await tx.user.upsert({
      create: {
        ...tenantScope,
        active: true,
        email: fopSolovey.email,
        name: `${fopSolovey.legalName} respondent`,
        passwordSetupStatus: "temporary",
        respondentId: fopSolovey.id,
        role: "respondent",
        temporaryPassword: null,
      },
      update: {
        active: true,
        email: fopSolovey.email,
        name: `${fopSolovey.legalName} respondent`,
        respondentId: fopSolovey.id,
        role: "respondent",
        ...(shouldGenerateSetupLink
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetAt: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword: null,
            }
          : {}),
      },
      where: { email: fopSolovey.email },
    });

    const baskets = await tx.basket.findMany({
      where: { ...tenantScope, active: true },
    });
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

    return {
      authId: auth.id,
      email: auth.loginEmail,
      userId: user.id,
    };
  });

  const movedMonitorAdminFallback = moveMonitorAdminFallbackDate
    ? await moveMonitorAdminEntriesToFallback(moveMonitorAdminFallbackDate)
    : undefined;

  const setupLink =
    shouldGenerateSetupLink || shouldSendOnboarding || shouldSendTelegramOnboarding
      ? await createPasswordSetupLinkForRespondent({
          baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://spike.1d3x.com",
          email: setupLinkTarget.email,
          next: "/respondent",
          respondentAuthAccountId: setupLinkTarget.authId,
          userId: setupLinkTarget.userId,
        })
      : null;

  let onboardingSent = false;
  if (shouldSendOnboarding && setupLink) {
    await sendOnboardingEmail(setupLink);
    onboardingSent = true;
  }

  let telegramOnboardingSent = false;
  if (shouldSendTelegramOnboarding && setupLink) {
    await sendOnboardingTelegram(setupLink);
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
    setupLinkGenerated: Boolean(setupLink),
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
      ...tenantScopedWhere(),
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
  const tenantScope = tenantScopedWhere();
  const entries = await db.priceSubmission.findMany({
    where: {
      ...tenantScope,
      respondentId: MN7R_MONITOR_RESPONDENT_ID,
      source: "admin",
      tradeDate,
    },
  });

  for (const entry of entries) {
    await db.priceSubmission.upsert({
      create: {
        ...tenantScope,
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
        tenantId_indexProductId_tradeDate_commodityId_deliveryBasisId_respondentId_source: {
          tenantId: tenantScope.tenantId,
          indexProductId: tenantScope.indexProductId,
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
        ...tenantScope,
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
      ...tenantScopedWhere(),
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

async function sendOnboardingEmail(setupLink: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike.1d3x.com";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: "SPIKE SPOT INDEX <onboarding@resend.dev>",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111">
          <h1>Доступ до SPIKE SPOT INDEX</h1>
          <p>Ви додані як респондент SPIKE SPOT INDEX.</p>
          <p><strong>Логін:</strong> ${fopSolovey.email}</p>
          <p>Встановіть власний пароль за одноразовим посиланням.</p>
          <p><a href="${setupLink}" style="font-weight:700;color:#111">Встановити пароль</a></p>
          <p>Після встановлення пароля входьте через <a href="${siteUrl}/login">${siteUrl}/login</a>.</p>
        </div>
      `,
      subject: "Доступ респондента до SPIKE SPOT INDEX",
      text: [
        "Ви додані як респондент SPIKE SPOT INDEX.",
        `Логін: ${fopSolovey.email}`,
        `Встановити пароль: ${setupLink}`,
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

async function sendOnboardingTelegram(setupLink: string) {
  const token = process.env.SPIKE_TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("SPIKE_TELEGRAM_BOT_TOKEN is not configured.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://spike.1d3x.com";
  const text = [
    "Доступ до SPIKE SPOT INDEX оновлено.",
    "",
    "Ваш попередній пароль скинуто. Встановіть власний пароль за одноразовим посиланням.",
    "",
    `Логін: ${fopSolovey.email}`,
    `Встановити пароль: ${setupLink}`,
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
              url: setupLink,
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
      ...tenantScopedWhere(),
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
