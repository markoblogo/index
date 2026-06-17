"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  buildReportsUrl,
  reportsNoticeMap,
  type ReportAdminLocale,
  type ReportsSection,
  type WeeklyPreviewMode,
} from "@/lib/admin-reports";

type ReportsWorkspaceHeaderProps = {
  actions?: ReactNode;
  language: ReportAdminLocale;
  notice?: string;
  preview?: WeeklyPreviewMode;
  reportId?: string | null;
  section: ReportsSection;
  week?: string;
};

export function ReportsWorkspaceHeader({
  actions,
  language,
  notice,
  preview = "website",
  reportId,
  section,
  week,
}: ReportsWorkspaceHeaderProps) {
  return (
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
            Configure collection windows, editorial prompts, Telegram templates and
            external resources for daily and weekly publishing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <HeaderPill
              active={section === "daily"}
              href={buildReportsUrl("daily", {
                lang: language,
                notice,
                reportId: reportId ?? undefined,
              })}
              label="Daily operations"
            />
            <HeaderPill
              active={section === "weekly"}
              href={buildReportsUrl("weekly", {
                lang: language,
                preview,
                reportId: reportId ?? undefined,
                week,
              })}
              label="Weekly operations"
            />
            <HeaderPill
              active={language === "uk"}
              href={buildReportsUrl(section, {
                lang: "uk",
                preview,
                reportId: reportId ?? undefined,
                week,
              })}
              label={section === "daily" ? "Daily UA" : "Weekly UA"}
              subtle
            />
            <HeaderPill
              active={language === "en"}
              href={buildReportsUrl(section, {
                lang: "en",
                preview,
                reportId: reportId ?? undefined,
                week,
              })}
              label={section === "daily" ? "Daily EN" : "Weekly EN"}
              subtle
            />
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-end gap-3">{actions}</div> : null}
      </div>

      {notice ? (
        <div className="mt-5 rounded-2xl border border-uga-green/20 bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
          {reportsNoticeMap[notice] ?? "Action completed."}
        </div>
      ) : null}
    </header>
  );
}

function HeaderPill({
  active,
  href,
  label,
  subtle = false,
}: {
  active: boolean;
  href: string;
  label: string;
  subtle?: boolean;
}) {
  const className = subtle
    ? active
      ? "rounded-full border border-uga-green px-3 py-1 text-sm text-uga-green"
      : "rounded-full border border-white/15 px-3 py-1 text-sm text-white/70"
    : active
      ? "rounded-full border border-uga-green bg-uga-green/10 px-3 py-1 text-sm text-white"
      : "rounded-full border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-uga-green hover:text-uga-green";

  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}
