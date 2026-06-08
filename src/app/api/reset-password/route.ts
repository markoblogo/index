import { NextRequest, NextResponse } from "next/server";
import {
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  getRoleHome,
  LEGACY_DEMO_SESSION_COOKIE,
} from "@/lib/demo-auth";
import { completePasswordReset } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8 || password !== confirmPassword) {
    const resetUrl = new URL("/reset-password", request.url);
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(resetUrl, 303);
  }

  const result = await completePasswordReset(token, password);

  if (!result) {
    const resetUrl = new URL("/reset-password", request.url);
    resetUrl.searchParams.set("error", "expired");
    return NextResponse.redirect(resetUrl, 303);
  }

  const redirectUrl = new URL(getRoleHome(result.role), request.url);
  const response = NextResponse.redirect(redirectUrl, 303);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: DEMO_SESSION_TTL_SECONDS,
  };

  response.cookies.set({
    name: DEMO_SESSION_COOKIE,
    value: result.sessionValue,
    ...cookieOptions,
  });

  if (DEMO_SESSION_COOKIE !== LEGACY_DEMO_SESSION_COOKIE) {
    response.cookies.set({
      name: LEGACY_DEMO_SESSION_COOKIE,
      value: result.sessionValue,
      ...cookieOptions,
    });
  }

  return response;
}
