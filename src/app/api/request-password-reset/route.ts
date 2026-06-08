import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";
import { isLocale } from "@/lib/i18n";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const login = String(formData.get("email") ?? "");
  const locale = normalizeLocale(String(formData.get("locale") ?? ""));
  const normalizedLogin = login.trim();
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("locale", locale);

  if (!normalizedLogin) {
    loginUrl.searchParams.set("reset", "missing");
    return NextResponse.redirect(loginUrl, 303);
  }

  await requestPasswordReset(normalizedLogin, locale);
  loginUrl.searchParams.set("reset", "sent");

  return NextResponse.redirect(loginUrl, 303);
}

function normalizeLocale(value: string) {
  return isLocale(value) ? value : "en";
}
