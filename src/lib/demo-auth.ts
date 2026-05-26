import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { isSpikeAdminEmail } from "@/lib/spike-admin-access";

export const LEGACY_DEMO_SESSION_COOKIE = "uga_demo_session";
export const DEMO_SESSION_COOKIE =
  getActiveIndexConfig().id === "spike-ua"
    ? "spike_index_session"
    : LEGACY_DEMO_SESSION_COOKIE;

export type DemoRole = "admin" | "respondent" | "member";

export type DemoUser = {
  userId: string;
  email: string;
  name: string;
  username: string;
  role: DemoRole;
  respondentId?: string;
  companyName?: string;
  respondentName?: string;
  passwordSetupStatus?: "temporary" | "active";
  issuedAt: number;
  expiresAt: number;
};

type DemoSessionPayload = Omit<DemoUser, "respondentName">;

export const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 8;

export async function getCurrentDemoUser(): Promise<DemoUser | null> {
  const cookieStore = await cookies();
  const cookie =
    cookieStore.get(DEMO_SESSION_COOKIE) ??
    (DEMO_SESSION_COOKIE === LEGACY_DEMO_SESSION_COOKIE
      ? undefined
      : cookieStore.get(LEGACY_DEMO_SESSION_COOKIE));

  return parseDemoSessionCookieValue(cookie?.value);
}

export function parseDemoSessionCookieValue(value?: string): DemoUser | null {
  if (!value) {
    return null;
  }

  const payload = verifySessionCookie(value);

  if (!payload || payload.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    ...payload,
    respondentName: payload.companyName,
  };
}

export async function requireDemoRole(role: DemoRole) {
  const user = await getCurrentDemoUser();

  if (!user) {
    const openAccessUser = await getOpenDemoAccessUser(role);

    if (openAccessUser) {
      return openAccessUser;
    }

    redirect(`/login?next=${encodeURIComponent(getRoleHome(role))}`);
  }

  if (user.role !== role) {
    if (
      role === "respondent" &&
      user.role === "admin" &&
      getActiveIndexConfig().id === "spike-ua" &&
      isSpikeAdminEmail(user.email)
    ) {
      const previewUser = await getSpikeAdminRespondentPreviewUser(user);

      if (previewUser) {
        return previewUser;
      }
    }

    const openAccessUser = await getOpenDemoAccessUser(role);

    if (openAccessUser) {
      return openAccessUser;
    }

    redirect(getRoleHome(user.role));
  }

  if (
    (role === "admin" || role === "respondent") &&
    hasDatabaseUrl() &&
    user.passwordSetupStatus !== "active"
  ) {
    redirect(
      `/setup-password?next=${encodeURIComponent(getRoleHome(role))}`,
    );
  }

  return user;
}

async function getOpenDemoAccessUser(role: DemoRole): Promise<DemoUser | null> {
  if (process.env.UGA_INDEX_OPEN_DEMO_ACCESS !== "enabled") {
    return null;
  }

  if (getActiveIndexConfig().id === "spike-ua") {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (role === "admin") {
    const dbUser = await findOpenDemoDbUser("admin");

    return {
      userId: dbUser?.id ?? "open-demo-admin",
      email: dbUser?.email ?? "admin@uga.ua",
      name: dbUser?.name ?? "UGA Administrator",
      username: dbUser?.email ?? "admin@uga.ua",
      role: "admin",
      passwordSetupStatus: "active",
      issuedAt: now,
      expiresAt: now + DEMO_SESSION_TTL_SECONDS,
    };
  }

  if (role === "respondent") {
    const dbUser = await findOpenDemoDbUser("respondent");
    const respondent = dbUser?.respondent;

    return {
      userId: dbUser?.id ?? "open-demo-respondent",
      email: dbUser?.email ?? "bunge@uga-index.demo",
      name: dbUser?.name ?? "Bunge Ukraine respondent",
      username: dbUser?.email ?? "bunge@uga-index.demo",
      role: "respondent",
      respondentId: dbUser?.respondentId ?? "bunge-ukraine",
      companyName: respondent?.legalName ?? "ПІІ «БУНГЕ ЮКРЕЙН»",
      respondentName: respondent?.legalName ?? "ПІІ «БУНГЕ ЮКРЕЙН»",
      passwordSetupStatus: "active",
      issuedAt: now,
      expiresAt: now + DEMO_SESSION_TTL_SECONDS,
    };
  }

  return null;
}

async function getSpikeAdminRespondentPreviewUser(
  adminUser: DemoUser,
): Promise<DemoUser | null> {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const respondent = await db.respondent.findFirst({
    orderBy: { createdAt: "asc" },
    where: {
      active: true,
      collectionMode: "self_service",
      id: { not: process.env.MN7R_INDEX_RESPONDENT_CODE ?? "MN7R_MONITOR" },
      status: "active",
    },
  });

  if (!respondent) {
    return null;
  }

  return {
    userId: adminUser.userId,
    email: adminUser.email,
    name: `${adminUser.name} respondent preview`,
    username: adminUser.email,
    role: "respondent",
    respondentId: respondent.id,
    companyName: respondent.legalName,
    respondentName: respondent.legalName,
    passwordSetupStatus: "active",
    issuedAt: adminUser.issuedAt,
    expiresAt: adminUser.expiresAt,
  };
}

async function findOpenDemoDbUser(role: Exclude<DemoRole, "member">) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  try {
    return await db.user.findFirst({
      include: {
        respondent: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      where: {
        active: true,
        role,
        ...(role === "respondent"
          ? {
              respondent: {
                status: "active",
              },
            }
          : {}),
      },
    });
  } catch (error) {
    console.warn("Open demo access DB lookup failed.", error);
    return null;
  }
}

type SessionSourceUser = {
  companyName?: string;
  email: string;
  name: string;
  passwordSetupStatus?: "temporary" | "active";
  respondentId?: string;
  role: DemoRole;
  userId: string;
};

export async function setDemoSession(user: SessionSourceUser) {
  const cookieStore = await cookies();
  const sessionValue = createDemoSessionCookieValue(user);
  const sessionCookie = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  } as const;

  cookieStore.set(DEMO_SESSION_COOKIE, sessionValue, sessionCookie);

  if (DEMO_SESSION_COOKIE !== LEGACY_DEMO_SESSION_COOKIE) {
    cookieStore.set(LEGACY_DEMO_SESSION_COOKIE, sessionValue, sessionCookie);
  }
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  cookieStore.delete(LEGACY_DEMO_SESSION_COOKIE);
}

export function getRoleHome(role: DemoRole) {
  if (role === "admin") {
    return "/admin/daily-inputs";
  }

  if (role === "respondent") {
    return "/respondent";
  }

  return "/member";
}

export function getSafeRoleRedirect(role: DemoRole, next?: string | null) {
  if (next && isSafeRolePath(role, next)) {
    return next;
  }

  return getRoleHome(role);
}

export function createDemoSessionCookieValue(user: SessionSourceUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: DemoSessionPayload = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    username: user.email,
    role: user.role,
    respondentId: user.role === "respondent" ? user.respondentId : undefined,
    companyName: user.role === "respondent" ? user.companyName : undefined,
    passwordSetupStatus: user.passwordSetupStatus,
    issuedAt: now,
    expiresAt: now + DEMO_SESSION_TTL_SECONDS,
  };

  return encodePayload(payload);
}

function encodePayload(payload: DemoSessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `session.${encodedPayload}.${signPayload(encodedPayload)}`;
}

function verifySessionCookie(value: string): DemoSessionPayload | null {
  const encodedPayload = value.startsWith("session.")
    ? verifySignedCookie(value)
    : value.startsWith("demo.")
      ? value.slice("demo.".length)
      : verifyLegacySignedCookie(value);

  if (!encodedPayload) {
    return null;
  }

  return parseSessionPayload(encodedPayload);
}

function parseSessionPayload(encodedPayload: string): DemoSessionPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<DemoSessionPayload>;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.username !== "string" ||
      !isStoredRole(parsed.role) ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      name: parsed.name,
      username: parsed.username,
      role: parsed.role,
      respondentId:
        parsed.role === "respondent" && typeof parsed.respondentId === "string"
          ? parsed.respondentId
          : undefined,
      companyName:
        parsed.role === "respondent" && typeof parsed.companyName === "string"
          ? parsed.companyName
          : undefined,
      passwordSetupStatus:
        parsed.passwordSetupStatus === "active" ? "active" : "temporary",
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function verifySignedCookie(value: string) {
  const [, encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = signPayload(encodedPayload);
  const actualSignature = Buffer.from(signature);
  const expectedSignature = Buffer.from(expected);

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  return encodedPayload;
}

function verifyLegacySignedCookie(value: string) {
  const [encodedPayload, signature] = value.split(".");
  return encodedPayload && signature ? encodedPayload : null;
}

function signPayload(encodedPayload: string) {
  const secret = process.env.DEMO_AUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("DEMO_AUTH_SECRET is required in production.");
  }

  return createHmac("sha256", secret || "local-preview-secret")
    .update(encodedPayload)
    .digest("base64url");
}

function isStoredRole(value: unknown): value is DemoRole {
  return value === "admin" || value === "respondent" || value === "member";
}

function isSafeRolePath(role: DemoRole, path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return false;
  }

  if (role === "admin") {
    return path === "/admin" || path.startsWith("/admin/");
  }

  if (role === "respondent") {
    return path === "/respondent" || path.startsWith("/respondent/");
  }

  return path === "/member" || path.startsWith("/member/");
}
