import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import {
  buildAiBriefTelegramSummaryText,
  getAiMarketBriefAdminStatus,
} from "@/lib/ai-market-brief";
import { hasDatabaseUrl } from "@/lib/db";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addReportWorkspaceResource,
  deleteReportWorkspaceResource,
  getLocalizedReportWorkspaceText,
  getReportWorkspaceConfig,
  listReportWorkspaceResources,
  renderReportTelegramTemplate,
  saveReportWorkspaceConfig,
  setReportWorkspaceResourceEnabled,
  type ReportKind,
  type ReportWorkspaceConfig,
  type ReportWorkspaceResource,
} from "@/lib/report-workspace";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import {
  getDailyTelegramDigest,
  resetTelegramCollectedPostsIncludedForWindow,
  setTelegramCollectedPostsIncludedForChannel,
  setTelegramCollectedPostIncluded,
  getWeeklyTelegramDigest,
  syncTelegramWorkspaceResources,
  type TelegramSourceDigest,
} from "@/lib/telegram-source-collector";
import {
  approveWeeklyReport,
  autoPrepareWeeklyReportDraft,
  buildWeeklySourceManifest,
  ensureWeeklyReport,
  generateWeeklyCoverAsset,
  generateWeeklyReportDraft,
  getWeeklyReportById,
  listWeeklyReports,
  publishWeeklyReport,
  saveWeeklyReportAdminInputs,
  scheduleWeeklyReportTelegram,
  sendWeeklyReportTelegramNow,
  type WeeklyReportRecord,
} from "@/lib/weekly-ai-report";
import {
  syncWeeklyEditorialPostFromReport,
} from "@/lib/weekly-editorial-posts";
import {
  getWeeklyEditorialPostRowByReportId,
  publishWeeklyEditorialPostByReportId,
  unpublishWeeklyEditorialPostByReportId,
  type WeeklyEditorialPostRow,
} from "@/lib/weekly-editorial-post-storage";

type ReportsWorkspacePageProps = {
  searchParams: Promise<{
    lang?: string;
    notice?: string;
    reportId?: string;
    week?: string;
  }>;
};

const noticeMap: Record<string, string> = {
  approved: "Weekly report approved.",
  config_saved: "Report settings saved.",
  generated: "Weekly draft generated.",
  cover_generated: "Weekly cover asset generated.",
  manifest: "Weekly source manifest rebuilt.",
  notes_saved: "Weekly editor inputs saved.",
  post_filters_reset: "Digest filters reset for this window.",
  published: "Weekly report published.",
  article_published: "Editorial layer published.",
  article_unpublished: "Editorial layer moved back to draft.",
  article_synced: "Editorial layer draft synced.",
  article_republished: "Published editorial layer synced.",
  report_ready: "Weekly report loaded.",
  resource_added: "Resource added.",
  post_filter_updated: "Collected post filter updated.",
  resource_toggled: "Resource status updated.",
  scheduled: "Weekly Telegram send scheduled.",
  sent: "Weekly report sent to Telegram.",
  sources_synced: "Telegram sources synced.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportsWorkspacePage({
  searchParams,
}: ReportsWorkspacePageProps) {
  const currentUser = await requireDemoRole("admin");
  const params = await searchParams;
  const selectedLanguage = params.lang === "en" ? "en" : "uk";
  const selectedWeek = params.week ?? getDefaultWeekEnd();
  const selectedReport =
    params.reportId && params.reportId.length > 0
      ? await getWeeklyReportById(params.reportId)
      : null;
  const [dailyConfig, weeklyConfig, reports, report, dailyStatus] =
    await Promise.all([
      getReportWorkspaceConfig("daily"),
      getReportWorkspaceConfig("weekly"),
      listWeeklyReports(),
      selectedReport ?? ensureWeeklyReport(selectedWeek, selectedLanguage),
      getAiMarketBriefAdminStatus(todayInputDate()),
    ]);
  const activeWeeklyReport = selectedReport ?? report;
  const [dailyResources, weeklyResources, dailyDigest, weeklyDigest] = await Promise.all([
    listReportWorkspaceResources({ reportKind: "daily" }),
    listReportWorkspaceResources({
      reportId: activeWeeklyReport?.id ?? null,
      reportKind: "weekly",
    }),
    getDailyTelegramDigest(todayInputDate()),
    getWeeklyTelegramDigest(
      activeWeeklyReport?.weekEndDate ?? selectedWeek,
      activeWeeklyReport?.id ?? null,
    ),
  ]);
  const editorialPost = activeWeeklyReport
    ? await getWeeklyEditorialPostRowByReportId(activeWeeklyReport.id)
    : null;
  const weeklyReadiness = activeWeeklyReport
    ? assessWeeklyReportPublicReadiness(activeWeeklyReport)
    : null;
  const hasDatabase = hasDatabaseUrl();
  const operationalReadiness = buildOperationalReadiness({
    activeWeeklyReport,
    dailyResources,
    hasDatabase,
    weeklyResources,
  });
  const weeklySurfaceState =
    activeWeeklyReport && weeklyReadiness
      ? assessWeeklyWorkflowSurface(activeWeeklyReport, weeklyDigest, editorialPost)
      : null;

  async function saveConfigAction(formData: FormData) {
    "use server";

    const reportKind = String(formData.get("reportKind") ?? "daily") as ReportKind;
    await saveReportWorkspaceConfig(reportKind, {
      adminPromptEn: String(formData.get("adminPromptEn") ?? ""),
      adminPromptUk: String(formData.get("adminPromptUk") ?? ""),
      collectionWindowLabel: String(formData.get("collectionWindowLabel") ?? ""),
      enabled: String(formData.get("enabled") ?? "1") === "1",
      publishAt: String(formData.get("publishAt") ?? ""),
      reviewStartsAt: String(formData.get("reviewStartsAt") ?? ""),
      sourceProcessingNotes: String(formData.get("sourceProcessingNotes") ?? ""),
      telegramTemplateEn: String(formData.get("telegramTemplateEn") ?? ""),
      telegramTemplateUk: String(formData.get("telegramTemplateUk") ?? ""),
      timezone: String(formData.get("timezone") ?? "Europe/Kyiv"),
    });
    redirect(buildRedirectUrl(params, "config_saved"));
  }

  async function addResourceAction(formData: FormData) {
    "use server";

    const reportKind = String(formData.get("reportKind") ?? "daily") as ReportKind;
    const reportId = String(formData.get("reportId") ?? "");
    await addReportWorkspaceResource({
      language: String(formData.get("language") ?? "uk"),
      notes: String(formData.get("notes") ?? ""),
      reportId: reportId || null,
      reportKind,
      role: String(formData.get("role") ?? "analysis_source") as never,
      scope: String(formData.get("scope") ?? "permanent") as never,
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "telegram_channel") as never,
      url: String(formData.get("url") ?? ""),
    });
    redirect(buildRedirectUrl(params, "resource_added"));
  }

  async function toggleResourceAction(formData: FormData) {
    "use server";

    await setReportWorkspaceResourceEnabled(
      String(formData.get("resourceId") ?? ""),
      String(formData.get("enabled") ?? "0") === "1",
    );
    redirect(buildRedirectUrl(params, "resource_toggled"));
  }

  async function deleteResourceAction(formData: FormData) {
    "use server";

    await deleteReportWorkspaceResource(String(formData.get("resourceId") ?? ""));
    redirect(buildRedirectUrl(params, "resource_toggled"));
  }

  async function ensureReportAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    const language =
      String(formData.get("language") ?? "uk") === "en" ? "en" : "uk";
    const nextReport = await ensureWeeklyReport(week, language);
    redirect(`/admin/reports?reportId=${nextReport?.id ?? ""}&week=${week}&lang=${language}&notice=report_ready`);
  }

  async function rebuildManifestAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await buildWeeklySourceManifest(reportId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=manifest`);
  }

  async function saveNotesAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await saveWeeklyReportAdminInputs(reportId, {
      coverImageAlt: String(formData.get("coverImageAlt") ?? ""),
      coverImageCaption: String(formData.get("coverImageCaption") ?? ""),
      coverImageUrl: String(formData.get("coverImageUrl") ?? ""),
      editorialSlugOverride: String(formData.get("editorialSlugOverride") ?? ""),
      holdPublication: String(formData.get("holdPublication") ?? "") === "1",
      manualNotes: String(formData.get("manualNotes") ?? ""),
      structuredDataPack: String(formData.get("structuredDataPack") ?? ""),
    });
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=notes_saved`);
  }

  async function generateAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await generateWeeklyReportDraft(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=generated`);
  }

  async function generateCoverAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await generateWeeklyCoverAsset(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=cover_generated`);
  }

  async function approveAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await approveWeeklyReport(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=approved`);
  }

  async function publishAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await publishWeeklyReport(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=published`);
  }

  async function publishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const report = await getWeeklyReportById(reportId);
    if (report?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(report, {
        preserveStatus: true,
      });
      await publishWeeklyEditorialPostByReportId(reportId);
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=article_published`);
  }

  async function unpublishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await unpublishWeeklyEditorialPostByReportId(reportId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=article_unpublished`);
  }

  async function syncEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const report = await getWeeklyReportById(reportId);
    if (report?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(report, {
        preserveStatus: true,
      });
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=article_synced`);
  }

  async function republishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const report = await getWeeklyReportById(reportId);
    if (report?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(report, {
        preserveStatus: false,
        status: "published",
      });
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=article_republished`);
  }

  async function scheduleTelegramAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await scheduleWeeklyReportTelegram(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=scheduled`);
  }

  async function sendTelegramNowAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await sendWeeklyReportTelegramNow(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(`/admin/reports?reportId=${reportId}&week=${nextReport?.weekEndDate ?? getDefaultWeekEnd()}&lang=${nextReport?.language ?? selectedLanguage}&notice=sent`);
  }

  async function autoPrepareAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    await autoPrepareWeeklyReportDraft(week);
    const nextReport = await ensureWeeklyReport(week, selectedLanguage);
    redirect(`/admin/reports?reportId=${nextReport?.id ?? ""}&week=${week}&lang=${selectedLanguage}&notice=generated`);
  }

  async function syncSourcesAction(formData: FormData) {
    "use server";

    const kind =
      String(formData.get("reportKind") ?? "daily") === "weekly"
        ? "weekly"
        : "daily";
    const reportId = String(formData.get("reportId") ?? "") || null;
    await syncTelegramWorkspaceResources(kind, {
      reportId,
    });
    redirect(buildRedirectUrl(params, "sources_synced"));
  }

  async function toggleCollectedPostAction(formData: FormData) {
    "use server";

    const postId = String(formData.get("postId") ?? "");
    const included = String(formData.get("included") ?? "0") === "1";
    await setTelegramCollectedPostIncluded(postId, included);
    redirect(buildRedirectUrl(params, "post_filter_updated"));
  }

  async function toggleChannelPostsAction(formData: FormData) {
    "use server";

    const channelHandle = String(formData.get("channelHandle") ?? "");
    const included = String(formData.get("included") ?? "0") === "1";
    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? "");
    await setTelegramCollectedPostsIncludedForChannel({
      channelHandle,
      endAt,
      included,
      startAt,
    });
    redirect(buildRedirectUrl(params, "post_filter_updated"));
  }

  async function resetWindowFiltersAction(formData: FormData) {
    "use server";

    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? "");
    await resetTelegramCollectedPostsIncludedForWindow({
      endAt,
      startAt,
    });
    redirect(buildRedirectUrl(params, "post_filters_reset"));
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6 shadow-2xl shadow-black/20">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Editorial AI workflow
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Reports Workspace
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/68">
              Configure daily and weekly summaries in one place: collection windows, editorial prompts, Telegram templates and external resources used as analysis inputs or format references.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-uga-green hover:text-uga-green"
                href="#daily-workspace"
              >
                Daily workspace
              </a>
              <a
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-uga-green hover:text-uga-green"
                href="#weekly-workspace"
              >
                Weekly workspace
              </a>
              <a
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-uga-green hover:text-uga-green"
                href="#weekly-preview"
              >
                Weekly preview
              </a>
              <a
                className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-uga-green hover:text-uga-green"
                href="#weekly-archive"
              >
                Archive
              </a>
              <a
                className={`rounded-full border px-3 py-1 text-sm ${selectedLanguage === "uk" ? "border-uga-green text-uga-green" : "border-white/15 text-white/70"}`}
                href={`/admin/reports?week=${selectedWeek}&lang=uk`}
              >
                Weekly UA
              </a>
              <a
                className={`rounded-full border px-3 py-1 text-sm ${selectedLanguage === "en" ? "border-uga-green text-uga-green" : "border-white/15 text-white/70"}`}
                href={`/admin/reports?week=${selectedWeek}&lang=en`}
              >
                Weekly EN
              </a>
            </div>
          </div>

          <form action={ensureReportAction} className="flex flex-wrap items-end gap-3">
            <input name="language" type="hidden" value={selectedLanguage} />
            <label className="grid gap-2 text-sm font-semibold text-white">
              Weekly report date
              <input
                className="rounded-2xl border border-white/15 bg-black px-4 py-3 text-base text-white"
                defaultValue={selectedWeek}
                name="week"
                type="date"
              />
            </label>
            <button
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Load week
            </button>
            <button
              className="rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
              disabled={!operationalReadiness.canRunWeeklyGeneration}
              formAction={autoPrepareAction}
              type="submit"
            >
              Auto-prepare weekly draft
            </button>
          </form>
        </div>

        {params.notice ? (
          <div className="mt-5 rounded-2xl border border-uga-green/20 bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {noticeMap[params.notice] ?? "Action completed."}
          </div>
        ) : null}
      </header>

      <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Operational readiness</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">
            This shows whether the current environment can actually collect sources, generate reports and send Telegram output.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationalReadiness.items.map((item) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
              key={item.label}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{item.label}</h3>
                <span
                  className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                    item.ok
                      ? "bg-uga-green/15 text-uga-green"
                      : "bg-amber-400/15 text-amber-200"
                  }`}
                >
                  {item.ok ? "ready" : "blocked"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/68">{item.detail}</p>
            </article>
          ))}
        </div>
        {operationalReadiness.warnings.length > 0 ? (
          <div className="rounded-[1rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            {operationalReadiness.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
      </section>

      {activeWeeklyReport && weeklySurfaceState ? (
        <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Weekly control center</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              One-place orientation for draft freshness, publication state and editorial sync health.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SurfaceStatusCard
              detail={`Window ${formatDigestDate(weeklyDigest.startAt)} → ${formatDigestDate(weeklyDigest.endAt)} · ${weeklyDigest.postCount} included / ${weeklySurfaceState.excludedPosts} excluded`}
              label="Filtered source set"
              tone={weeklySurfaceState.digestMatchesCurrent ? "ok" : "warn"}
              value={weeklySurfaceState.digestMatchesCurrent ? "current" : "stale"}
            />
            <SurfaceStatusCard
              detail={`Status ${activeWeeklyReport.status} · generated ${activeWeeklyReport.aiGeneratedAt ?? "n/a"}`}
              label="Weekly draft"
              tone={weeklySurfaceState.digestMatchesCurrent ? "ok" : "warn"}
              value={weeklySurfaceState.digestMatchesCurrent ? "aligned" : "needs regenerate"}
            />
            <SurfaceStatusCard
              detail={`Website ${activeWeeklyReport.status} · Telegram ${activeWeeklyReport.telegramSendAt ?? "n/a"}${activeWeeklyReport.adminEditedContent?.holdPublication ? " · hold enabled" : ""}`}
              label="Publication path"
              tone={activeWeeklyReport.adminEditedContent?.holdPublication ? "warn" : "ok"}
              value={activeWeeklyReport.adminEditedContent?.holdPublication ? "held" : "armed"}
            />
            <SurfaceStatusCard
              detail={`Editorial ${weeklySurfaceState.editorialStatusLabel} · slug ${weeklySurfaceState.editorialSlug}`}
              label="Editorial layer entity"
              tone={weeklySurfaceState.editorialMatchesCurrent ? "ok" : "warn"}
              value={weeklySurfaceState.editorialMatchesCurrent ? "current" : "out of sync"}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={dailyConfig}
          deleteResourceAction={deleteResourceAction}
          resources={dailyResources}
          saveConfigAction={saveConfigAction}
          sectionId="daily-workspace"
          title="Daily summary workspace"
          toggleResourceAction={toggleResourceAction}
        >
          <div className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/45">
              Daily status
            </p>
            <p className="text-sm text-white/72">
              Latest trade date: <span className="font-semibold text-white">{todayInputDate()}</span>
            </p>
            <p className="text-sm text-white/72">
              Stored briefs:{" "}
              <span className="font-semibold text-white">
                {dailyStatus.rows.length > 0 ? dailyStatus.rows.length : 0}
              </span>
            </p>
            <div className="grid gap-2 text-sm text-white/68">
              {dailyStatus.rows.length > 0 ? (
                dailyStatus.rows.map((row) => (
                  <div
                    className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3"
                    key={row.locale}
                  >
                    <span className="font-semibold uppercase text-white">{row.locale}</span>
                    {" · "}
                    {row.status}
                    {" · "}
                    {row.model}
                  </div>
                ))
              ) : (
                <p>No stored daily brief rows for today.</p>
              )}
            </div>
          </div>
              <TelegramDigestPreview
                digest={dailyDigest}
                generateAction={null}
                generationState={null}
                reportId={null}
                reportKind="daily"
                resetWindowFiltersAction={resetWindowFiltersAction}
                syncSourcesAction={syncSourcesAction}
                toggleChannelPostsAction={toggleChannelPostsAction}
            toggleCollectedPostAction={toggleCollectedPostAction}
            title="Daily collected Telegram posts"
          />
        </WorkspaceLane>

        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={weeklyConfig}
          deleteResourceAction={deleteResourceAction}
          reportId={activeWeeklyReport?.id ?? null}
          resources={weeklyResources}
          saveConfigAction={saveConfigAction}
          sectionId="weekly-workspace"
          title="Weekly summary workspace"
          toggleResourceAction={toggleResourceAction}
        >
          {activeWeeklyReport ? (
            <>
              <TelegramDigestPreview
                digest={weeklyDigest}
                generateAction={generateAction}
                generationState={
                  weeklySurfaceState
                    ? {
                        generatedAt: activeWeeklyReport.aiGeneratedAt,
                        isCurrent: weeklySurfaceState.digestMatchesCurrent,
                        signature: weeklyDigest.signature,
                      }
                    : null
                }
                reportId={activeWeeklyReport.id}
                reportKind="weekly"
                resetWindowFiltersAction={resetWindowFiltersAction}
                syncSourcesAction={syncSourcesAction}
                toggleChannelPostsAction={toggleChannelPostsAction}
                toggleCollectedPostAction={toggleCollectedPostAction}
                title="Weekly collected Telegram posts"
              />
              <WeeklyWorkflowCard
              activeReport={activeWeeklyReport}
              approveAction={approveAction}
              editorialPost={editorialPost}
              generateCoverAction={generateCoverAction}
              generateAction={generateAction}
              publishAction={publishAction}
              publishEditorialArticleAction={publishEditorialArticleAction}
              publicReadiness={weeklyReadiness}
              republishEditorialArticleAction={republishEditorialArticleAction}
              rebuildManifestAction={rebuildManifestAction}
              saveNotesAction={saveNotesAction}
              scheduleTelegramAction={scheduleTelegramAction}
              sendTelegramNowAction={sendTelegramNowAction}
              syncEditorialArticleAction={syncEditorialArticleAction}
              unpublishEditorialArticleAction={unpublishEditorialArticleAction}
              />
            </>
          ) : null}
        </WorkspaceLane>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.55fr_1.45fr]">
        <div className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" id="weekly-archive">
          <h2 className="text-lg font-semibold text-white">Weekly report archive</h2>
          <div className="mt-4 grid gap-3">
            {reports.length > 0 ? (
              reports.map((item) => (
                <a
                  className={`rounded-[1rem] border p-4 text-sm transition ${
                    activeWeeklyReport?.id === item.id
                      ? "border-uga-green bg-uga-green/10 text-white"
                      : "border-white/10 bg-black/30 text-white/75 hover:border-white/25"
                  }`}
                  href={`/admin/reports?reportId=${item.id}&week=${item.weekEndDate}&lang=${item.language}`}
                  key={item.id}
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                    {item.weekEndDate} · {item.status} · v{item.version}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm text-white/65">No weekly reports stored yet.</p>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
            <h2 className="text-lg font-semibold text-white">Daily Telegram template preview</h2>
            <pre className="mt-4 whitespace-pre-wrap rounded-[1rem] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/72">
              {renderReportTelegramTemplate(getLocalizedReportWorkspaceText(dailyConfig, "uk").telegramTemplate, {
                ai_summary: buildAiBriefTelegramSummaryText(
                  {
                    blocks: [
                      { body: "Короткий приклад AI daily summary.", title: "Головний сигнал дня" },
                      { body: "Сильніші рухи по сої та соняшнику.", title: "Що рухалося найсильніше" },
                      { body: "Волатильність залишається локальною.", title: "Стійкість / ризик" },
                      { body: "Слідкуємо за наступним циклом публікації.", title: "На що дивитися далі" },
                    ],
                    cardComments: {},
                    confidence: "normal",
                    generatedAt: "",
                    inputDataHash: "preview",
                    model: "preview",
                    observability: {
                      estimatedCostUsd: null,
                      fallbackReason: null,
                      promptTokens: null,
                      status: "preview",
                      totalTokens: null,
                    },
                    tradeDate: todayInputDate(),
                  },
                  "uk",
                ),
                index_summary:
                  "SPIKE Spot Index: CBOT/physical moves and today's verified positions are inserted here.",
              })}
            </pre>
            <pre className="mt-4 whitespace-pre-wrap rounded-[1rem] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/72">
              {renderReportTelegramTemplate(getLocalizedReportWorkspaceText(dailyConfig, "en").telegramTemplate, {
                ai_summary: buildAiBriefTelegramSummaryText(
                  {
                    blocks: [
                      { body: "Short AI daily summary example.", title: "Today's Market Signal" },
                      { body: "Soybean and sunflower show the strongest moves.", title: "Key Movers" },
                      { body: "Volatility remains localized.", title: "Risk / Stability Read" },
                      { body: "Watch the next publication cycle.", title: "What to Watch Next" },
                    ],
                    cardComments: {},
                    confidence: "normal",
                    generatedAt: "",
                    inputDataHash: "preview",
                    model: "preview",
                    observability: {
                      estimatedCostUsd: null,
                      fallbackReason: null,
                      promptTokens: null,
                      status: "preview",
                      totalTokens: null,
                    },
                    tradeDate: todayInputDate(),
                  },
                  "en",
                ),
                index_summary:
                  "SPIKE Spot Index: today's verified benchmark positions are inserted here.",
              })}
            </pre>
          </section>

          {activeWeeklyReport?.content ? (
            <>
              <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" id="weekly-preview">
                <h2 className="text-lg font-semibold text-white">Weekly website preview</h2>
                <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-[#050505] p-5">
                  <WeeklyReportView report={activeWeeklyReport} />
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
                <h2 className="text-lg font-semibold text-white">Weekly Telegram preview</h2>
                {activeWeeklyReport.adminEditedContent?.coverImageUrl ? (
                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                      Cover asset
                    </p>
                    <img
                      alt={activeWeeklyReport.adminEditedContent?.coverImageAlt || "Weekly cover asset"}
                      className="mt-3 aspect-[3/2] w-full rounded-[0.9rem] object-cover"
                      src={activeWeeklyReport.adminEditedContent.coverImageUrl}
                    />
                    <p className="mt-2 break-all text-sm text-uga-green">
                      {activeWeeklyReport.adminEditedContent.coverImageUrl}
                    </p>
                    {activeWeeklyReport.adminEditedContent?.coverAssetId ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/45">
                        Asset ID: {activeWeeklyReport.adminEditedContent.coverAssetId}
                      </p>
                    ) : null}
                    {activeWeeklyReport.adminEditedContent.coverImageCaption ? (
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        {activeWeeklyReport.adminEditedContent.coverImageCaption}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {activeWeeklyReport.content.telegramMessages.map((message, index) => (
                    <article
                      className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
                      key={index}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                        Message {index + 1}
                      </p>
                      <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/72">
                        {message}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
                <h2 className="text-lg font-semibold text-white">Weekly blog draft preview</h2>
                {activeWeeklyReport.content.blogDraft ? (
                  <article className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
                      Blog narrative layer
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {activeWeeklyReport.content.blogDraft.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/62">
                      {activeWeeklyReport.content.blogDraft.subtitle}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-white/78">
                      {activeWeeklyReport.content.blogDraft.intro}
                    </p>
                    <div className="mt-5 grid gap-4">
                      {activeWeeklyReport.content.blogDraft.sections.map((section) => (
                        <section
                          className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
                          key={section.title}
                        >
                          <h4 className="text-base font-semibold text-white">{section.title}</h4>
                          <p className="mt-2 text-sm leading-7 text-white/72">{section.body}</p>
                        </section>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 rounded-[1rem] border border-white/10 bg-black/30 p-4 text-sm text-white/72">
                      <p><span className="font-semibold text-white">Closing:</span> {activeWeeklyReport.content.blogDraft.closing}</p>
                      <p><span className="font-semibold text-white">SEO description:</span> {activeWeeklyReport.content.blogDraft.seoDescription}</p>
                      <p><span className="font-semibold text-white">Slug:</span> {activeWeeklyReport.content.blogDraft.slug}</p>
                      <p><span className="font-semibold text-white">Cover alt:</span> {activeWeeklyReport.content.blogDraft.coverAlt}</p>
                      <p><span className="font-semibold text-white">Cover prompt:</span> {activeWeeklyReport.content.blogDraft.coverPrompt}</p>
                    </div>
                  </article>
                ) : (
                  <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/30 p-4 text-sm text-white/62">
                    Weekly blog draft will appear after weekly generation.
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function WorkspaceLane({
  addResourceAction,
  children,
  config,
  deleteResourceAction,
  reportId,
  resources,
  saveConfigAction,
  sectionId,
  title,
  toggleResourceAction,
}: {
  addResourceAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
  config: ReportWorkspaceConfig;
  deleteResourceAction: (formData: FormData) => Promise<void>;
  reportId?: string | null;
  resources: ReportWorkspaceResource[];
  saveConfigAction: (formData: FormData) => Promise<void>;
  sectionId?: string;
  title: string;
  toggleResourceAction: (formData: FormData) => Promise<void>;
}) {
  const analysisSources = resources.filter((resource) => resource.role === "analysis_source");
  const formatReferences = resources.filter((resource) => resource.role === "format_reference");

  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" id={sectionId}>
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Configure timing, editor instructions and source pools used by the summary layer.
        </p>
      </div>

      <form action={saveConfigAction} className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
        <input name="reportKind" type="hidden" value={config.reportKind} />
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Timezone
            <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue={config.timezone} name="timezone" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Review starts at
            <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue={config.reviewStartsAt} name="reviewStartsAt" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Publish at
            <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue={config.publishAt} name="publishAt" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Collection window
          <textarea className="min-h-20 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.collectionWindowLabel} name="collectionWindowLabel" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Source processing notes
          <textarea className="min-h-20 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.sourceProcessingNotes} name="sourceProcessingNotes" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Editor prompt (UA)
          <textarea className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.adminPromptUk} name="adminPromptUk" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Editor prompt (EN)
          <textarea className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.adminPromptEn} name="adminPromptEn" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Telegram template (UA)
          <textarea className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.telegramTemplateUk} name="telegramTemplateUk" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Telegram template (EN)
          <textarea className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" defaultValue={config.telegramTemplateEn} name="telegramTemplateEn" />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/78">
          <input className="h-4 w-4" defaultChecked={config.enabled} name="enabled" type="checkbox" value="1" />
          Workspace enabled
        </label>
        <button className="w-fit rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]" type="submit">
          Save settings
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourceEditor
          addResourceAction={addResourceAction}
          reportId={reportId}
          reportKind={config.reportKind}
        />
        <div className="grid gap-4">
          <ResourceList
            deleteResourceAction={deleteResourceAction}
            resources={analysisSources}
            title="Analysis sources"
            toggleResourceAction={toggleResourceAction}
          />
          <ResourceList
            deleteResourceAction={deleteResourceAction}
            resources={formatReferences}
            title="Format references"
            toggleResourceAction={toggleResourceAction}
          />
        </div>
      </div>

      {children}
    </section>
  );
}

function ResourceEditor({
  addResourceAction,
  reportId,
  reportKind,
}: {
  addResourceAction: (formData: FormData) => Promise<void>;
  reportId?: string | null;
  reportKind: ReportKind;
}) {
  return (
    <form action={addResourceAction} className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <input name="reportId" type="hidden" value={reportId ?? ""} />
      <input name="reportKind" type="hidden" value={reportKind} />
      <h3 className="text-base font-semibold text-white">Add resource</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Role
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="analysis_source" name="role">
            <option value="analysis_source">Analysis source</option>
            <option value="format_reference">Format reference</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Scope
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue={reportKind === "daily" ? "permanent" : "one_off"} name="scope">
            <option value="permanent">Permanent</option>
            <option value="one_off">One-off</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Type
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="telegram_channel" name="type">
            <option value="telegram_channel">Telegram channel</option>
            <option value="website">Website</option>
            <option value="blog">Blog</option>
            <option value="file">File</option>
            <option value="note">Text note</option>
            <option value="prompt">Prompt / comment</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Language
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="uk" name="language">
            <option value="uk">uk</option>
            <option value="en">en</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-white/78">
        Title
        <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" name="title" required />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-white/78">
        URL / file path / identifier
        <input className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" name="url" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-white/78">
        Notes
        <textarea className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white" name="notes" />
      </label>
      <button className="w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green" type="submit">
        Add resource
      </button>
    </form>
  );
}

function ResourceList({
  deleteResourceAction,
  resources,
  title,
  toggleResourceAction,
}: {
  deleteResourceAction: (formData: FormData) => Promise<void>;
  resources: ReportWorkspaceResource[];
  title: string;
  toggleResourceAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-3 grid gap-3">
        {resources.length > 0 ? (
          resources.map((resource) => (
            <div className="rounded-[1rem] border border-white/10 p-3" key={resource.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{resource.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                    {resource.type} · {resource.scope} · {resource.enabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleResourceAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <input name="enabled" type="hidden" value={resource.enabled ? "0" : "1"} />
                    <button className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:border-uga-green hover:text-uga-green" type="submit">
                      {resource.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                  <form action={deleteResourceAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300 hover:text-red-100" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              {resource.url ? <p className="mt-2 break-all text-sm text-uga-green">{resource.url}</p> : null}
              {resource.notes ? <p className="mt-2 text-sm leading-6 text-white/62">{resource.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-white/65">No resources configured yet.</p>
        )}
      </div>
    </div>
  );
}

function TelegramDigestPreview({
  digest,
  generateAction,
  generationState,
  reportId,
  reportKind,
  resetWindowFiltersAction,
  syncSourcesAction,
  toggleChannelPostsAction,
  toggleCollectedPostAction,
  title,
}: {
  digest: TelegramSourceDigest;
  generateAction: ((formData: FormData) => Promise<void>) | null;
  generationState: {
    generatedAt: string | null;
    isCurrent: boolean;
    signature: string;
  } | null;
  reportId: string | null;
  reportKind: ReportKind;
  resetWindowFiltersAction: (formData: FormData) => Promise<void>;
  syncSourcesAction: (formData: FormData) => Promise<void>;
  toggleChannelPostsAction: (formData: FormData) => Promise<void>;
  toggleCollectedPostAction: (formData: FormData) => Promise<void>;
  title: string;
}) {
  const totalIncluded = digest.channels.reduce(
    (sum, channel) => sum + channel.includedPostCount,
    0,
  );
  const totalExcluded = digest.channels.reduce(
    (sum, channel) => sum + channel.excludedPostCount,
    0,
  );
  const activeChannels = digest.channels.filter(
    (channel) => channel.includedPostCount > 0,
  ).length;
  const totalChannels = digest.channels.filter(
    (channel) => channel.posts.length > 0,
  ).length;

  return (
    <section className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-white/62">
            Window: {formatDigestDate(digest.startAt)} → {formatDigestDate(digest.endAt)} · {totalIncluded} included posts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resetWindowFiltersAction}>
            <input name="startAt" type="hidden" value={digest.startAt} />
            <input name="endAt" type="hidden" value={digest.endAt} />
            <button
              className="rounded-full border border-amber-400/35 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300"
              type="submit"
            >
              Reset filters for window
            </button>
          </form>
          <form action={syncSourcesAction}>
            <input name="reportKind" type="hidden" value={reportKind} />
            <input name="reportId" type="hidden" value={reportId ?? ""} />
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Refresh sync
            </button>
          </form>
        </div>
      </div>

      <div className="sticky top-4 z-10 rounded-[1rem] border border-white/12 bg-[#0a0a0a]/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <span className="rounded-full bg-uga-green/15 px-3 py-1 text-uga-green">
              {totalIncluded} included
            </span>
            <span className="rounded-full bg-amber-400/12 px-3 py-1 text-amber-100">
              {totalExcluded} excluded
            </span>
            <span className="rounded-full border border-white/12 px-3 py-1 text-white/72">
              {activeChannels}/{totalChannels} channels active
            </span>
          </div>

          {generateAction && reportId ? (
            <form action={generateAction} className="flex items-center gap-3">
              <input name="reportId" type="hidden" value={reportId} />
              <div className="text-right text-xs leading-5 text-white/55">
                <p>
                  {generationState
                    ? generationState.isCurrent
                      ? "Current weekly draft matches this filtered source set."
                      : "Current weekly draft is stale versus this filtered source set."
                    : "Generation uses only currently included posts."}
                </p>
                <p>
                  {generationState
                    ? `Last generation: ${generationState.generatedAt ?? "n/a"} · set ${generationState.signature}`
                    : "Excluded posts stay out of the prompt context."}
                </p>
              </div>
              <button
                className="rounded-full bg-uga-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#82ff4d] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                disabled={totalIncluded === 0}
                type="submit"
              >
                Generate from current filtered set
              </button>
            </form>
          ) : (
            <p className="text-xs leading-5 text-white/55">
              Included/excluded counters reflect the exact set used by the digest layer.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {digest.channels.some((channel) => channel.posts.length > 0) ? (
          digest.channels
            .filter((channel) => channel.posts.length > 0)
            .map((channel) => (
              <details
                className="rounded-[1rem] border border-white/10 bg-black/20 p-4"
                key={`${channel.channelHandle}-${channel.peerId ?? "none"}`}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        @{channel.channelHandle}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                        {channel.includedPostCount} included · {channel.excludedPostCount} excluded{channel.peerId ? ` · peer ${channel.peerId}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleChannelPostsAction}>
                        <input name="channelHandle" type="hidden" value={channel.channelHandle} />
                        <input name="included" type="hidden" value="1" />
                        <input name="startAt" type="hidden" value={digest.startAt} />
                        <input name="endAt" type="hidden" value={digest.endAt} />
                        <button
                          className="rounded-full border border-uga-green/35 px-3 py-1 text-xs font-semibold text-uga-green transition hover:border-uga-green"
                          type="submit"
                        >
                          Include all
                        </button>
                      </form>
                      <form action={toggleChannelPostsAction}>
                        <input name="channelHandle" type="hidden" value={channel.channelHandle} />
                        <input name="included" type="hidden" value="0" />
                        <input name="startAt" type="hidden" value={digest.startAt} />
                        <input name="endAt" type="hidden" value={digest.endAt} />
                        <button
                          className="rounded-full border border-amber-400/35 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300"
                          type="submit"
                        >
                          Exclude all
                        </button>
                      </form>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
                        Open
                      </span>
                    </div>
                  </div>
                </summary>
                <div className="mt-4 grid gap-3">
                  {channel.posts.map((post) => (
                    <article
                      className={`rounded-[0.9rem] border p-3 ${
                        post.included
                          ? "border-white/10 bg-black/30"
                          : "border-amber-400/20 bg-amber-400/5"
                      }`}
                      key={post.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/45">
                            {formatDigestDate(post.publishedAt)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                              post.included
                                ? "bg-uga-green/15 text-uga-green"
                                : "bg-amber-400/15 text-amber-200"
                            }`}
                          >
                            {post.included ? "included" : "excluded"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            className="text-xs text-uga-green hover:underline"
                            href={post.postUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open original
                          </a>
                          <form action={toggleCollectedPostAction}>
                            <input name="postId" type="hidden" value={post.id} />
                            <input
                              name="included"
                              type="hidden"
                              value={post.included ? "0" : "1"}
                            />
                            <button
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                post.included
                                  ? "border-amber-400/40 text-amber-100 hover:border-amber-300"
                                  : "border-uga-green/40 text-uga-green hover:border-uga-green"
                              }`}
                              type="submit"
                            >
                              {post.included ? "Exclude from digest" : "Include in digest"}
                            </button>
                          </form>
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/72">
                        {post.text}
                      </pre>
                    </article>
                  ))}
                </div>
              </details>
            ))
        ) : (
          <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4 text-sm text-white/62">
            No collected Telegram posts in the current window yet.
          </div>
        )}
      </div>
    </section>
  );
}

function WeeklyWorkflowCard({
  activeReport,
  approveAction,
  editorialPost,
  generateCoverAction,
  generateAction,
  publishAction,
  publishEditorialArticleAction,
  publicReadiness,
  republishEditorialArticleAction,
  rebuildManifestAction,
  saveNotesAction,
  scheduleTelegramAction,
  sendTelegramNowAction,
  syncEditorialArticleAction,
  unpublishEditorialArticleAction,
}: {
  activeReport: WeeklyReportRecord;
  approveAction: (formData: FormData) => Promise<void>;
  editorialPost: WeeklyEditorialPostRow | null;
  generateCoverAction: (formData: FormData) => Promise<void>;
  generateAction: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  publicReadiness: ReturnType<typeof assessWeeklyReportPublicReadiness> | null;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  rebuildManifestAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
  scheduleTelegramAction: (formData: FormData) => Promise<void>;
  sendTelegramNowAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
}) {
  const editorialStatus =
    editorialPost?.status === "published" ? "published" : "draft";
  const canPublishEditorialArticle =
    activeReport.status === "published" && Boolean(activeReport.content?.blogDraft);
  const holdPublication = activeReport.adminEditedContent?.holdPublication === true;

  return (
    <div className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
        <span className="rounded-full bg-uga-green/15 px-3 py-1 text-uga-green">
          {activeReport.status}
        </span>
        <span className="rounded-full border border-white/12 px-3 py-1 text-white/72">
          confidence {activeReport.dataConfidence}
        </span>
        <span className="rounded-full border border-white/12 px-3 py-1 text-white/72">
          week {activeReport.weekEndDate}
        </span>
        <span className="rounded-full border border-white/12 px-3 py-1 text-white/72">
          version {activeReport.version}
        </span>
        <span
          className={`rounded-full border px-3 py-1 ${
            editorialStatus === "published"
              ? "border-uga-green/40 text-uga-green"
              : "border-amber-400/30 text-amber-100"
          }`}
        >
          article {editorialStatus}
        </span>
        <span
          className={`rounded-full border px-3 py-1 ${
            holdPublication
              ? "border-red-400/40 text-red-200"
              : "border-white/12 text-white/72"
          }`}
        >
          auto-publish {holdPublication ? "held" : "armed"}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { action: rebuildManifestAction, label: "Rebuild source manifest" },
          { action: generateAction, label: "Generate weekly draft" },
          { action: generateCoverAction, label: "Generate cover asset", disabled: !activeReport.content?.blogDraft },
          { action: approveAction, label: "Approve" },
          { action: publishAction, label: "Publish weekly report", disabled: !publicReadiness?.canPublish },
          { action: scheduleTelegramAction, label: "Schedule Telegram", disabled: !publicReadiness?.canScheduleTelegram },
          { action: sendTelegramNowAction, label: "Send Telegram now", disabled: !publicReadiness?.canSendTelegram },
        ].map((item) => (
          <form action={item.action} key={item.label}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={item.disabled}
              type="submit"
            >
              {item.label}
            </button>
          </form>
        ))}
      </div>

      <form action={saveNotesAction} className="grid gap-3 rounded-[1rem] border border-white/10 p-4">
        <input name="reportId" type="hidden" value={activeReport.id} />
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Weekly editor notes
          <textarea
            className="min-h-28 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
            defaultValue={activeReport.adminEditedContent?.manualNotes ?? ""}
            name="manualNotes"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Structured weekly pack
          <textarea
            className="min-h-28 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
            defaultValue={activeReport.adminEditedContent?.structuredDataPack ?? ""}
            name="structuredDataPack"
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78 md:col-span-2">
          Weekly cover asset URL
          <input
            className="rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
            defaultValue={activeReport.adminEditedContent?.coverImageUrl ?? ""}
              name="coverImageUrl"
              placeholder="https://..."
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Weekly cover alt text
            <input
              className="rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
              defaultValue={activeReport.adminEditedContent?.coverImageAlt ?? ""}
              name="coverImageAlt"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Weekly cover caption
            <input
              className="rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
              defaultValue={activeReport.adminEditedContent?.coverImageCaption ?? ""}
              name="coverImageCaption"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-white/78 md:col-span-2">
            Editorial slug override
            <input
              className="rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
              defaultValue={activeReport.adminEditedContent?.editorialSlugOverride ?? ""}
              name="editorialSlugOverride"
              placeholder={activeReport.content?.blogDraft?.slug ?? "weekly-market-intelligence-slug"}
            />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-red-400/18 bg-red-400/6 px-4 py-3 text-sm text-white/78 md:col-span-2">
            <input
              className="mt-1 h-4 w-4"
              defaultChecked={holdPublication}
              name="holdPublication"
              type="checkbox"
              value="1"
            />
            <span>
              <span className="font-semibold text-white">Hold automatic publication</span>
              <span className="block text-white/62">
                Stops deadline fail-safe publication for both website and Telegram until manually released.
              </span>
            </span>
          </label>
        </div>
        <button className="w-fit rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]" type="submit">
          Save weekly inputs
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetadataBox activeReport={activeReport} />
        <div className="grid gap-4">
          {publicReadiness ? (
            <ReadinessBox activeReport={activeReport} readiness={publicReadiness} />
          ) : null}
          <EditorialPublishBox
            activeReport={activeReport}
            canPublishEditorialArticle={canPublishEditorialArticle}
            editorialPost={editorialPost}
            editorialSyncState={assessEditorialSyncState(activeReport, editorialPost)}
            publishEditorialArticleAction={publishEditorialArticleAction}
            republishEditorialArticleAction={republishEditorialArticleAction}
            syncEditorialArticleAction={syncEditorialArticleAction}
            unpublishEditorialArticleAction={unpublishEditorialArticleAction}
          />
        </div>
      </div>
    </div>
  );
}

function MetadataBox({ activeReport }: { activeReport: WeeklyReportRecord }) {
  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <h3 className="text-base font-semibold text-white">Metadata</h3>
      <div className="mt-3 grid gap-2 text-sm text-white/68">
        <p><span className="font-semibold text-white">Model:</span> {activeReport.aiModel ?? "not generated"}</p>
        <p><span className="font-semibold text-white">Generated at:</span> {activeReport.aiGeneratedAt ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Telegram send at:</span> {activeReport.telegramSendAt ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Message IDs:</span> {activeReport.telegramMessageIds.length > 0 ? activeReport.telegramMessageIds.join(", ") : "n/a"}</p>
        <p><span className="font-semibold text-white">Cover asset:</span> {activeReport.adminEditedContent?.coverAssetId ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Auto-publish hold:</span> {activeReport.adminEditedContent?.holdPublication ? "enabled" : "off"}</p>
        <p><span className="font-semibold text-white">Missing inputs:</span> {activeReport.missingInputs.length}</p>
        <p><span className="font-semibold text-white">AI warnings:</span> {activeReport.aiWarnings.length}</p>
      </div>
    </div>
  );
}

function ReadinessBox({
  activeReport,
  readiness,
}: {
  activeReport: WeeklyReportRecord;
  readiness: ReturnType<typeof assessWeeklyReportPublicReadiness>;
}) {
  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <h3 className="text-base font-semibold text-white">Readiness</h3>
      <div className="mt-3 grid gap-2">
        {readiness.checklist.map((item) => (
          <div className="flex items-start gap-3" key={item.label}>
            <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-black ${item.ok ? "bg-uga-green text-white" : "bg-red-500 text-white"}`}>
              {item.ok ? "✓" : "!"}
            </span>
            <div className="text-sm text-white/68">
              <p className="font-semibold text-white">{item.label}</p>
              <p>{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {readiness.warnings.length > 0 ? (
        <div className="mt-4 rounded-[1rem] border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {readiness.warnings.join(" ")}
        </div>
      ) : null}
      {activeReport.adminEditedContent?.holdPublication ? (
        <div className="mt-4 rounded-[1rem] border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          Auto-publication is manually held. Cron will not publish this weekly report or send it to Telegram until the hold is removed.
        </div>
      ) : null}
    </div>
  );
}

function EditorialPublishBox({
  activeReport,
  canPublishEditorialArticle,
  editorialPost,
  editorialSyncState,
  publishEditorialArticleAction,
  republishEditorialArticleAction,
  syncEditorialArticleAction,
  unpublishEditorialArticleAction,
}: {
  activeReport: WeeklyReportRecord;
  canPublishEditorialArticle: boolean;
  editorialPost: WeeklyEditorialPostRow | null;
  editorialSyncState: {
    currentSignature: string;
    isCurrent: boolean;
    storedSignature: string | null;
  };
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
}) {
  const status = editorialPost
    ? (editorialPost.status === "published" ? "published" : "draft")
    : "not_materialized";
  const publicUrl =
    editorialPost?.status === "published"
      ? `/${activeReport.language === "uk" ? "uk" : "en"}/market-intelligence/${editorialPost.slug}`
      : null;
  const weeklyReportUrl = `/${activeReport.language === "uk" ? "uk" : "en"}/analytics/weekly-reports/${activeReport.slug}`;
  const effectiveSlug =
    editorialPost?.slug ||
    activeReport.adminEditedContent?.editorialSlugOverride?.trim() ||
    activeReport.content?.blogDraft?.slug ||
    "n/a";
  const predictedUrl =
    effectiveSlug !== "n/a"
      ? `/${activeReport.language === "uk" ? "uk" : "en"}/market-intelligence/${effectiveSlug}`
      : "n/a";

  return (
    <div className="rounded-[1rem] border border-white/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Editorial layer entity</h3>
          <p className="mt-1 text-sm text-white/62">
            Separate persisted public entity for SEO/LLMO article distribution.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={syncEditorialArticleAction}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!activeReport.content?.blogDraft}
              type="submit"
            >
              {editorialPost ? "Sync draft" : "Materialize draft"}
            </button>
          </form>
          <form action={republishEditorialArticleAction}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-uga-green/35 px-3 py-1 text-xs font-semibold text-uga-green transition hover:border-uga-green disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!activeReport.content?.blogDraft}
              type="submit"
            >
              Republish / sync
            </button>
          </form>
          <form action={status === "published" ? unpublishEditorialArticleAction : publishEditorialArticleAction}>
            <input name="reportId" type="hidden" value={activeReport.id} />
            <button
              className="rounded-full border border-amber-400/35 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25"
              disabled={!canPublishEditorialArticle && status !== "published"}
              type="submit"
            >
              {status === "published"
                ? "Unpublish"
                : "Publish"}
            </button>
          </form>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-white/68">
        <p><span className="font-semibold text-white">Status:</span> {status === "not_materialized" ? "not materialized" : status}</p>
        <p><span className="font-semibold text-white">Sync state:</span> {editorialSyncState.isCurrent ? "current" : "source changed since last sync"}</p>
        <p><span className="font-semibold text-white">Weekly report URL:</span> {weeklyReportUrl}</p>
        <p><span className="font-semibold text-white">Legacy editorial alias:</span> {publicUrl ?? predictedUrl}</p>
        <p><span className="font-semibold text-white">Slug:</span> {effectiveSlug}</p>
        <p><span className="font-semibold text-white">Slug override:</span> {activeReport.adminEditedContent?.editorialSlugOverride?.trim() || "none"}</p>
        <p><span className="font-semibold text-white">Published at:</span> {editorialPost?.publishedAt?.toISOString() ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Current signature:</span> {editorialSyncState.currentSignature}</p>
        <p><span className="font-semibold text-white">Stored signature:</span> {editorialSyncState.storedSignature ?? "n/a"}</p>
        <p><span className="font-semibold text-white">Source:</span> {activeReport.content?.blogDraft ? "weekly blogDraft available" : "blogDraft missing"}</p>
        {publicUrl ? (
          <p>
            <span className="font-semibold text-white">Public URL:</span>{" "}
            <a
              className="text-uga-green underline-offset-2 hover:underline"
              href={publicUrl}
              target="_blank"
            >
              {publicUrl}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function buildRedirectUrl(
  params: { lang?: string; reportId?: string; week?: string },
  notice: string,
) {
  const search = new URLSearchParams();
  if (params.lang) {
    search.set("lang", params.lang);
  }
  if (params.reportId) {
    search.set("reportId", params.reportId);
  }
  if (params.week) {
    search.set("week", params.week);
  }
  search.set("notice", notice);
  return `/admin/reports?${search.toString()}`;
}

function SurfaceStatusCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "ok" | "warn";
  value: string;
}) {
  return (
    <article className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        <span
          className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
            tone === "ok"
              ? "bg-uga-green/15 text-uga-green"
              : "bg-amber-400/15 text-amber-100"
          }`}
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/68">{detail}</p>
    </article>
  );
}

function assessWeeklyWorkflowSurface(
  report: WeeklyReportRecord,
  digest: TelegramSourceDigest,
  editorialPost: WeeklyEditorialPostRow | null,
) {
  const totalExcluded = digest.channels.reduce(
    (sum, channel) => sum + channel.excludedPostCount,
    0,
  );
  const manifestSignature = report.sourceManifest?.telegramDigest?.signature ?? null;
  const digestMatchesCurrent = manifestSignature === digest.signature;
  const editorialSyncState = assessEditorialSyncState(report, editorialPost);

  return {
    digestMatchesCurrent,
    editorialMatchesCurrent: editorialSyncState.isCurrent,
    editorialSlug:
      editorialPost?.slug ||
      report.adminEditedContent?.editorialSlugOverride?.trim() ||
      report.content?.blogDraft?.slug ||
      "n/a",
    editorialStatusLabel: editorialPost
      ? editorialPost.status === "published"
        ? "published"
        : "draft"
      : "not materialized",
    excludedPosts: totalExcluded,
  };
}

function assessEditorialSyncState(
  report: WeeklyReportRecord,
  editorialPost: WeeklyEditorialPostRow | null,
) {
  const currentSignature = buildEditorialDraftSignature(report);
  const storedSignature = editorialPost
    ? buildEditorialStoredSignature(editorialPost)
    : null;

  return {
    currentSignature,
    isCurrent: Boolean(storedSignature) && storedSignature === currentSignature,
    storedSignature,
  };
}

function buildEditorialDraftSignature(report: WeeklyReportRecord) {
  const draft = report.content?.blogDraft;
  const slug =
    report.adminEditedContent?.editorialSlugOverride?.trim() || draft?.slug || "";
  const payload = JSON.stringify({
    coverImageAlt:
      report.adminEditedContent?.coverImageAlt?.trim() || draft?.coverAlt || "",
    coverImageUrl: report.adminEditedContent?.coverImageUrl?.trim() || "",
    intro: draft?.intro || "",
    sections: draft?.sections || [],
    seoDescription: draft?.seoDescription || "",
    slug,
    subtitle: draft?.subtitle || "",
    title: draft?.title || "",
  });

  return shortHash(payload);
}

function buildEditorialStoredSignature(post: WeeklyEditorialPostRow) {
  return shortHash(
    JSON.stringify({
      coverImageAlt: post.coverImageAlt || "",
      coverImageUrl: post.coverImageUrl || "",
      intro: post.intro,
      sections: post.sectionsJson,
      seoDescription: post.seoDescription,
      slug: post.slug,
      subtitle: post.subtitle,
      title: post.title,
    }),
  );
}

function shortHash(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

function buildOperationalReadiness({
  activeWeeklyReport,
  dailyResources,
  hasDatabase,
  weeklyResources,
}: {
  activeWeeklyReport: WeeklyReportRecord | null;
  dailyResources: ReportWorkspaceResource[];
  hasDatabase: boolean;
  weeklyResources: ReportWorkspaceResource[];
}) {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasDailyTelegramTarget = Boolean(
    process.env.SPIKE_TELEGRAM_BOT_TOKEN &&
      (process.env.SPIKE_AI_TELEGRAM_CHAT_ID ||
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID ||
        process.env.UGA_TELEGRAM_ADMIN_CHAT_ID),
  );
  const hasWeeklyTelegramTarget = Boolean(
    process.env.SPIKE_TELEGRAM_BOT_TOKEN &&
      (process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID ||
        process.env.SPIKE_AI_TELEGRAM_CHAT_ID ||
        process.env.INDEX_TELEGRAM_SMOKE_CHAT_ID ||
        process.env.UGA_TELEGRAM_ADMIN_CHAT_ID),
  );
  const hasEditorialModel = Boolean(
    process.env.SPIKE_WEEKLY_EDITORIAL_MODEL ||
      process.env.SPIKE_WEEKLY_REPORT_MODEL ||
      process.env.SPIKE_AI_BRIEF_MODEL,
  );
  const dailyAnalysisSources = dailyResources.filter(
    (resource) => resource.role === "analysis_source" && resource.enabled,
  ).length;
  const weeklyAnalysisSources = weeklyResources.filter(
    (resource) => resource.role === "analysis_source" && resource.enabled,
  ).length;

  const items = [
    {
      detail: hasDatabase
        ? "Database-backed reports, resources and collected Telegram posts can be stored."
        : "DATABASE_URL is missing, so report creation and persistent source storage are unavailable in this environment.",
      label: "Database",
      ok: hasDatabase,
    },
    {
      detail: hasOpenAi
        ? "AI generation is available for daily and weekly editorial steps."
        : "OPENAI_API_KEY is missing, so generation falls back to deterministic content instead of the editorial model.",
      label: "AI generation",
      ok: hasOpenAi,
    },
    {
      detail:
        dailyAnalysisSources > 0
          ? `${dailyAnalysisSources} enabled daily analysis sources configured.`
          : "No enabled daily analysis sources configured yet.",
      label: "Daily sources",
      ok: dailyAnalysisSources > 0,
    },
    {
      detail:
        weeklyAnalysisSources > 0
          ? `${weeklyAnalysisSources} enabled weekly analysis sources configured.`
          : "No enabled weekly analysis sources configured yet.",
      label: "Weekly sources",
      ok: weeklyAnalysisSources > 0,
    },
    {
      detail: hasDailyTelegramTarget
        ? "Daily Telegram delivery target is configured."
        : "Daily Telegram target is not fully configured yet.",
      label: "Daily Telegram",
      ok: hasDailyTelegramTarget,
    },
    {
      detail: hasWeeklyTelegramTarget
        ? "Weekly Telegram delivery target is configured, including the cover-first weekly pack flow."
        : "Weekly Telegram target is not fully configured yet.",
      label: "Weekly Telegram",
      ok: hasWeeklyTelegramTarget,
    },
    {
      detail: hasEditorialModel
        ? "A weekly editorial model is configured for the narrative report/blog layer."
        : "No explicit weekly editorial model is configured.",
      label: "Weekly editorial model",
      ok: hasEditorialModel,
    },
    {
      detail: activeWeeklyReport
        ? `Weekly report context is loaded for ${activeWeeklyReport.weekEndDate} (${activeWeeklyReport.language.toUpperCase()}).`
        : "No active weekly report is loaded yet.",
      label: "Weekly report context",
      ok: Boolean(activeWeeklyReport),
    },
  ];

  const warnings: string[] = [];

  if (!hasDatabase) {
    warnings.push(
      "Weekly report actions currently show the workflow, but cannot persist reports or collected posts until DATABASE_URL is configured.",
    );
  }
  if (weeklyAnalysisSources === 0) {
    warnings.push(
      "Weekly generation should not be trusted until the configured Telegram channels are actually attached as enabled analysis sources.",
    );
  }
  if (!hasWeeklyTelegramTarget) {
    warnings.push(
      "Weekly Telegram publish flow is incomplete until the bot token and target chat ID are both configured.",
    );
  }

  return {
    canRunWeeklyGeneration: hasDatabase && weeklyAnalysisSources > 0,
    items,
    warnings,
  };
}

function formatDigestDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getDefaultWeekEnd() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diff = utcDay >= 6 ? utcDay - 6 : utcDay + 1;
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() - diff);
  return target.toISOString().slice(0, 10);
}

function assessWeeklyReportPublicReadiness(report: WeeklyReportRecord) {
  const content = report.content;
  const holdPublication = report.adminEditedContent?.holdPublication === true;
  const approvedForWebsite = report.status === "approved";
  const approvedForTelegram =
    report.status === "approved" ||
    report.status === "published" ||
    report.status === "telegram_scheduled" ||
    report.status === "telegram_sent";
  const textChunks = [
    report.title,
    content?.methodology ?? "",
    content?.disclaimer ?? "",
    ...(content?.executiveSummary ?? []),
    ...(content?.parts.flatMap((part) =>
      [part.title, ...part.sections.map((section) => `${section.title} ${section.body}`)],
    ) ?? []),
    ...(content?.telegramMessages ?? []),
  ];
  const text = textChunks.join(" ").toLowerCase();
  const bannedPhrases = ["source-grounded", "datapack", "framework", "black-box", "n/a", "tokens", "cost", "debug"];
  const hasBannedPhrase = bannedPhrases.some((phrase) => text.includes(phrase));
  const mixedHeader = (content?.parts ?? []).some((part) => /[A-Za-z]/.test(part.title) && /[А-ЯІЇЄҐа-яіїєґ]/.test(part.title));
  const hasThreeParts = (content?.parts.length ?? 0) === 3;
  const hasDisclaimer = Boolean(content?.disclaimer?.trim());
  const hasSourceManifest = Boolean(report.sourceManifest);
  const hasNoNA = !(content?.telegramMessages ?? []).some((message) => /n\/a/i.test(message));

  return {
    canPublish:
      !holdPublication && approvedForWebsite && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    canScheduleTelegram:
      !holdPublication && approvedForTelegram && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    canSendTelegram:
      !holdPublication && approvedForTelegram && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    checklist: [
      {
        detail: holdPublication ? "Manual hold is enabled. Deadline fail-safe is paused." : "No manual hold. Deadline fail-safe is armed.",
        label: "Auto-publish hold",
        ok: !holdPublication,
      },
      {
        detail: approvedForWebsite ? "Weekly report is approved for website publication." : "Website publication is still blocked by workflow state.",
        label: "Approved for website",
        ok: approvedForWebsite,
      },
      {
        detail: approvedForTelegram ? "Weekly report can move to Telegram distribution." : "Telegram distribution is still blocked by workflow state.",
        label: "Approved for Telegram",
        ok: approvedForTelegram,
      },
      {
        detail: hasSourceManifest ? "Source manifest is attached." : "Source manifest is missing.",
        label: "Has source manifest",
        ok: hasSourceManifest,
      },
      {
        detail: hasThreeParts ? "Three weekly report parts are present." : "Weekly report must contain exactly three parts.",
        label: "Has three parts",
        ok: hasThreeParts,
      },
      {
        detail: hasDisclaimer ? "Disclaimer is present." : "Disclaimer is missing.",
        label: "Has disclaimer",
        ok: hasDisclaimer,
      },
      {
        detail: hasNoNA ? "Telegram content has no n/a values." : "Telegram content still contains n/a.",
        label: "No n/a in Telegram",
        ok: hasNoNA,
      },
      {
        detail: !hasBannedPhrase ? "No banned public phrases detected." : "Banned public phrases detected in content.",
        label: "No banned phrases",
        ok: !hasBannedPhrase,
      },
      {
        detail: !mixedHeader ? "Headers use a consistent language." : "Mixed-language headers detected.",
        label: "No mixed headers",
        ok: !mixedHeader,
      },
    ],
    warnings: [
      ...(holdPublication ? ["Automatic publication is manually held."] : []),
      ...(hasBannedPhrase ? ["Banned public phrases detected."] : []),
      ...(hasNoNA ? [] : ["Telegram messages contain n/a."]),
      ...(mixedHeader ? ["Mixed Ukrainian/English headers detected."] : []),
    ],
  };
}
