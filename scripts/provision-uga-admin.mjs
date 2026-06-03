import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "node:crypto";

const email = process.env.UGA_ADMIN_EMAIL ?? "liudmyla.kaplun@uga.ua";
const name = process.env.UGA_ADMIN_NAME ?? "Людмила Каплун";
const temporaryPassword = process.env.UGA_ADMIN_TEMPORARY_PASSWORD;
const shouldActivatePassword =
  process.env.UGA_ADMIN_PASSWORD_SETUP_STATUS === "active";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

if (!temporaryPassword || temporaryPassword.length < 8) {
  throw new Error("UGA_ADMIN_TEMPORARY_PASSWORD must be at least 8 characters.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = shouldActivatePassword
    ? hashPassword(temporaryPassword)
    : null;
  const passwordSetAt = shouldActivatePassword ? new Date() : null;
  const passwordSetupStatus = shouldActivatePassword ? "active" : "temporary";
  const storedTemporaryPassword = shouldActivatePassword
    ? null
    : temporaryPassword;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      active: true,
      lastGeneratedAt: new Date(),
      name,
      passwordHash,
      passwordSetAt,
      passwordSetupStatus,
      respondentId: null,
      role: "admin",
      temporaryPassword: storedTemporaryPassword,
    },
    create: {
      active: true,
      email,
      lastGeneratedAt: new Date(),
      name,
      passwordHash,
      passwordSetAt,
      passwordSetupStatus,
      role: "admin",
      temporaryPassword: storedTemporaryPassword,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: shouldActivatePassword
        ? "auth.uga_admin_password_activated"
        : "auth.uga_admin_provisioned",
      actorRole: "admin",
      entityId: user.id,
      entityType: "User",
      summary: shouldActivatePassword
        ? `UGA admin password activated for ${email}.`
        : `UGA admin temporary access provisioned for ${email}.`,
    },
  });

  console.log(
    JSON.stringify({
      email,
      name,
      passwordSetupStatus,
      userId: user.id,
    }),
  );
} finally {
  await prisma.$disconnect();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString(
    "base64url",
  );

  return `pbkdf2$120000$${salt}$${hash}`;
}
