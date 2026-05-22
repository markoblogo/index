import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://user:password@localhost:5432/uga_index?schema=public";
const adapter = new PrismaPg({ connectionString });

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function allowMockFallback() {
  if (process.env.UGA_INDEX_RUNTIME_MODE === "production") {
    return false;
  }

  if (process.env.UGA_INDEX_RUNTIME_MODE === "demo") {
    return true;
  }

  return process.env.NODE_ENV !== "production";
}
