import "server-only";

import { db, hasDatabaseUrl } from "@/lib/db";
import type { DemoUser } from "@/lib/demo-auth";
import { hashPassword } from "@/lib/password-hash";

export async function setPermanentPasswordForUser(
  user: DemoUser,
  password: string,
) {
  if (!hasDatabaseUrl()) {
    return;
  }

  const normalizedPassword = password.trim();
  const passwordHash = hashPassword(normalizedPassword);
  const now = new Date();

  if (user.role === "respondent" && user.respondentId) {
    await db.$transaction(async (tx) => {
      await tx.respondentAuthAccount.update({
        where: { respondentId: user.respondentId },
        data: {
          passwordHash,
          passwordSetAt: now,
          passwordSetupStatus: "active",
          temporaryPassword: null,
        },
      });
      await tx.user.updateMany({
        where: { id: user.userId },
        data: {
          passwordHash,
          passwordSetAt: now,
          passwordSetupStatus: "active",
          temporaryPassword: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: user.userId,
          actorRole: user.role,
          action: "auth.password_setup_completed",
          entityType: "User",
          entityId: user.userId,
          summary: `Password setup completed for ${user.email}.`,
        },
      });
    });
    return;
  }

  await db.$transaction(async (tx) => {
    const dbUser = await tx.user.findFirst({
      where: {
        active: true,
        role: user.role,
        OR: [{ id: user.userId }, { email: user.email }],
      },
      select: { id: true, email: true },
    });

    if (!dbUser) {
      throw new Error(`Password setup user was not found for ${user.email}.`);
    }

    await tx.user.update({
      where: { id: dbUser.id },
      data: {
        passwordHash,
        passwordSetAt: now,
        passwordSetupStatus: "active",
        temporaryPassword: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: dbUser.id,
        actorRole: user.role,
        action: "auth.password_setup_completed",
        entityType: "User",
        entityId: dbUser.id,
        summary: `Password setup completed for ${dbUser.email}.`,
      },
    });
  });
}
