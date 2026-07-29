import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { runCortexAutonomyReadinessMonitor } from "@/lib/cortex-autonomy-readiness";
import {
  runCortexEditorialMatchDiagnostics,
  runCortexEditorialUnknownReasonDebug,
} from "@/lib/cortex-editorial-match-diagnostics";
import {
  backfillCortexEditorialEvaluationCorpus,
  normalizeCortexEditorialCorpusBackfillLimit,
} from "@/lib/cortex-editorial-corpus-backfill";
import { getActiveIndexConfig } from "@/lib/index-platform";
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
  const reportKind =
    requestedKind === "weekly" || requestedKind === "monthly"
      ? requestedKind
      : "daily";
  const date = url.searchParams.get("date");
  const week = url.searchParams.get("week");
  const month = url.searchParams.get("month") ?? date;
  const backfillRequested = url.searchParams.get("backfill") === "1";
  const backfillLimit = normalizeCortexEditorialCorpusBackfillLimit(
    Number(url.searchParams.get("backfill_limit")) || undefined,
  );
  const backfillPages = normalizeBackfillPageLimit(
    Number(url.searchParams.get("backfill_pages")) || undefined,
  );
  const tenantId = normalizeTenantId(url.searchParams.get("tenant"));
  const debugUnknownMode = url.searchParams.get("debug_unknown") === "1";
  const unknownReasonLimit = normalizeUnknownReasonLimit(
    Number(url.searchParams.get("unknown_limit")),
    80,
    200,
  );
  const debugLimit = normalizeUnknownReasonLimit(
    Number(url.searchParams.get("limit")),
    Math.min(240, Math.max(30, backfillLimit * 2)),
    240,
  );
  const skippedSync = {
    channels: 0,
    posts: 0,
    skippedReason: "skipped_for_editorial_backfill",
  };
  const activeTenant = tenantId ?? getActiveIndexConfig().id;

  return runWithTenant(activeTenant, async () => {
    if (reportKind === "monthly") {
      const sync = backfillRequested
        ? skippedSync
        : await syncTelegramWorkspaceResources("weekly");
      const editorialShadow =
        !backfillRequested && month
          ? await runEditorialShadow({ kind: "monthly", periodEndDate: month })
          : null;
      const editorialPromotion = backfillRequested
        ? null
        : await runEditorialPromotion("monthly");
      const editorialBackfill = backfillRequested
        ? await runEditorialCorpusBackfill({
            limitPerKind: backfillLimit,
            maxPages: backfillPages,
          })
        : null;
      const autonomyReadiness =
        editorialBackfill?.readiness ?? (await runCortexAutonomyReadiness());
      const benchmarkDiagnostics =
        editorialBackfill?.diagnostics ??
        (await runCortexBenchmarkDiagnostics("monthly"));
      const debugUnknown = debugUnknownMode
        ? await runCortexEditorialUnknownReasonDebug({
            kind: "monthly",
            tenantId: activeTenant,
            limit: debugLimit,
            sampleLimit: unknownReasonLimit,
          })
        : null;
      return NextResponse.json({
        autonomyReadiness,
        benchmarkDiagnostics,
        debugUnknown,
        editorialBackfill,
        editorialPromotion,
        editorialShadow,
        kind: "monthly",
        sync,
        triggeredAt: new Date().toISOString(),
      });
    }

    if (reportKind === "weekly") {
      const sync = backfillRequested
        ? skippedSync
        : await syncTelegramWorkspaceResources("weekly");
      const digest =
        !backfillRequested && week ? await getWeeklyTelegramDigest(week) : null;
      const editorialShadow =
        !backfillRequested && week
          ? await runEditorialShadow({ kind: "weekly", periodEndDate: week })
          : null;
      const editorialPromotion = backfillRequested
        ? null
        : await runEditorialPromotion("weekly");
      const editorialBackfill = backfillRequested
        ? await runEditorialCorpusBackfill({
            limitPerKind: backfillLimit,
            maxPages: backfillPages,
          })
        : null;
      const autonomyReadiness =
        editorialBackfill?.readiness ?? (await runCortexAutonomyReadiness());
      const benchmarkDiagnostics =
        editorialBackfill?.diagnostics ??
        (await runCortexBenchmarkDiagnostics("weekly"));
      const debugUnknown = debugUnknownMode
        ? await runCortexEditorialUnknownReasonDebug({
            kind: "weekly",
            tenantId: activeTenant,
            limit: debugLimit,
            sampleLimit: unknownReasonLimit,
          })
        : null;
      return NextResponse.json({
        autonomyReadiness,
        benchmarkDiagnostics,
        debugUnknown,
        editorialBackfill,
        digest,
        editorialPromotion,
        editorialShadow,
        kind: "weekly",
        sync,
        triggeredAt: new Date().toISOString(),
      });
    }

    const sync = backfillRequested
      ? skippedSync
      : await syncTelegramWorkspaceResources("daily");
    const digest =
      !backfillRequested && date ? await getDailyTelegramDigest(date) : null;
    const editorialShadow =
      !backfillRequested && date
        ? await runEditorialShadow({ kind: "daily", periodEndDate: date })
        : null;
    const editorialPromotion = backfillRequested
      ? null
      : await runEditorialPromotion("daily");
    const editorialBackfill = backfillRequested
      ? await runEditorialCorpusBackfill({
          limitPerKind: backfillLimit,
          maxPages: backfillPages,
        })
      : null;
    const autonomyReadiness =
      editorialBackfill?.readiness ?? (await runCortexAutonomyReadiness());
    const benchmarkDiagnostics =
      editorialBackfill?.diagnostics ??
      (await runCortexBenchmarkDiagnostics("daily"));
    const debugUnknown = debugUnknownMode
      ? await runCortexEditorialUnknownReasonDebug({
          kind: "daily",
          tenantId: activeTenant,
          limit: debugLimit,
          sampleLimit: unknownReasonLimit,
        })
      : null;
    return NextResponse.json({
      autonomyReadiness,
      benchmarkDiagnostics,
      debugUnknown,
      date: date ?? null,
      editorialBackfill,
      digest,
      editorialPromotion,
      editorialShadow,
      kind: "daily",
      sync,
      triggeredAt: new Date().toISOString(),
    });
  });
}

async function runEditorialShadow(input: {
  kind: "daily" | "weekly" | "monthly";
  periodEndDate: string;
}) {
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
    return {
      evaluations: [],
      policy: null,
      skippedReason: "editorial_promotion_failed",
    };
  }
}

async function runCortexAutonomyReadiness() {
  try {
    return await runCortexAutonomyReadinessMonitor();
  } catch {
    return {
      skippedReason: "cortex_autonomy_readiness_failed",
      snapshot: null,
    };
  }
}

async function runEditorialCorpusBackfill(input: {
  limitPerKind: number;
  maxPages: number;
}) {
  try {
    const archiveSync = await syncTelegramWorkspaceResources("weekly", {
      channelHandles: ["@spike_brokers"],
      maxPagesPerChannel: input.maxPages,
    });
    return {
      archiveSync,
      ...(await backfillCortexEditorialEvaluationCorpus({
        limitPerKind: input.limitPerKind,
      })),
    };
  } catch {
    return {
      archiveSync: null,
      diagnostics: null,
      readiness: null,
      skippedReason: "editorial_corpus_backfill_failed",
      tracks: [],
    };
  }
}

function normalizeBackfillPageLimit(value: number | undefined) {
  const parsed = Number.isFinite(value) ? value! : 3;
  return Math.max(1, Math.min(12, Math.trunc(parsed)));
}

function normalizeUnknownReasonLimit(
  value: number,
  fallback: number,
  max: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(value)));
}

function normalizeTenantId(value: string | null) {
  if (value === "spike-ua" || value === "uga-ua") return value;
  return null;
}

function runWithTenant<T>(tenantId: string, task: () => Promise<T>) {
  const previousTenant = process.env.INDEX_TENANT;
  const previousPublicTenant = process.env.NEXT_PUBLIC_INDEX_TENANT;
  process.env.INDEX_TENANT = tenantId;
  process.env.NEXT_PUBLIC_INDEX_TENANT = tenantId;

  return task().finally(() => {
    if (previousTenant === undefined) delete process.env.INDEX_TENANT;
    else process.env.INDEX_TENANT = previousTenant;

    if (previousPublicTenant === undefined)
      delete process.env.NEXT_PUBLIC_INDEX_TENANT;
    else process.env.NEXT_PUBLIC_INDEX_TENANT = previousPublicTenant;
  });
}

async function runCortexBenchmarkDiagnostics(
  kind: "daily" | "weekly" | "monthly",
) {
  try {
    return await runCortexEditorialMatchDiagnostics({ kind });
  } catch {
    return {
      diagnostics: [],
      skippedReason: "editorial_match_diagnostics_failed",
    };
  }
}
