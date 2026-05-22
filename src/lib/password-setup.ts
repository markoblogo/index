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

  const passwordHash = hashPassword(password);
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
    await tx.user.update({
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
}
