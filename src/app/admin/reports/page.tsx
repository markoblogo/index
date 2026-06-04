import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import {
  buildAiBriefTelegramSummaryText,
  getAiMarketBriefAdminStatus,
} from "@/lib/ai-market-brief";
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
  approveWeeklyReport,
  autoPrepareWeeklyReportDraft,
  buildWeeklySourceManifest,
  ensureWeeklyReport,
  generateWeeklyReportDraft,
  getWeeklyReportById,
  listWeeklyReports,
  publishWeeklyReport,
  saveWeeklyReportAdminInputs,
  scheduleWeeklyReportTelegram,
  sendWeeklyReportTelegramNow,
  type WeeklyReportRecord,
} from "@/lib/weekly-ai-report";

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
  manifest: "Weekly source manifest rebuilt.",
  notes_saved: "Weekly editor inputs saved.",
  published: "Weekly report published.",
  report_ready: "Weekly report loaded.",
  resource_added: "Resource added.",
  resource_toggled: "Resource status updated.",
  scheduled: "Weekly Telegram send scheduled.",
  sent: "Weekly report sent to Telegram.",
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
  const [dailyResources, weeklyResources] = await Promise.all([
    listReportWorkspaceResources({ reportKind: "daily" }),
    listReportWorkspaceResources({
      reportId: activeWeeklyReport?.id ?? null,
      reportKind: "weekly",
    }),
  ]);
  const weeklyReadiness = activeWeeklyReport
    ? assessWeeklyReportPublicReadiness(activeWeeklyReport)
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
              className="rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]"
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

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={dailyConfig}
          deleteResourceAction={deleteResourceAction}
          resources={dailyResources}
          saveConfigAction={saveConfigAction}
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
        </WorkspaceLane>

        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={weeklyConfig}
          deleteResourceAction={deleteResourceAction}
          reportId={activeWeeklyReport?.id ?? null}
          resources={weeklyResources}
          saveConfigAction={saveConfigAction}
          title="Weekly summary workspace"
          toggleResourceAction={toggleResourceAction}
        >
          {activeWeeklyReport ? (
          <WeeklyWorkflowCard
              activeReport={activeWeeklyReport}
              approveAction={approveAction}
              generateAction={generateAction}
              publishAction={publishAction}
              publicReadiness={weeklyReadiness}
              rebuildManifestAction={rebuildManifestAction}
              saveNotesAction={saveNotesAction}
              scheduleTelegramAction={scheduleTelegramAction}
              sendTelegramNowAction={sendTelegramNowAction}
            />
          ) : null}
        </WorkspaceLane>
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.55fr_1.45fr]">
        <div className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
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
              <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
                <h2 className="text-lg font-semibold text-white">Weekly website preview</h2>
                <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-[#050505] p-5">
                  <WeeklyReportView report={activeWeeklyReport} />
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
                <h2 className="text-lg font-semibold text-white">Weekly Telegram preview</h2>
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
  title: string;
  toggleResourceAction: (formData: FormData) => Promise<void>;
}) {
  const analysisSources = resources.filter((resource) => resource.role === "analysis_source");
  const formatReferences = resources.filter((resource) => resource.role === "format_reference");

  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
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

function WeeklyWorkflowCard({
  activeReport,
  approveAction,
  generateAction,
  publishAction,
  publicReadiness,
  rebuildManifestAction,
  saveNotesAction,
  scheduleTelegramAction,
  sendTelegramNowAction,
}: {
  activeReport: WeeklyReportRecord;
  approveAction: (formData: FormData) => Promise<void>;
  generateAction: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
  publicReadiness: ReturnType<typeof assessWeeklyReportPublicReadiness> | null;
  rebuildManifestAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
  scheduleTelegramAction: (formData: FormData) => Promise<void>;
  sendTelegramNowAction: (formData: FormData) => Promise<void>;
}) {
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
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          { action: rebuildManifestAction, label: "Rebuild source manifest" },
          { action: generateAction, label: "Generate weekly draft" },
          { action: approveAction, label: "Approve" },
          { action: publishAction, label: "Publish website", disabled: !publicReadiness?.canPublish },
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
        <button className="w-fit rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]" type="submit">
          Save weekly inputs
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetadataBox activeReport={activeReport} />
        {publicReadiness ? <ReadinessBox readiness={publicReadiness} /> : null}
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
        <p><span className="font-semibold text-white">Missing inputs:</span> {activeReport.missingInputs.length}</p>
        <p><span className="font-semibold text-white">AI warnings:</span> {activeReport.aiWarnings.length}</p>
      </div>
    </div>
  );
}

function ReadinessBox({
  readiness,
}: {
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
      approvedForWebsite && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    canScheduleTelegram:
      approvedForTelegram && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    canSendTelegram:
      approvedForTelegram && hasThreeParts && hasDisclaimer && hasSourceManifest && hasNoNA && !hasBannedPhrase && !mixedHeader,
    checklist: [
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
      ...(hasBannedPhrase ? ["Banned public phrases detected."] : []),
      ...(hasNoNA ? [] : ["Telegram messages contain n/a."]),
      ...(mixedHeader ? ["Mixed Ukrainian/English headers detected."] : []),
    ],
  };
}
