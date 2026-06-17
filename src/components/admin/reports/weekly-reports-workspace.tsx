"use client";

import Link from "next/link";
import {
  assessWeeklyReportPublicReadiness,
  assessWeeklyWorkflowSurface,
  formatDigestDate,
  type ReportAdminLocale,
  type WeeklyPreviewMode,
} from "@/lib/admin-reports";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";
import {
  type TelegramSourceDigest,
} from "@/lib/telegram-source-collector";
import { type WeeklyEditorialPostRow } from "@/lib/weekly-editorial-post-storage";
import type { ReportWorkspaceConfig, ReportWorkspaceResource } from "@/lib/report-workspace";
import { ReportsWorkspaceHeader } from "@/components/admin/reports/reports-workspace-header";
import { OperationalReadinessPanel } from "@/components/admin/reports/operational-readiness-panel";
import { TelegramDigestPreview } from "@/components/admin/reports/telegram-digest-preview";
import { WeeklySurfaceStatusPanel, WeeklyPreviewPanel, WeeklyRunsList } from "@/components/admin/reports/weekly-preview-panel";
import { WorkspaceLane } from "@/components/admin/reports/workspace-lane";
import { WeeklyWorkflowCard } from "@/components/admin/reports/weekly-workflow-card";

type WeeklyReportsWorkspaceProps = {
  dailyConfig: ReportWorkspaceConfig;
  notices?: string;
  operationalReadiness: {
    canRunWeeklyGeneration: boolean;
    items: Array<{
      detail: string;
      label: string;
      ok: boolean;
    }>;
    warnings: string[];
  };
  selectedLanguage: ReportAdminLocale;
  selectedPreview: WeeklyPreviewMode;
  selectedWeek: string;
  reports: WeeklyReportRecord[];
  activeWeeklyReport: WeeklyReportRecord | null;
  weeklyConfig: ReportWorkspaceConfig;
  weeklyDigest: TelegramSourceDigest;
  weeklyResources: ReportWorkspaceResource[];
  editorialPost: WeeklyEditorialPostRow | null;
  addResourceAction: (formData: FormData) => Promise<void>;
  deleteResourceAction: (formData: FormData) => Promise<void>;
  saveConfigAction: (formData: FormData) => Promise<void>;
  toggleResourceAction: (formData: FormData) => Promise<void>;
  ensureReportAction: (formData: FormData) => Promise<void>;
  rebuildManifestAction: (formData: FormData) => Promise<void>;
  saveNotesAction: (formData: FormData) => Promise<void>;
  generateAction: (formData: FormData) => Promise<void>;
  generateCoverAction: (formData: FormData) => Promise<void>;
  approveAction: (formData: FormData) => Promise<void>;
  publishAction: (formData: FormData) => Promise<void>;
  publishEditorialArticleAction: (formData: FormData) => Promise<void>;
  unpublishEditorialArticleAction: (formData: FormData) => Promise<void>;
  syncEditorialArticleAction: (formData: FormData) => Promise<void>;
  republishEditorialArticleAction: (formData: FormData) => Promise<void>;
  scheduleTelegramAction: (formData: FormData) => Promise<void>;
  sendTelegramNowAction: (formData: FormData) => Promise<void>;
  autoPrepareAction: (formData: FormData) => Promise<void>;
  syncSourcesAction: (formData: FormData) => Promise<void>;
  toggleCollectedPostAction: (formData: FormData) => Promise<void>;
  toggleChannelPostsAction: (formData: FormData) => Promise<void>;
  resetWindowFiltersAction: (formData: FormData) => Promise<void>;
};

export function WeeklyReportsWorkspace({
  dailyConfig,
  notices,
  operationalReadiness,
  selectedLanguage,
  selectedPreview,
  selectedWeek,
  reports,
  activeWeeklyReport,
  weeklyConfig,
  weeklyDigest,
  weeklyResources,
  editorialPost,
  addResourceAction,
  deleteResourceAction,
  saveConfigAction,
  toggleResourceAction,
  ensureReportAction,
  rebuildManifestAction,
  saveNotesAction,
  generateAction,
  generateCoverAction,
  approveAction,
  publishAction,
  publishEditorialArticleAction,
  unpublishEditorialArticleAction,
  syncEditorialArticleAction,
  republishEditorialArticleAction,
  scheduleTelegramAction,
  sendTelegramNowAction,
  autoPrepareAction,
  syncSourcesAction,
  toggleCollectedPostAction,
  toggleChannelPostsAction,
  resetWindowFiltersAction,
}: WeeklyReportsWorkspaceProps) {
  const weeklyReadiness = activeWeeklyReport
    ? assessWeeklyReportPublicReadiness(activeWeeklyReport)
    : null;
  const weeklySurfaceState =
    activeWeeklyReport && weeklyReadiness
      ? assessWeeklyWorkflowSurface(activeWeeklyReport, weeklyDigest, editorialPost)
      : null;

  const reportId = activeWeeklyReport?.id ?? null;

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

  const operationalWarningHint = weeklyReadiness
    ? weeklyReadiness.warnings.length > 0
      ? weeklyReadiness.warnings.join(" · ")
      : null
    : null;

  return (
    <section className="grid gap-6">
      <ReportsWorkspaceHeader
        actions={headerActions}
        language={selectedLanguage}
        notice={notices}
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
              value: weeklySurfaceState.digestMatchesCurrent ? "current" : "needs regenerate",
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
          reportId={reportId}
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
                {operationalWarningHint ? (
                  <p className="mt-3 text-xs text-amber-100">{operationalWarningHint}</p>
                ) : null}
              </div>
              <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/68">
                deadline fail-safe
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Daily review</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {dailyConfig.reviewStartsAt} {dailyConfig.timezone}
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Daily publish</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {dailyConfig.publishAt} {dailyConfig.timezone}
                </p>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Weekly publish</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {weeklyConfig.reviewStartsAt} → {weeklyConfig.publishAt} {weeklyConfig.timezone}
                </p>
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
