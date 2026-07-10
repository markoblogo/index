"use client";

import type { ReportWorkspaceConfig, ReportWorkspaceResource } from "@/lib/report-workspace";
import { buildOperationalReadiness } from "@/lib/admin-reports";
import type { getMediaHubReportEvidence } from "@/lib/media-hub-publication-scheduler";
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
  dailyEvidence: Awaited<ReturnType<typeof getMediaHubReportEvidence>>;
  dailyTemplatePreview: string;
  notice?: string;
  operationalReadiness: Awaited<ReturnType<typeof buildOperationalReadiness>>;
  selectedLanguage: "en" | "uk";
  activeTradeDate: string;
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
  dailyEvidence,
  dailyTemplatePreview,
  notice,
  operationalReadiness,
  selectedLanguage,
  activeTradeDate,
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
              Active trade date: <span className="font-semibold text-white">{activeTradeDate}</span>
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
          <EvidencePanel dailyEvidence={dailyEvidence} />
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

function EvidencePanel({
  dailyEvidence,
}: {
  dailyEvidence: Awaited<ReturnType<typeof getMediaHubReportEvidence>>;
}) {
  const validation = dailyEvidence?.validation;
  const unsupported = validation?.unsupportedClaims ?? [];
  const evidence = dailyEvidence?.evidence ?? [];

  return (
    <section className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/45">
            Evidence / claim gate
          </p>
          <p className="mt-2 text-sm text-white/68">
            Shows source support saved with the latest generated Context daily report.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
          validation?.status === "needs_review"
            ? "border-amber-300/50 bg-amber-300/10 text-amber-100"
            : validation?.status === "passed"
              ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
              : "border-white/12 text-white/45"
        }`}>
          {validation?.status ?? "no report"}
        </span>
      </div>

      {unsupported.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
            Needs review
          </p>
          {unsupported.map((item) => (
            <div
              className="rounded-[1rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50"
              key={item.claim}
            >
              <p className="font-semibold">{item.claim}</p>
              <p className="mt-1 text-xs text-amber-100/70">{item.reason}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
          Evidence items: {evidence.length}
        </p>
        {evidence.slice(0, 12).map((item) => (
          <div
            className="rounded-[1rem] border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white/68"
            key={item.id}
          >
            <div className="flex flex-wrap gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/38">
              <span>{item.sourceType}</span>
              <span>{item.confidence}</span>
              {item.sourceDate ? <span>{item.sourceDate.slice(0, 10)}</span> : null}
            </div>
            <p className="mt-1 font-semibold text-white">{item.sourceTitle}</p>
            <p className="mt-1">{item.excerpt}</p>
            {item.sourceUrl ? (
              <a className="mt-2 inline-flex text-xs font-semibold text-uga-lime" href={item.sourceUrl}>
                Open source
              </a>
            ) : null}
          </div>
        ))}
        {evidence.length === 0 ? (
          <p className="text-sm text-white/55">
            No evidence ledger saved yet. Generate/publish a Context daily report first.
          </p>
        ) : null}
      </div>
    </section>
  );
}
