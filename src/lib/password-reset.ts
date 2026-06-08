import "server-only";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  createDemoSessionCookieValue,
  type DemoRole,
  type SessionSourceUser,
} from "@/lib/demo-auth";
import { SITE_CONFIG } from "@/lib/constants";
import { isSpikeAdminEmail } from "@/lib/spike-admin-access";
import { setPermanentPasswordForUser } from "@/lib/password-setup";
import type { Locale } from "@/lib/i18n";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60 * 2;

type PasswordResetTarget = {
  email: string;
  locale: Locale;
  role: Extract<DemoRole, "admin" | "respondent">;
  sessionUser: SessionSourceUser;
};

export async function requestPasswordReset(
  login: string,
  locale: Locale,
) {
  if (!hasDatabaseUrl()) {
    return { status: "skipped_no_database" as const };
  }

  const normalizedLogin = login.trim().toLowerCase();

  if (!normalizedLogin) {
    return { status: "ignored_empty_login" as const };
  }

  const target = await findPasswordResetTarget(normalizedLogin, locale);

  if (!target) {
    return { status: "accepted" as const };
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: {
        email: normalizedLogin,
        role: target.role,
        usedAt: null,
      },
    });

    await tx.passwordResetToken.create({
      data: {
        email: normalizedLogin,
        expiresAt,
        locale,
        respondentId:
          target.role === "respondent" ? target.sessionUser.respondentId ?? null : null,
        role: target.role,
        token,
        userId: target.sessionUser.userId,
      },
    });
  });

  await sendPasswordResetEmail({
    email: normalizedLogin,
    locale,
    resetUrl: `${getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`,
    role: target.role,
  });

  return { status: "accepted" as const };
}

export async function getPasswordResetTokenState(
  token: string,
): Promise<{ locale: Locale; state: "expired" | "invalid" | "used" | "valid" }> {
  if (!hasDatabaseUrl()) {
    return { locale: "en" as Locale, state: "invalid" as const };
  }

  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return { locale: "en" as Locale, state: "invalid" as const };
  }

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token: normalizedToken },
  });

  if (!resetToken) {
    return { locale: "en" as Locale, state: "invalid" as const };
  }

  const locale = resetToken.locale === "uk" ? "uk" : "en";

  if (resetToken.usedAt) {
    return { locale, state: "used" as const };
  }

  if (resetToken.expiresAt.getTime() <= Date.now()) {
    return { locale, state: "expired" as const };
  }

  return { locale, state: "valid" as const };
}

export async function completePasswordReset(token: string, password: string) {
  if (!hasDatabaseUrl()) {
    throw new Error("Password reset requires database access.");
  }

  const normalizedToken = token.trim();
  const now = new Date();

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token: normalizedToken },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  const target = await findPasswordResetTarget(
    resetToken.email,
    resetToken.locale === "uk" ? "uk" : "en",
  );

  if (!target || target.role !== resetToken.role) {
    return null;
  }

  await setPermanentPasswordForUser(
    {
      ...target.sessionUser,
      issuedAt: Math.floor(now.getTime() / 1000),
      expiresAt: Math.floor(now.getTime() / 1000) + 60 * 60 * 8,
      name: target.sessionUser.name,
      role: target.sessionUser.role,
      username: target.sessionUser.email,
      respondentName: target.sessionUser.companyName,
    },
    password,
  );

  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { token: normalizedToken },
      data: { usedAt: now },
    });
    await tx.passwordResetToken.updateMany({
      where: {
        email: resetToken.email,
        role: resetToken.role,
        token: { not: normalizedToken },
        usedAt: null,
      },
      data: { usedAt: now },
    });
    await tx.auditLog.create({
      data: {
        action: "auth.password_reset_completed",
        actorRole: target.role,
        actorUserId: target.sessionUser.userId,
        afterJson: {
          email: resetToken.email,
          role: resetToken.role,
        },
        beforeJson: Prisma.JsonNull,
        entityId: target.sessionUser.userId,
        entityType: "User",
        summary: `Password reset completed for ${resetToken.email}.`,
      },
    });
  });

  return {
    role: target.role,
    sessionUser: {
      ...target.sessionUser,
      passwordSetupStatus: "active" as const,
    },
    sessionValue: createDemoSessionCookieValue({
      ...target.sessionUser,
      passwordSetupStatus: "active",
    }),
  };
}

async function findPasswordResetTarget(
  loginEmail: string,
  locale: Locale,
): Promise<PasswordResetTarget | null> {
  const adminUser = await db.user.findFirst({
    where: {
      active: true,
      email: loginEmail,
      role: "admin",
    },
  });

  if (adminUser) {
    if (SITE_CONFIG.tenantId === "spike-ua" && !isSpikeAdminEmail(adminUser.email)) {
      return null;
    }

    return {
      email: adminUser.email,
      locale,
      role: "admin",
      sessionUser: {
        email: adminUser.email,
        name: adminUser.name,
        passwordSetupStatus:
          adminUser.passwordSetupStatus === "active" ? "active" : "temporary",
        role: "admin",
        userId: adminUser.id,
      },
    };
  }

  const respondentAuth = await db.respondentAuthAccount.findUnique({
    include: {
      respondent: {
        include: {
          contacts: {
            where: {
              active: true,
              primary: true,
            },
            take: 1,
          },
        },
      },
    },
    where: { loginEmail: loginEmail },
  });

  if (!respondentAuth || !respondentAuth.respondent.active || respondentAuth.respondent.status !== "active") {
    return null;
  }

  const respondentUser = await db.user.findFirst({
    where: {
      active: true,
      role: "respondent",
      OR: [
        { respondentId: respondentAuth.respondentId },
        { email: respondentAuth.loginEmail },
      ],
    },
  });

  if (!respondentUser) {
    return null;
  }

  return {
    email: respondentAuth.loginEmail,
    locale:
      respondentAuth.respondent.contacts[0]?.preferredLocale === "uk" ||
      respondentAuth.respondent.contacts[0]?.preferredLocale === "en"
        ? respondentAuth.respondent.contacts[0].preferredLocale
        : locale,
    role: "respondent",
    sessionUser: {
      companyName: respondentAuth.respondent.legalName,
      email: respondentAuth.loginEmail,
      name: respondentUser.name,
      passwordSetupStatus:
        respondentAuth.passwordSetupStatus === "active" ? "active" : "temporary",
      respondentId: respondentAuth.respondentId,
      role: "respondent",
      userId: respondentUser.id,
    },
  };
}

async function sendPasswordResetEmail({
  email,
  locale,
  resetUrl,
  role,
}: {
  email: string;
  locale: Locale;
  resetUrl: string;
  role: "admin" | "respondent";
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return;
  }

  const subject =
    locale === "uk"
      ? `Скидання пароля для ${SITE_CONFIG.name}`
      : `Reset your ${SITE_CONFIG.name} password`;
  const text =
    locale === "uk"
      ? [
          `Для облікового запису ${email} надійшов запит на скидання пароля в ${SITE_CONFIG.name}.`,
          "",
          "Перейдіть за посиланням нижче, щоб встановити новий постійний пароль.",
          resetUrl,
          "",
          "Посилання діє 2 години і може бути використане лише один раз.",
          role === "respondent"
            ? "Після скидання пароля ви одразу зможете увійти в кабінет респондента."
            : "Після скидання пароля ви одразу зможете увійти в адмінку.",
        ].join("\n")
      : [
          `A password reset was requested for ${email} in ${SITE_CONFIG.name}.`,
          "",
          "Open the link below to set a new permanent password:",
          resetUrl,
          "",
          "The link is valid for 2 hours and can be used once.",
          role === "respondent"
            ? "After reset, you can immediately continue to the respondent workspace."
            : "After reset, you can immediately continue to the admin workspace.",
        ].join("\n");

  const html = text
    .split("\n")
    .map((line) =>
      line === resetUrl
        ? `<p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p>`
        : `<p>${escapeHtml(line) || "&nbsp;"}</p>`,
    )
    .join("");

  await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: getSender(),
      html,
      reply_to: getReplyTo(),
      subject,
      text,
      to: [email],
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  }).catch(() => null);
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function getSender() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_ADMIN_INVITE_SENDER ?? "SPIKE SPOT INDEX <onboarding@resend.dev>"
    : "UGA Index <onboarding@resend.dev>";
}

function getReplyTo() {
  return SITE_CONFIG.tenantId === "spike-ua"
    ? process.env.SPIKE_ADMIN_INVITE_REPLY_TO || "info@spike.broker"
    : "inbox@uga.ua";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
