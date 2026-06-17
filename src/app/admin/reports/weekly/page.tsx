import { redirect } from "next/navigation";
import { ReportsWorkspaceHeader } from "@/components/admin/reports/reports-workspace-header";
import { OperationalReadinessPanel } from "@/components/admin/reports/operational-readiness-panel";
import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";
import {
  WeeklyPreviewPanel,
  WeeklyRunsList,
  WeeklySurfaceStatusPanel,
} from "@/components/admin/reports/weekly-preview-panel";
import { WeeklyWorkflowCard } from "@/components/admin/reports/weekly-workflow-card";
import { WorkspaceLane } from "@/components/admin/reports/workspace-lane";
import {
  assessWeeklyReportPublicReadiness,
  assessWeeklyWorkflowSurface,
  buildOperationalReadiness,
  buildReportsUrl,
  formatDigestDate,
  getDefaultWeekEnd,
  normalizeAdminLocale,
  normalizeWeeklyPreviewMode,
} from "@/lib/admin-reports";
import { hasDatabaseUrl } from "@/lib/db";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addReportWorkspaceResource,
  deleteReportWorkspaceResource,
  getReportWorkspaceConfig,
  listReportWorkspaceResources,
  saveReportWorkspaceConfig,
  setReportWorkspaceResourceEnabled,
  type ReportKind,
} from "@/lib/report-workspace";
import {
  getWeeklyTelegramDigest,
  resetTelegramCollectedPostsIncludedForWindow,
  setTelegramCollectedPostsIncludedForChannel,
  setTelegramCollectedPostIncluded,
  syncTelegramWorkspaceResources,
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
} from "@/lib/weekly-ai-report-lazy";
import { syncWeeklyEditorialPostFromReport } from "@/lib/weekly-editorial-posts";
import {
  getWeeklyEditorialPostRowByReportId,
  publishWeeklyEditorialPostByReportId,
  unpublishWeeklyEditorialPostByReportId,
} from "@/lib/weekly-editorial-post-storage";

type WeeklyReportsPageProps = {
  searchParams: Promise<{
    lang?: string;
    notice?: string;
    preview?: string;
    reportId?: string;
    week?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WeeklyReportsPage({
  searchParams,
}: WeeklyReportsPageProps) {
  const currentUser = await requireDemoRole("admin");
  const params = await searchParams;
  const selectedLanguage = normalizeAdminLocale(params.lang);
  const selectedPreview = normalizeWeeklyPreviewMode(params.preview);
  const selectedWeek = params.week ?? getDefaultWeekEnd();
  const selectedReport =
    params.reportId && params.reportId.length > 0
      ? await getWeeklyReportById(params.reportId)
      : null;
  const [dailyConfig, weeklyConfig, reports, report, dailyResources] =
    await Promise.all([
      getReportWorkspaceConfig("daily"),
      getReportWorkspaceConfig("weekly"),
      listWeeklyReports(),
      selectedReport ?? ensureWeeklyReport(selectedWeek, selectedLanguage),
      listReportWorkspaceResources({ reportKind: "daily" }),
    ]);
  const activeWeeklyReport = selectedReport ?? report;
  const [weeklyResources, weeklyDigest] = await Promise.all([
    listReportWorkspaceResources({
      reportId: activeWeeklyReport?.id ?? null,
      reportKind: "weekly",
    }),
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
  const operationalReadiness = buildOperationalReadiness({
    activeWeeklyReport,
    dailyResources,
    hasDatabase: hasDatabaseUrl(),
    weeklyResources,
  });
  const weeklySurfaceState =
    activeWeeklyReport && weeklyReadiness
      ? assessWeeklyWorkflowSurface(activeWeeklyReport, weeklyDigest, editorialPost)
      : null;

  async function saveConfigAction(formData: FormData) {
    "use server";

    const reportKind = String(formData.get("reportKind") ?? "weekly") as ReportKind;
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
    redirect(buildNoticeUrl("config_saved"));
  }

  async function addResourceAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await addReportWorkspaceResource({
      language: String(formData.get("language") ?? "uk"),
      notes: String(formData.get("notes") ?? ""),
      reportId: reportId || null,
      reportKind: "weekly",
      role: String(formData.get("role") ?? "analysis_source") as never,
      scope: String(formData.get("scope") ?? "one_off") as never,
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "telegram_channel") as never,
      url: String(formData.get("url") ?? ""),
    });
    redirect(buildNoticeUrl("resource_added"));
  }

  async function toggleResourceAction(formData: FormData) {
    "use server";

    await setReportWorkspaceResourceEnabled(
      String(formData.get("resourceId") ?? ""),
      String(formData.get("enabled") ?? "0") === "1",
    );
    redirect(buildNoticeUrl("resource_toggled"));
  }

  async function deleteResourceAction(formData: FormData) {
    "use server";

    await deleteReportWorkspaceResource(String(formData.get("resourceId") ?? ""));
    redirect(buildNoticeUrl("resource_toggled"));
  }

  async function ensureReportAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    const language =
      String(formData.get("language") ?? "uk") === "en" ? "en" : "uk";
    const nextReport = await ensureWeeklyReport(week, language);
    redirect(
      buildReportsUrl("weekly", {
        lang: language,
        notice: "report_ready",
        preview: selectedPreview,
        reportId: nextReport?.id ?? "",
        week,
      }),
    );
  }

  async function rebuildManifestAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await buildWeeklySourceManifest(reportId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "manifest"));
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
    redirect(buildReportUrl(nextReport, reportId, "notes_saved"));
  }

  async function generateAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await generateWeeklyReportDraft(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "generated"));
  }

  async function generateCoverAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await generateWeeklyCoverAsset(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "cover_generated"));
  }

  async function approveAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await approveWeeklyReport(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "approved"));
  }

  async function publishAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await publishWeeklyReport(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "published"));
  }

  async function publishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const reportRow = await getWeeklyReportById(reportId);
    if (reportRow?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(reportRow, { preserveStatus: true });
      await publishWeeklyEditorialPostByReportId(reportId);
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "article_published"));
  }

  async function unpublishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await unpublishWeeklyEditorialPostByReportId(reportId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "article_unpublished"));
  }

  async function syncEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const reportRow = await getWeeklyReportById(reportId);
    if (reportRow?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(reportRow, { preserveStatus: true });
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "article_synced"));
  }

  async function republishEditorialArticleAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const reportRow = await getWeeklyReportById(reportId);
    if (reportRow?.content?.blogDraft) {
      await syncWeeklyEditorialPostFromReport(reportRow, {
        preserveStatus: false,
        status: "published",
      });
    }
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "article_republished"));
  }

  async function scheduleTelegramAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await scheduleWeeklyReportTelegram(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "scheduled"));
  }

  async function sendTelegramNowAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await sendWeeklyReportTelegramNow(reportId, currentUser.userId);
    const nextReport = await getWeeklyReportById(reportId);
    redirect(buildReportUrl(nextReport, reportId, "sent"));
  }

  async function autoPrepareAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    await autoPrepareWeeklyReportDraft(week);
    const nextReport = await ensureWeeklyReport(week, selectedLanguage);
    redirect(
      buildReportsUrl("weekly", {
        lang: selectedLanguage,
        notice: "generated",
        preview: selectedPreview,
        reportId: nextReport?.id ?? "",
        week,
      }),
    );
  }

  async function syncSourcesAction(formData: FormData) {
    "use server";

    await syncTelegramWorkspaceResources("weekly", {
      reportId: String(formData.get("reportId") ?? "") || null,
    });
    redirect(buildNoticeUrl("sources_synced"));
  }

  async function toggleCollectedPostAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostIncluded(
      String(formData.get("postId") ?? ""),
      String(formData.get("included") ?? "0") === "1",
    );
    redirect(buildNoticeUrl("post_filter_updated"));
  }

  async function toggleChannelPostsAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostsIncludedForChannel({
      channelHandle: String(formData.get("channelHandle") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      included: String(formData.get("included") ?? "0") === "1",
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirect(buildNoticeUrl("post_filter_updated"));
  }

  async function resetWindowFiltersAction(formData: FormData) {
    "use server";

    await resetTelegramCollectedPostsIncludedForWindow({
      endAt: String(formData.get("endAt") ?? ""),
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirect(buildNoticeUrl("post_filters_reset"));
  }

  function buildNoticeUrl(notice: string) {
    return buildReportsUrl("weekly", {
      lang: selectedLanguage,
      notice,
      preview: selectedPreview,
      reportId: activeWeeklyReport?.id ?? params.reportId,
      week: activeWeeklyReport?.weekEndDate ?? selectedWeek,
    });
  }

  function buildReportUrl(
    reportRow: Awaited<ReturnType<typeof getWeeklyReportById>>,
    reportId: string,
    notice: string,
  ) {
    return buildReportsUrl("weekly", {
      lang: reportRow?.language ?? selectedLanguage,
      notice,
      preview: selectedPreview,
      reportId,
      week: reportRow?.weekEndDate ?? selectedWeek,
    });
  }

  const headerActions = (
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
  );

  return (
    <section className="grid gap-6">
      <ReportsWorkspaceHeader
        actions={headerActions}
        language={selectedLanguage}
        notice={params.notice}
        preview={selectedPreview}
        reportId={activeWeeklyReport?.id ?? null}
        section="weekly"
        week={selectedWeek}
      />

      <OperationalReadinessPanel
        items={operationalReadiness.items}
        warnings={operationalReadiness.warnings}
      />

      {activeWeeklyReport && weeklySurfaceState ? (
        <WeeklySurfaceStatusPanel
          detailCards={[
            {
              detail: `Window ${formatDigestDate(weeklyDigest.startAt)} → ${formatDigestDate(weeklyDigest.endAt)} · ${weeklyDigest.postCount} included / ${weeklySurfaceState.excludedPosts} excluded`,
              label: "Filtered source set",
              tone: weeklySurfaceState.digestMatchesCurrent ? "ok" : "warn",
              value: weeklySurfaceState.digestMatchesCurrent ? "current" : "stale",
            },
            {
              detail: `Status ${activeWeeklyReport.status} · generated ${activeWeeklyReport.aiGeneratedAt ?? "n/a"}`,
              label: "Weekly draft",
              tone: weeklySurfaceState.digestMatchesCurrent ? "ok" : "warn",
              value: weeklySurfaceState.digestMatchesCurrent ? "aligned" : "needs regenerate",
            },
            {
              detail: `Website ${activeWeeklyReport.status} · Telegram ${activeWeeklyReport.telegramSendAt ?? "n/a"}${activeWeeklyReport.adminEditedContent?.holdPublication ? " · hold enabled" : ""}`,
              label: "Publication path",
              tone: activeWeeklyReport.adminEditedContent?.holdPublication ? "warn" : "ok",
              value: activeWeeklyReport.adminEditedContent?.holdPublication ? "held" : "armed",
            },
            {
              detail: `Editorial ${weeklySurfaceState.editorialStatusLabel} · slug ${weeklySurfaceState.editorialSlug}`,
              label: "Editorial layer entity",
              tone: weeklySurfaceState.editorialMatchesCurrent ? "ok" : "warn",
              value: weeklySurfaceState.editorialMatchesCurrent ? "current" : "out of sync",
            },
          ]}
        />
      ) : null}

      <div className="grid gap-6">
        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={weeklyConfig}
          deleteResourceAction={deleteResourceAction}
          formColumns="double"
          reportId={activeWeeklyReport?.id ?? null}
          resources={weeklyResources}
          resourceColumns="split"
          saveConfigAction={saveConfigAction}
          sectionId="weekly-workspace"
          title="Weekly summary workspace"
          toggleResourceAction={toggleResourceAction}
        >
          {activeWeeklyReport ? (
            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
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
                title="Weekly collected Telegram posts"
                toggleChannelPostsAction={toggleChannelPostsAction}
                toggleCollectedPostAction={toggleCollectedPostAction}
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
            </div>
          ) : null}
        </WorkspaceLane>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="grid gap-6">
          {activeWeeklyReport ? (
            <WeeklyPreviewPanel
              language={selectedLanguage}
              preview={selectedPreview}
              report={activeWeeklyReport}
            />
          ) : null}
          <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5 text-sm leading-6 text-white/68">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Publication timing</h2>
                <p className="mt-2 max-w-3xl text-white/62">
                  Daily and weekly stay auto-armed by default, but the editor can still intervene during the review window.
                </p>
              </div>
              <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/68">
                deadline fail-safe
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Daily review</p>
                <p className="mt-2 text-base font-semibold text-white">{dailyConfig.reviewStartsAt} {dailyConfig.timezone}</p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Daily publish</p>
                <p className="mt-2 text-base font-semibold text-white">{dailyConfig.publishAt} {dailyConfig.timezone}</p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Weekly publish</p>
                <p className="mt-2 text-base font-semibold text-white">{weeklyConfig.reviewStartsAt} → {weeklyConfig.publishAt} {weeklyConfig.timezone}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-6">
          <WeeklyRunsList
            activeReportId={activeWeeklyReport?.id ?? null}
            language={selectedLanguage}
            preview={selectedPreview}
            reports={reports}
          />
        </div>
      </div>
    </section>
  );
}
