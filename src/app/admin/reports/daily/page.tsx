import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import {
  buildOperationalReadiness,
  getDefaultWeekEnd,
  normalizeAdminLocale,
} from "@/lib/admin-reports";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import { hasDatabaseUrl } from "@/lib/db";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addReportWorkspaceResource,
  deleteReportWorkspaceResource,
  getReportWorkspaceConfig,
  getLocalizedReportWorkspaceText,
  listReportWorkspaceResources,
  renderReportTelegramTemplate,
  saveReportWorkspaceConfig,
  setReportWorkspaceResourceEnabled,
  type ReportKind,
} from "@/lib/report-workspace";
import {
  getDailyTelegramDigest,
  resetTelegramCollectedPostsIncludedForWindow,
  setTelegramCollectedPostsIncludedForChannel,
  setTelegramCollectedPostIncluded,
  syncTelegramWorkspaceResources,
} from "@/lib/telegram-source-collector";
import { getAiMarketBriefAdminStatus } from "@/lib/ai-market-brief-lazy";
import { listWeeklyReports } from "@/lib/weekly-ai-report-lazy";
import { buildReportsUrl } from "@/lib/admin-reports";

const DailyReportsWorkspaceAsync = dynamic(
  () => import("@/components/admin/reports/daily-reports-workspace").then((module) => module.DailyReportsWorkspace),
  {
    loading: () => (
      <div className="rounded-[1.2rem] border border-white/12 bg-[#0d0d0d] p-5 text-sm text-white/60">
        Loading daily report workspace...
      </div>
    ),
  },
);

type DailyReportsPageProps = {
  searchParams: Promise<{
    lang?: string;
    notice?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DailyReportsPage({
  searchParams,
}: DailyReportsPageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const selectedLanguage = normalizeAdminLocale(params.lang);

  const [dailyConfig, dailyStatus, dailyResources, dailyDigest, weeklyReports] =
    await Promise.all([
      getReportWorkspaceConfig("daily"),
      getAiMarketBriefAdminStatus(todayInputDate()),
      listReportWorkspaceResources({ reportKind: "daily" }),
      getDailyTelegramDigest(todayInputDate()),
      listWeeklyReports().catch(() => []),
    ]);
  const activeWeeklyReport = weeklyReports.find(
    (report) =>
      report.language === selectedLanguage &&
      report.weekEndDate === getDefaultWeekEnd(),
  ) ?? weeklyReports[0] ?? null;
  const activeTradeDate = todayInputDate();
  const weeklyResources = activeWeeklyReport
    ? await listReportWorkspaceResources({
        reportId: activeWeeklyReport.id,
        reportKind: "weekly",
      })
    : [];
  const operationalReadiness = buildOperationalReadiness({
    activeWeeklyReport,
    dailyResources,
    hasDatabase: hasDatabaseUrl(),
    weeklyResources,
  });
  const dailyTemplatePreview = renderReportTelegramTemplate(
    getLocalizedReportWorkspaceText(dailyConfig, selectedLanguage).telegramTemplate,
    {
      blocks: [
        {
          body: "Короткий приклад AI daily summary.",
          title: "Головний сигнал дня",
        },
        {
          body: "Сильніші рухи по сої та соняшнику.",
          title: "Що рухалося найсильніше",
        },
        {
          body: "Волатильність залишається локальною.",
          title: "Стійкість / ризик",
        },
        {
          body: "Слідкуємо за наступним циклом публікації.",
          title: "На що дивитися далі",
        },
      ],
      index_summary:
        "SPIKE Spot Index: CBOT/physical moves and today's verified positions are inserted here.",
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
      tradeDate: activeTradeDate,
    },
    selectedLanguage,
  );

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
    redirectToNotice("config_saved");
  }

  async function addResourceAction(formData: FormData) {
    "use server";

    await addReportWorkspaceResource({
      language: String(formData.get("language") ?? "uk"),
      notes: String(formData.get("notes") ?? ""),
      reportId: null,
      reportKind: "daily",
      role: String(formData.get("role") ?? "analysis_source") as never,
      scope: String(formData.get("scope") ?? "permanent") as never,
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "telegram_channel") as never,
      url: String(formData.get("url") ?? ""),
    });
    redirectToNotice("resource_added");
  }

  async function toggleResourceAction(formData: FormData) {
    "use server";

    await setReportWorkspaceResourceEnabled(
      String(formData.get("resourceId") ?? ""),
      String(formData.get("enabled") ?? "0") === "1",
    );
    redirectToNotice("resource_toggled");
  }

  async function deleteResourceAction(formData: FormData) {
    "use server";

    await deleteReportWorkspaceResource(String(formData.get("resourceId") ?? ""));
    redirectToNotice("resource_toggled");
  }

  async function syncSourcesAction(formData: FormData) {
    "use server";

    await syncTelegramWorkspaceResources("daily", {
      reportId: String(formData.get("reportId") ?? "") || null,
    });
    redirectToNotice("sources_synced");
  }

  async function toggleCollectedPostAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostIncluded(
      String(formData.get("postId") ?? ""),
      String(formData.get("included") ?? "0") === "1",
    );
    redirectToNotice("post_filter_updated");
  }

  async function toggleChannelPostsAction(formData: FormData) {
    "use server";

    await setTelegramCollectedPostsIncludedForChannel({
      channelHandle: String(formData.get("channelHandle") ?? ""),
      endAt: String(formData.get("endAt") ?? ""),
      included: String(formData.get("included") ?? "0") === "1",
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirectToNotice("post_filter_updated");
  }

  async function resetWindowFiltersAction(formData: FormData) {
    "use server";

    await resetTelegramCollectedPostsIncludedForWindow({
      endAt: String(formData.get("endAt") ?? ""),
      startAt: String(formData.get("startAt") ?? ""),
    });
    redirectToNotice("post_filters_reset");
  }

  function redirectToNotice(notice: string) {
    redirect(
      buildReportsUrl("daily", {
        lang: selectedLanguage,
        notice,
      }),
    );
  }

  return (
    <DailyReportsWorkspaceAsync
      dailyConfig={dailyConfig}
      dailyDigest={dailyDigest}
      dailyResources={dailyResources}
      dailyStatus={dailyStatus}
      dailyTemplatePreview={dailyTemplatePreview}
      activeTradeDate={activeTradeDate}
      notice={params.notice}
      operationalReadiness={operationalReadiness}
      selectedLanguage={selectedLanguage}
      weeklyResources={weeklyResources}
      addResourceAction={addResourceAction}
      deleteResourceAction={deleteResourceAction}
      saveConfigAction={saveConfigAction}
      syncSourcesAction={syncSourcesAction}
      toggleChannelPostsAction={toggleChannelPostsAction}
      toggleCollectedPostAction={toggleCollectedPostAction}
      toggleResourceAction={toggleResourceAction}
      resetWindowFiltersAction={resetWindowFiltersAction}
    />
  );
}
