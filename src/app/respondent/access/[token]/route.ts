import { NextRequest, NextResponse } from "next/server";
import {
  createDemoSessionCookieValue,
  DEMO_SESSION_COOKIE,
  DEMO_SESSION_TTL_SECONDS,
  LEGACY_DEMO_SESSION_COOKIE,
} from "@/lib/demo-auth";
import { db, hasDatabaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!hasDatabaseUrl()) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const { token } = await params;
  const surveyToken = await db.respondentSurveyToken.findUnique({
    include: {
      respondent: {
        include: {
          authAccount: true,
        },
      },
    },
    where: { token },
  });

  if (
    !surveyToken ||
    surveyToken.expiresAt <= new Date() ||
    surveyToken.respondent.status !== "active"
  ) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  await db.respondentSurveyToken.update({
    where: { id: surveyToken.id },
    data: { usedAt: new Date() },
  });
  const user = await db.user.findFirst({
    where: {
      active: true,
      respondentId: surveyToken.respondentId,
      role: "respondent",
    },
  });

  const response = NextResponse.redirect(new URL("/respondent", request.url), 303);
  const sessionValue = createDemoSessionCookieValue({
    userId: user?.id ?? `respondent-${surveyToken.respondentId}`,
    email: surveyToken.respondent.authAccount?.loginEmail ?? surveyToken.email,
    name: `${surveyToken.respondent.legalName} respondent`,
    role: "respondent",
    respondentId: surveyToken.respondentId,
    companyName: surveyToken.respondent.legalName,
    passwordSetupStatus:
      surveyToken.respondent.authAccount?.passwordSetupStatus === "active"
        ? "active"
        : "temporary",
  });
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
  if (DEMO_SESSION_COOKIE !== LEGACY_DEMO_SESSION_COOKIE) {
    response.cookies.set({
      name: LEGACY_DEMO_SESSION_COOKIE,
      value: sessionValue,
      ...cookieOptions,
    });
  }

  return response;
}
