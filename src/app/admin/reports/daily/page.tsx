import { redirect } from "next/navigation";
import { ReportsWorkspaceHeader } from "@/components/admin/reports/reports-workspace-header";
import { OperationalReadinessPanel } from "@/components/admin/reports/operational-readiness-panel";
import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";
import { WorkspaceLane } from "@/components/admin/reports/workspace-lane";
import {
  buildAiBriefTelegramSummaryText,
  getAiMarketBriefAdminStatus,
} from "@/lib/ai-market-brief";
import {
  buildOperationalReadiness,
  buildReportsUrl,
  getDefaultWeekEnd,
  normalizeAdminLocale,
} from "@/lib/admin-reports";
import { todayInputDate } from "@/lib/admin-daily-inputs";
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
} from "@/lib/report-workspace";
import {
  getDailyTelegramDigest,
  resetTelegramCollectedPostsIncludedForWindow,
  setTelegramCollectedPostsIncludedForChannel,
  setTelegramCollectedPostIncluded,
  syncTelegramWorkspaceResources,
} from "@/lib/telegram-source-collector";
import {
  listWeeklyReports,
} from "@/lib/weekly-ai-report";

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

  const [dailyConfig, weeklyConfig, dailyStatus, dailyResources, dailyDigest, weeklyReports] =
    await Promise.all([
      getReportWorkspaceConfig("daily"),
      getReportWorkspaceConfig("weekly"),
      getAiMarketBriefAdminStatus(todayInputDate()),
      listReportWorkspaceResources({ reportKind: "daily" }),
      getDailyTelegramDigest(todayInputDate()),
      listWeeklyReports().catch(() => []),
    ]);
  const activeWeeklyReport = weeklyReports.find(
    (report) => report.language === selectedLanguage && report.weekEndDate === getDefaultWeekEnd(),
  ) ?? weeklyReports[0] ?? null;
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
    <section className="grid gap-6">
      <ReportsWorkspaceHeader
        language={selectedLanguage}
        notice={params.notice}
        section="daily"
      />

      <OperationalReadinessPanel
        items={operationalReadiness.items}
        warnings={operationalReadiness.warnings}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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
              Daily operator status
            </p>
            <p className="text-sm text-white/72">
              Active trade date: <span className="font-semibold text-white">{todayInputDate()}</span>
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
                <p>No daily brief rows stored for this trade date yet.</p>
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
            title="Daily collected Telegram posts"
            toggleChannelPostsAction={toggleChannelPostsAction}
            toggleCollectedPostAction={toggleCollectedPostAction}
          />
        </WorkspaceLane>

        <section className="grid gap-6">
          <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
            <h2 className="text-lg font-semibold text-white">Daily Telegram output template</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Editor-facing preview of the combined index + summary post shape.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-[1rem] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/72">
              {renderReportTelegramTemplate(
                getLocalizedReportWorkspaceText(dailyConfig, "uk").telegramTemplate,
                {
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
                },
              )}
            </pre>
          </section>

          <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
            <h2 className="text-lg font-semibold text-white">Daily workflow defaults</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-white/68">
              <p>Review window: {dailyConfig.reviewStartsAt} {dailyConfig.timezone}</p>
              <p>Auto-publish target: {dailyConfig.publishAt} {dailyConfig.timezone}</p>
              <p>Weekly workspace remains armed separately with {weeklyConfig.publishAt} publication time.</p>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
