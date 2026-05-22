import { NextRequest, NextResponse } from "next/server";
import { authenticateAllowlistedUser } from "@/lib/demo-allowlist";
import {
  createDemoSessionCookieValue,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  getSafeRoleRedirect,
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

  const redirectUrl = new URL(getSafeRoleRedirect(user.role, next), request.url);
  const response = NextResponse.redirect(redirectUrl, 303);

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: createDemoSessionCookieValue(user),
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });

  return response;
}

function normalizeLocale(value: string) {
  return isLocale(value) ? value : "en";
}
