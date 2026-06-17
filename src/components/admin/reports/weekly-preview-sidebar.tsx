"use client";

import { WeeklyPreviewPanel, WeeklyRunsList } from "@/components/admin/reports/weekly-preview-panel";
import type { ReportAdminLocale, WeeklyPreviewMode } from "@/lib/admin-reports";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";
import type { ReportWorkspaceConfig } from "@/lib/report-workspace";

export function WeeklyPreviewSidebar({
  activeReport,
  dailyConfig,
  language,
  operationalWarningHint,
  preview,
  reports,
  weeklyConfig,
}: {
  activeReport: WeeklyReportRecord | null;
  dailyConfig: ReportWorkspaceConfig;
  language: ReportAdminLocale;
  operationalWarningHint: string | null;
  preview: WeeklyPreviewMode;
  reports: WeeklyReportRecord[];
  weeklyConfig: ReportWorkspaceConfig;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
      <div className="grid gap-6">
        {activeReport ? (
          <WeeklyPreviewPanel
            language={language}
            preview={preview}
            report={activeReport}
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
          activeReportId={activeReport?.id ?? null}
          language={language}
          preview={preview}
          reports={reports}
        />
      </div>
    </div>
  );
}
