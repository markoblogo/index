import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { runCortexAutonomyReadinessMonitor } from "@/lib/cortex-autonomy-readiness";
import { syncCortexEditorialShadowObservations } from "@/lib/cortex-editorial-shadow";
import { evaluateCortexEditorialPromotion } from "@/lib/cortex-editorial-promotion";
import {
  getDailyTelegramDigest,
  getWeeklyTelegramDigest,
  syncTelegramWorkspaceResources,
} from "@/lib/telegram-source-collector";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !isCronRequestAuthorized(request, [
      process.env.SPIKE_REPORT_SOURCE_CRON_SECRET,
      process.env.CRON_SECRET,
    ])
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedKind = url.searchParams.get("kind");
  const reportKind = requestedKind === "weekly" || requestedKind === "monthly" ? requestedKind : "daily";
  const date = url.searchParams.get("date");
  const week = url.searchParams.get("week");
  const month = url.searchParams.get("month") ?? date;

  if (reportKind === "monthly") {
    const sync = await syncTelegramWorkspaceResources("weekly");
    const editorialShadow = month
      ? await runEditorialShadow({ kind: "monthly", periodEndDate: month })
      : null;
    const editorialPromotion = await runEditorialPromotion("monthly");
    const autonomyReadiness = await runCortexAutonomyReadiness();
    return NextResponse.json({
      autonomyReadiness,
      editorialPromotion,
      editorialShadow,
      kind: "monthly",
      sync,
      triggeredAt: new Date().toISOString(),
    });
  }

  if (reportKind === "weekly") {
    const sync = await syncTelegramWorkspaceResources("weekly");
    const digest = week ? await getWeeklyTelegramDigest(week) : null;
    const editorialShadow = week
      ? await runEditorialShadow({ kind: "weekly", periodEndDate: week })
      : null;
    const editorialPromotion = await runEditorialPromotion("weekly");
    const autonomyReadiness = await runCortexAutonomyReadiness();
    return NextResponse.json({
      autonomyReadiness,
      digest,
      editorialPromotion,
      editorialShadow,
      kind: "weekly",
      sync,
      triggeredAt: new Date().toISOString(),
    });
  }

  const sync = await syncTelegramWorkspaceResources("daily");
  const digest = date ? await getDailyTelegramDigest(date) : null;
  const editorialShadow = date
    ? await runEditorialShadow({ kind: "daily", periodEndDate: date })
    : null;
  const editorialPromotion = await runEditorialPromotion("daily");
  const autonomyReadiness = await runCortexAutonomyReadiness();
  return NextResponse.json({
    autonomyReadiness,
    date: date ?? null,
    digest,
    editorialPromotion,
    editorialShadow,
    kind: "daily",
    sync,
    triggeredAt: new Date().toISOString(),
  });
}

async function runEditorialShadow(input: { kind: "daily" | "weekly" | "monthly"; periodEndDate: string }) {
  try {
    return await syncCortexEditorialShadowObservations(input);
  } catch {
    return { observations: [], skippedReason: "editorial_shadow_failed" };
  }
}

async function runEditorialPromotion(kind: "daily" | "weekly" | "monthly") {
  try {
    return await evaluateCortexEditorialPromotion({ kind });
  } catch {
    return { evaluations: [], policy: null, skippedReason: "editorial_promotion_failed" };
  }
}

async function runCortexAutonomyReadiness() {
  try {
    return await runCortexAutonomyReadinessMonitor();
  } catch {
    return { skippedReason: "cortex_autonomy_readiness_failed", snapshot: null };
  }
}
