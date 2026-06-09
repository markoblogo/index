import { NextRequest, NextResponse } from "next/server";
import {
  saveRespondentSurvey,
  type RespondentSurveySubmitResult,
} from "@/lib/respondent-survey";
import { getCurrentDemoUser } from "@/lib/demo-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const user = await getCurrentDemoUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (user.role !== "respondent") {
    return NextResponse.json(
      { ok: false, error: "Forbidden" },
      { status: 403 },
    );
  }

  try {
    const saved = (await saveRespondentSurvey(formData, user, {
      redirectOnSuccess: false,
    })) as RespondentSurveySubmitResult;

    const nextUrl = new URL("/respondent", request.url);
    const shouldRedirect = shouldFallbackToRedirect(request);

    if (shouldRedirect) {
      nextUrl.searchParams.set("locale", saved.locale);
      nextUrl.searchParams.set("saved", saved.status);
      if (saved.respondentChannel === "telegram") {
        nextUrl.searchParams.set("channel", "telegram");
        nextUrl.searchParams.set("inTelegram", "1");
      }
      return NextResponse.redirect(nextUrl, 303);
    }

    return NextResponse.json({ ok: true, saved });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to save respondent survey." },
      { status: 500 },
    );
  }
}

function shouldFallbackToRedirect(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  const fetchMode = request.headers.get("sec-fetch-mode") ?? "";
  const destination = request.headers.get("sec-fetch-dest") ?? "";

  return (
    accept.includes("text/html") ||
    (fetchMode === "navigate" && destination === "document")
  );
}
