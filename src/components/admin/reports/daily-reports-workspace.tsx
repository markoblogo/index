"use client";

import type { ReportWorkspaceConfig, ReportWorkspaceResource } from "@/lib/report-workspace";
import { buildOperationalReadiness } from "@/lib/admin-reports";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import { getLocalizedReportWorkspaceText, renderReportTelegramTemplate } from "@/lib/report-workspace";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";
import { ReportsWorkspaceHeader } from "@/components/admin/reports/reports-workspace-header";
import { OperationalReadinessPanel } from "@/components/admin/reports/operational-readiness-panel";
import { WorkspaceLane } from "@/components/admin/reports/workspace-lane";
import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";

type DailyBriefStatus = {
  enabled: boolean;
  rows: Array<{
    locale: string;
    status: string;
    model: string;
  }>;
};

type DailyReportsWorkspaceProps = {
  dailyConfig: ReportWorkspaceConfig;
  dailyDigest: TelegramSourceDigest;
  dailyResources: ReportWorkspaceResource[];
  notice?: string;
  operationalReadiness: Awaited<ReturnType<typeof buildOperationalReadiness>>;
  selectedLanguage: "en" | "uk";
  weeklyResources: ReportWorkspaceResource[];
  dailyStatus: DailyBriefStatus;
  saveConfigAction: (formData: FormData) => Promise<void>;
  addResourceAction: (formData: FormData) => Promise<void>;
  toggleResourceAction: (formData: FormData) => Promise<void>;
  deleteResourceAction: (formData: FormData) => Promise<void>;
  syncSourcesAction: (formData: FormData) => Promise<void>;
  toggleCollectedPostAction: (formData: FormData) => Promise<void>;
  toggleChannelPostsAction: (formData: FormData) => Promise<void>;
  resetWindowFiltersAction: (formData: FormData) => Promise<void>;
};

export function DailyReportsWorkspace({
  dailyConfig,
  dailyDigest,
  dailyResources,
  notice,
  operationalReadiness,
  selectedLanguage,
  weeklyResources,
  dailyStatus,
  saveConfigAction,
  addResourceAction,
  toggleResourceAction,
  deleteResourceAction,
  syncSourcesAction,
  toggleCollectedPostAction,
  toggleChannelPostsAction,
  resetWindowFiltersAction,
}: DailyReportsWorkspaceProps) {
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
      tradeDate: todayInputDate(),
    },
    selectedLanguage,
  );

  return (
    <section className="grid gap-6">
      <ReportsWorkspaceHeader
        language={selectedLanguage}
        notice={notice}
        section="daily"
      />

      <OperationalReadinessPanel
        items={operationalReadiness.items}
        warnings={operationalReadiness.warnings}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <WorkspaceLane
          addResourceAction={addResourceAction}
          config={dailyConfig}
          deleteResourceAction={deleteResourceAction}
          formColumns="double"
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
              {dailyTemplatePreview}
            </pre>
          </section>

          <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Daily workflow defaults</h2>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Daily remains editor-reviewable before publication, but still publishes on
                  time if nobody intervenes.
                </p>
              </div>
              <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/68">
                fail-safe armed
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm leading-6 text-white/68">
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Review starts</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {dailyConfig.reviewStartsAt} {dailyConfig.timezone}
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Auto-publish</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {dailyConfig.publishAt} {dailyConfig.timezone}
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Weekly sibling flow</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {weeklyResources.length > 0
                    ? `${dailyConfig.reviewStartsAt} → ${dailyConfig.publishAt}`
                    : `${dailyConfig.reviewStartsAt} → ${dailyConfig.publishAt}`}
                </p>
              </div>
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
