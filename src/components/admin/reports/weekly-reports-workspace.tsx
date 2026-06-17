"use client";

import dynamic from "next/dynamic";
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
import { WorkspaceLane } from "@/components/admin/reports/workspace-lane";

const WeeklySurfaceOverviewAsync = dynamic(
  () =>
    import("@/components/admin/reports/weekly-surface-overview").then(
      (module) => module.WeeklySurfaceOverview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5 text-sm text-white/60">
        Loading weekly control center...
      </div>
    ),
  },
);

const WeeklyDigestWorkspaceAsync = dynamic(
  () =>
    import("@/components/admin/reports/weekly-digest-workspace").then(
      (module) => module.WeeklyDigestWorkspace,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.2rem] border border-white/10 bg-black/30 p-4 text-sm text-white/60">
        Loading weekly digest workspace...
      </div>
    ),
  },
);

const WeeklyPreviewSidebarAsync = dynamic(
  () =>
    import("@/components/admin/reports/weekly-preview-sidebar").then(
      (module) => module.WeeklyPreviewSidebar,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5 text-sm text-white/60">
        Loading weekly preview and archive...
      </div>
    ),
  },
);

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
        <WeeklySurfaceOverviewAsync
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
            <WeeklyDigestWorkspaceAsync
              activeReport={activeWeeklyReport}
              approveAction={approveAction}
              editorialPost={editorialPost}
              generateCoverAction={generateCoverAction}
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
              publishAction={publishAction}
              publishEditorialArticleAction={publishEditorialArticleAction}
              publicReadiness={weeklyReadiness}
              republishEditorialArticleAction={republishEditorialArticleAction}
              rebuildManifestAction={rebuildManifestAction}
              resetWindowFiltersAction={resetWindowFiltersAction}
              saveNotesAction={saveNotesAction}
              scheduleTelegramAction={scheduleTelegramAction}
              sendTelegramNowAction={sendTelegramNowAction}
              syncEditorialArticleAction={syncEditorialArticleAction}
              syncSourcesAction={syncSourcesAction}
              toggleChannelPostsAction={toggleChannelPostsAction}
              toggleCollectedPostAction={toggleCollectedPostAction}
              unpublishEditorialArticleAction={unpublishEditorialArticleAction}
              weeklyDigest={weeklyDigest}
            />
          ) : null}
        </WorkspaceLane>
      </div>

      <WeeklyPreviewSidebarAsync
        activeReport={activeWeeklyReport}
        dailyConfig={dailyConfig}
        language={selectedLanguage}
        operationalWarningHint={operationalWarningHint}
        preview={selectedPreview}
        reports={reports}
        weeklyConfig={weeklyConfig}
      />
    </section>
  );
}
