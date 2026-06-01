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
import { setPermanentPasswordWithSetupToken } from "@/lib/password-setup-token";
import { checkRateLimit, getRequestRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit({
    key: getRequestRateLimitKey(request, "setup-password"),
    limit: 8,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many password setup attempts. Try again shortly." },
      { status: 429 },
    );
  }

  const formData = await request.formData();
  const setupToken = String(formData.get("setupToken") ?? "");
  const user =
    parseDemoSessionCookieValue(request.cookies.get(DEMO_SESSION_COOKIE)?.value) ??
    (await getCurrentDemoUser());

  if (!user && !setupToken) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "");

  if (password.length < 8 || password !== confirmPassword) {
    const setupUrl = new URL("/setup-password", request.url);
    setupUrl.searchParams.set("error", "invalid");
    if (setupToken) {
      setupUrl.searchParams.set("token", setupToken);
    }
    if (next) {
      setupUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(setupUrl, 303);
  }

  if (setupToken) {
    const tokenUser = await setPermanentPasswordWithSetupToken({
      password,
      token: setupToken,
    });

    if (!tokenUser) {
      return NextResponse.redirect(
        new URL("/login?error=invalid_setup_token", request.url),
        303,
      );
    }

    return createSetupResponse({
      next,
      request,
      target: getSafeRoleRedirect(tokenUser.role, next),
      user: tokenUser,
    });
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  await setPermanentPasswordForUser(user, password);

  const updatedUser = {
    ...user,
    passwordSetupStatus: "active" as const,
  };
  return createSetupResponse({
    next,
    request,
    target: getSafeRoleRedirect(user.role, next),
    user: updatedUser,
  });
}

function createSetupResponse({
  request,
  target,
  user,
}: {
  next: string;
  request: NextRequest;
  target: string;
  user: Parameters<typeof createDemoSessionCookieValue>[0];
}) {
  const response = NextResponse.redirect(new URL(target, request.url), 303);
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
