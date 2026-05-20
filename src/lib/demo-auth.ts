import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DemoAllowlistUser } from "@/lib/demo-allowlist";

export const DEMO_SESSION_COOKIE = "uga_demo_session";

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
  issuedAt: number;
  expiresAt: number;
};

type DemoSessionPayload = Omit<DemoUser, "respondentName">;

export const DEMO_SESSION_TTL_SECONDS = 60 * 60 * 8;

export async function getCurrentDemoUser(): Promise<DemoUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(DEMO_SESSION_COOKIE);

  if (!cookie?.value) {
    return null;
  }

  const payload = verifySessionCookie(cookie.value);

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
    redirect(`/login?next=${encodeURIComponent(getRoleHome(role))}`);
  }

  if (user.role !== role) {
    redirect(getRoleHome(user.role));
  }

  return user;
}

export async function setDemoSession(user: DemoAllowlistUser) {
  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, createDemoSessionCookieValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });
}

export async function clearDemoSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
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

export function createDemoSessionCookieValue(user: DemoAllowlistUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: DemoSessionPayload = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    username: user.email,
    role: user.role,
    respondentId: user.role === "respondent" ? user.respondentId : undefined,
    companyName: user.role === "respondent" ? user.companyName : undefined,
    issuedAt: now,
    expiresAt: now + DEMO_SESSION_TTL_SECONDS,
  };

  return encodePayload(payload);
}

function encodePayload(payload: DemoSessionPayload) {
  return `demo.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

function verifySessionCookie(value: string): DemoSessionPayload | null {
  const encodedPayload = value.startsWith("demo.")
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
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function verifyLegacySignedCookie(value: string) {
  const [encodedPayload, signature] = value.split(".");
  return encodedPayload && signature ? encodedPayload : null;
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
