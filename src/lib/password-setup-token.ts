import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { DemoRole, DemoUser } from "@/lib/demo-auth";
import { hashPassword } from "@/lib/password-hash";
import { tenantScopedWhere } from "@1d3x/data";

const PASSWORD_SETUP_TOKEN_BYTES = 32;
const PASSWORD_SETUP_TOKEN_TTL_HOURS = 48;

export type PasswordSetupTokenPreview = {
  email: string;
  expiresAt: Date;
  role: DemoRole;
};

export async function createPasswordSetupLinkForUser({
  baseUrl,
  email,
  next,
  userId,
}: {
  baseUrl: string;
  email: string;
  next?: string;
  userId: string;
}) {
  const token = await createPasswordSetupToken({ email, userId });
  const url = new URL("/setup-password", baseUrl);
  url.searchParams.set("token", token);

  if (next) {
    url.searchParams.set("next", next);
  }

  return url.toString();
}

export async function createPasswordSetupLinkForRespondent({
  baseUrl,
  email,
  next,
  respondentAuthAccountId,
  userId,
}: {
  baseUrl: string;
  email: string;
  next?: string;
  respondentAuthAccountId: string;
  userId?: string;
}) {
  const token = await createPasswordSetupToken({
    email,
    respondentAuthAccountId,
    userId,
  });
  const url = new URL("/setup-password", baseUrl);
  url.searchParams.set("token", token);

  if (next) {
    url.searchParams.set("next", next);
  }

  return url.toString();
}

export async function getPasswordSetupTokenPreview(
  token: string,
): Promise<PasswordSetupTokenPreview | null> {
  const row = await findUsablePasswordSetupToken(token);

  if (!row) {
    return null;
  }

  return {
    email: row.email,
    expiresAt: row.expiresAt,
    role: row.user?.role === "admin" || row.user?.role === "member"
      ? row.user.role
      : "respondent",
  };
}

export async function setPermanentPasswordWithSetupToken({
  password,
  token,
}: {
  password: string;
  token: string;
}): Promise<DemoUser | null> {
  const row = await findUsablePasswordSetupToken(token);

  if (!row) {
    return null;
  }

  const passwordHash = hashPassword(password.trim());
  const now = new Date();

  return db.$transaction(async (tx) => {
    await tx.passwordSetupToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    });

    if (row.respondentAuthAccount) {
      await tx.respondentAuthAccount.update({
        where: { id: row.respondentAuthAccount.id },
        data: {
          passwordHash,
          passwordSetAt: now,
          passwordSetupStatus: "active",
          temporaryPassword: null,
        },
      });
    }

    if (!row.user) {
      return null;
    }

    const user = await tx.user.update({
      include: {
        respondent: true,
      },
      where: { id: row.user.id },
      data: {
        passwordHash,
        passwordSetAt: now,
        passwordSetupStatus: "active",
        temporaryPassword: null,
      },
    });

    await tx.passwordSetupToken.updateMany({
      where: {
        id: { not: row.id },
        usedAt: null,
        OR: [
          { userId: user.id },
          ...(row.respondentAuthAccount
            ? [{ respondentAuthAccountId: row.respondentAuthAccount.id }]
            : []),
        ],
      },
      data: { usedAt: now },
    });

    await tx.auditLog.create({
      data: {
        tenantId: user.tenantId,
        indexProductId: user.indexProductId,
        actorUserId: user.id,
        actorRole: user.role,
        action: "auth.password_setup_link_completed",
        entityType: "User",
        entityId: user.id,
        summary: `Password setup link completed for ${user.email}.`,
      },
    });

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      username: user.email,
      role: user.role === "member" ? "member" : user.role === "admin" ? "admin" : "respondent",
      respondentId: user.respondentId ?? undefined,
      companyName: user.respondent?.legalName,
      respondentName: user.respondent?.legalName,
      passwordSetupStatus: "active",
      issuedAt: Math.floor(now.getTime() / 1000),
      expiresAt: Math.floor(now.getTime() / 1000) + 60 * 60 * 8,
    };
  });
}

export function digestPasswordSetupToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

async function createPasswordSetupToken({
  email,
  respondentAuthAccountId,
  userId,
}: {
  email: string;
  respondentAuthAccountId?: string;
  userId?: string;
}) {
  const token = randomBytes(PASSWORD_SETUP_TOKEN_BYTES).toString("base64url");
  const tenantScope = tenantScopedWhere();
  const expiresAt = new Date(
    Date.now() + PASSWORD_SETUP_TOKEN_TTL_HOURS * 60 * 60 * 1000,
  );

  await db.passwordSetupToken.create({
    data: {
      ...tenantScope,
      email,
      expiresAt,
      respondentAuthAccountId,
      tokenDigest: digestPasswordSetupToken(token),
      userId,
    },
  });

  return token;
}

async function findUsablePasswordSetupToken(token: string) {
  if (!token) {
    return null;
  }

  const tenantScope = tenantScopedWhere();

  return db.passwordSetupToken.findFirst({
    include: {
      respondentAuthAccount: true,
      user: {
        include: {
          respondent: true,
        },
      },
    },
    where: {
      ...tenantScope,
      tokenDigest: digestPasswordSetupToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}
