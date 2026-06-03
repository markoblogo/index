import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const email = process.env.UGA_ADMIN_EMAIL ?? "liudmyla.kaplun@uga.ua";
const name = process.env.UGA_ADMIN_NAME ?? "Людмила Каплун";
const temporaryPassword = process.env.UGA_ADMIN_TEMPORARY_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

if (!temporaryPassword || temporaryPassword.length < 8) {
  throw new Error("UGA_ADMIN_TEMPORARY_PASSWORD must be at least 8 characters.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      active: true,
      lastGeneratedAt: new Date(),
      name,
      passwordHash: null,
      passwordSetAt: null,
      passwordSetupStatus: "temporary",
      respondentId: null,
      role: "admin",
      temporaryPassword,
    },
    create: {
      active: true,
      email,
      lastGeneratedAt: new Date(),
      name,
      passwordSetupStatus: "temporary",
      role: "admin",
      temporaryPassword,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "auth.uga_admin_provisioned",
      actorRole: "admin",
      entityId: user.id,
      entityType: "User",
      summary: `UGA admin temporary access provisioned for ${email}.`,
    },
  });

  console.log(
    JSON.stringify({
      email,
      name,
      passwordSetupStatus: "temporary",
      userId: user.id,
    }),
  );
} finally {
  await prisma.$disconnect();
}
