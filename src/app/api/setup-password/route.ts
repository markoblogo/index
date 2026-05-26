import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSessionCookieValue,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  getCurrentDemoUser,
  getSafeRoleRedirect,
  LEGACY_DEMO_SESSION_COOKIE,
  parseDemoSessionCookieValue,
} from "@/lib/demo-auth";
import { setPermanentPasswordForUser } from "@/lib/password-setup";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const setupSession = String(formData.get("setupSession") ?? "");
  const user =
    parseDemoSessionCookieValue(request.cookies.get(DEMO_SESSION_COOKIE)?.value) ??
    parseDemoSessionCookieValue(setupSession) ??
    (await getCurrentDemoUser());

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "");

  if (password.length < 8 || password !== confirmPassword) {
    const setupUrl = new URL("/setup-password", request.url);
    setupUrl.searchParams.set("error", "invalid");
    if (next) {
      setupUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(setupUrl, 303);
  }

  await setPermanentPasswordForUser(user, password);

  const updatedUser = {
    ...user,
    passwordSetupStatus: "active" as const,
  };
  const response = NextResponse.redirect(
    new URL(getSafeRoleRedirect(user.role, next), request.url),
    303,
  );
  const sessionValue = createDemoSessionCookieValue(updatedUser);
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
