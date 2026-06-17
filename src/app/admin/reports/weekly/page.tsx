import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import {
  buildOperationalReadiness,
  buildReportsUrl,
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

const WeeklyReportsWorkspaceAsync = dynamicImport(
  () => import("@/components/admin/reports/weekly-reports-workspace").then((module) => module.WeeklyReportsWorkspace),
  {
    loading: () => (
      <div className="rounded-[1.2rem] border border-white/12 bg-[#0d0d0d] p-5 text-sm text-white/60">
        Loading weekly report workspace...
      </div>
    ),
  },
);

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
  const [dailyConfig, weeklyConfig, reports, report] = await Promise.all([
    getReportWorkspaceConfig("daily"),
    getReportWorkspaceConfig("weekly"),
    listWeeklyReports(),
    selectedReport ?? ensureWeeklyReport(selectedWeek, selectedLanguage),
  ]);
  const activeWeeklyReport = selectedReport ?? report;
  const [weeklyResources, weeklyDigest, editorialPost] = await Promise.all([
    listReportWorkspaceResources({
      reportId: activeWeeklyReport?.id ?? null,
      reportKind: "weekly",
    }),
    getWeeklyTelegramDigest(
      activeWeeklyReport?.weekEndDate ?? selectedWeek,
      activeWeeklyReport?.id ?? null,
    ),
    activeWeeklyReport ? getWeeklyEditorialPostRowByReportId(activeWeeklyReport.id) : Promise.resolve(null),
  ]);
  const operationalReadiness = buildOperationalReadiness({
    activeWeeklyReport,
    dailyResources: await listReportWorkspaceResources({ reportKind: "daily" }),
    hasDatabase: hasDatabaseUrl(),
    weeklyResources,
  });

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

  return (
    <WeeklyReportsWorkspaceAsync
      addResourceAction={addResourceAction}
      approveAction={approveAction}
      autoPrepareAction={autoPrepareAction}
      dailyConfig={dailyConfig}
      deleteResourceAction={deleteResourceAction}
      ensureReportAction={ensureReportAction}
      editorialPost={editorialPost}
      generateAction={generateAction}
      generateCoverAction={generateCoverAction}
      notices={params.notice}
      operationalReadiness={operationalReadiness}
      publishAction={publishAction}
      publishEditorialArticleAction={publishEditorialArticleAction}
      rebuildManifestAction={rebuildManifestAction}
      republishEditorialArticleAction={republishEditorialArticleAction}
      reports={reports}
      resetWindowFiltersAction={resetWindowFiltersAction}
      selectedLanguage={selectedLanguage}
      selectedPreview={selectedPreview}
      selectedWeek={selectedWeek}
      saveConfigAction={saveConfigAction}
      scheduleTelegramAction={scheduleTelegramAction}
      sendTelegramNowAction={sendTelegramNowAction}
      saveNotesAction={saveNotesAction}
      syncEditorialArticleAction={syncEditorialArticleAction}
      syncSourcesAction={syncSourcesAction}
      toggleChannelPostsAction={toggleChannelPostsAction}
      toggleCollectedPostAction={toggleCollectedPostAction}
      toggleResourceAction={toggleResourceAction}
      unpublishEditorialArticleAction={unpublishEditorialArticleAction}
      weeklyConfig={weeklyConfig}
      weeklyDigest={weeklyDigest}
      weeklyResources={weeklyResources}
      activeWeeklyReport={activeWeeklyReport}
    />
  );
}
