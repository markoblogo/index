import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";
import { isLocale } from "@/lib/i18n";
import {
  buildRequestRateLimitKey,
  consumeRequestRateLimit,
} from "@/lib/request-rate-limit";

const PASSWORD_RESET_RATE_LIMIT = { limit: 3, windowMs: 15 * 60 * 1000 };

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

  const rateLimit = consumeRequestRateLimit(
    buildRequestRateLimitKey(request, "password-reset", normalizedLogin),
    PASSWORD_RESET_RATE_LIMIT,
  );
  if (!rateLimit.allowed) {
    loginUrl.searchParams.set("reset", "sent");
    const response = NextResponse.redirect(loginUrl, 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  await requestPasswordReset(normalizedLogin, locale);
  loginUrl.searchParams.set("reset", "sent");

  return NextResponse.redirect(loginUrl, 303);
}

function normalizeLocale(value: string) {
  return isLocale(value) ? value : "en";
}
