import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSessionCookieValue,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  getCurrentDemoUser,
  getSafeRoleRedirect,
} from "@/lib/demo-auth";
import { setPermanentPasswordForUser } from "@/lib/password-setup";

export async function POST(request: NextRequest) {
  const [formData, user] = await Promise.all([
    request.formData(),
    getCurrentDemoUser(),
  ]);

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

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: createDemoSessionCookieValue(updatedUser),
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  });

  return response;
}
