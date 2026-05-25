import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db, hasDatabaseUrl } from "@/lib/db";

export type SpikeAdminUser = {
  email: string;
  initials: string;
  name: string;
};

export type SpikeAdminInviteResult = {
  email: string;
  error?: string;
  providerId?: string;
  status:
    | "active_not_sent"
    | "created"
    | "failed"
    | "sent"
    | "skipped_no_email_provider"
    | "updated";
};

export const SPIKE_ADMIN_USERS: SpikeAdminUser[] = [
  {
    email: "a.biletskiy@gmail.com",
    initials: "ABV",
    name: "Anton Biletskiy",
  },
  {
    email: "an@spike.broker",
    initials: "AN",
    name: "Arina Nimanikhina",
  },
  {
    email: "os@spike.broker",
    initials: "OS",
    name: "Oleksandr Solovey",
  },
];

const SPIKE_ADMIN_EMAILS = new Set(
  SPIKE_ADMIN_USERS.map((user) => user.email.toLowerCase()),
);

export function isSpikeAdminEmail(email: string) {
  return SPIKE_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export async function ensureSpikeAdminUsers({
  regenerateTemporaryPasswords = false,
  sendInvites = false,
}: {
  regenerateTemporaryPasswords?: boolean;
  sendInvites?: boolean;
} = {}) {
  if (!hasDatabaseUrl()) {
    return {
      delivered: [] satisfies SpikeAdminInviteResult[],
      skippedReason: "database_not_configured",
    };
  }

  const delivered: SpikeAdminInviteResult[] = [];

  for (const admin of SPIKE_ADMIN_USERS) {
    const existing = await db.user.findUnique({
      where: { email: admin.email },
    });
    const shouldGenerateTemporaryPassword =
      regenerateTemporaryPasswords ||
      !existing ||
      (existing.passwordSetupStatus !== "active" && !existing.temporaryPassword) ||
      (existing.passwordSetupStatus === "active" && !existing.passwordHash);
    const temporaryPassword = shouldGenerateTemporaryPassword
      ? generateTemporaryPassword()
      : null;
    const user = await db.user.upsert({
      where: { email: admin.email },
      update: {
        active: true,
        name: `${admin.initials} - ${admin.name}`,
        role: "admin",
        ...(temporaryPassword
          ? {
              lastGeneratedAt: new Date(),
              passwordHash: null,
              passwordSetAt: null,
              passwordSetupStatus: "temporary" as const,
              temporaryPassword,
            }
          : {}),
      },
      create: {
        active: true,
        email: admin.email,
        lastGeneratedAt: new Date(),
        name: `${admin.initials} - ${admin.name}`,
        passwordSetupStatus: "temporary",
        role: "admin",
        temporaryPassword: temporaryPassword ?? generateTemporaryPassword(),
      },
    });
    const invitePassword = temporaryPassword ?? user.temporaryPassword;

    if (sendInvites && invitePassword) {
      delivered.push(
        await sendSpikeAdminInvite({
          admin,
          temporaryPassword: invitePassword,
        }),
      );
      continue;
    }

    delivered.push({
      email: admin.email,
      status: temporaryPassword ? (existing ? "updated" : "created") : "active_not_sent",
    });
  }

  return {
    delivered,
    skippedReason: null,
  };
}

export function generateTemporaryPassword() {
  return `spike-${randomBytes(9).toString("base64url")}`;
}

export function buildSpikeAdminInviteMessage({
  email,
  loginUrl,
  name,
  temporaryPassword,
}: {
  email: string;
  loginUrl: string;
  name: string;
  temporaryPassword: string;
}) {
  const text = [
    `Hello ${name},`,
    "",
    "Your SPIKE SPOT INDEX administrator account is ready.",
    "",
    `Login: ${email}`,
    `Temporary password: ${temporaryPassword}`,
    "",
    `Open: ${loginUrl}`,
    "",
    "After signing in, set your permanent password. The temporary password will stop working after setup.",
  ].join("\n");
  const html = text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");

  return {
    html,
    subject: "SPIKE SPOT INDEX admin access",
    text,
  };
}

async function sendSpikeAdminInvite({
  admin,
  temporaryPassword,
}: {
  admin: SpikeAdminUser;
  temporaryPassword: string;
}): Promise<SpikeAdminInviteResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      email: admin.email,
      error: "RESEND_API_KEY is not configured",
      status: "skipped_no_email_provider",
    };
  }

  const loginUrl = new URL(
    "/login",
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://spike-ua.cr0pto.com",
  ).toString();
  const message = buildSpikeAdminInviteMessage({
    email: admin.email,
    loginUrl,
    name: admin.name,
    temporaryPassword,
  });
  const sender =
    process.env.SPIKE_ADMIN_INVITE_SENDER ??
    "SPIKE SPOT INDEX <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: sender,
        html: message.html,
        reply_to: process.env.SPIKE_ADMIN_INVITE_REPLY_TO || undefined,
        subject: message.subject,
        text: message.text,
        to: [admin.email],
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

    if (!response.ok) {
      await logAdminInvite(admin.email, "failed", payload.message ?? payload.name);
      return {
        email: admin.email,
        error: payload.message ?? payload.name ?? response.statusText,
        status: "failed",
      };
    }

    await logAdminInvite(admin.email, "sent", payload.id);
    return {
      email: admin.email,
      providerId: payload.id,
      status: "sent",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send error";
    await logAdminInvite(admin.email, "failed", message);
    return {
      email: admin.email,
      error: message,
      status: "failed",
    };
  }
}

async function logAdminInvite(email: string, status: string, details?: string) {
  if (!hasDatabaseUrl()) {
    return;
  }

  await db.auditLog.create({
    data: {
      action: "auth.admin_invite_email",
      afterJson: details ? { details, status } : { status },
      beforeJson: Prisma.JsonNull,
      entityId: email,
      entityType: "User",
      summary: `Spike admin invite email ${status} for ${email}.`,
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
