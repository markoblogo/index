import { NextRequest, NextResponse } from "next/server";
import { authenticateAllowlistedUser } from "@/lib/demo-allowlist";
import { hasDatabaseUrl } from "@/lib/db";
import {
  createDemoSessionCookieValue,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  getSafeRoleRedirect,
  LEGACY_DEMO_SESSION_COOKIE,
} from "@/lib/demo-auth";
import { isLocale } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const login = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const next = String(formData.get("next") ?? "");
  const user = await authenticateAllowlistedUser({ login, password });

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("locale", locale);
    loginUrl.searchParams.set("error", "invalid");

    if (next) {
      loginUrl.searchParams.set("next", next);
    }

    return NextResponse.redirect(loginUrl, 303);
  }

  const target =
    hasDatabaseUrl() && user.passwordSetupStatus === "temporary"
      ? `/setup-password?next=${encodeURIComponent(
          getSafeRoleRedirect(user.role, next),
        )}`
      : getSafeRoleRedirect(user.role, next);
  const redirectUrl = new URL(target, request.url);
  const response = NextResponse.redirect(redirectUrl, 303);
  const sessionValue = createDemoSessionCookieValue(user);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  };

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: sessionValue,
    ...cookieOptions,
  });
  mirrorLegacySessionCookie(response, sessionValue, cookieOptions);

  return response;
}

function mirrorLegacySessionCookie(
  response: NextResponse,
  value: string,
  options: {
    httpOnly: boolean;
    maxAge: number;
    path: string;
    sameSite: "lax";
    secure: boolean;
  },
) {
  if (DEMO_SESSION_COOKIE === LEGACY_DEMO_SESSION_COOKIE) {
    return;
  }

  response.cookies.set({
    name: LEGACY_DEMO_SESSION_COOKIE,
    value,
    ...options,
  });
}

function normalizeLocale(value: string) {
  return isLocale(value) ? value : "en";
}
