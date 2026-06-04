import Image from "next/image";
import Link from "next/link";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import {
  buildReportsUrl,
  humanizeWeeklyStatus,
  type ReportAdminLocale,
  type WeeklyPreviewMode,
} from "@/lib/admin-reports";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";

export function WeeklySurfaceStatusPanel({
  detailCards,
}: {
  detailCards: Array<{
    detail: string;
    label: string;
    tone: "ok" | "warn";
    value: string;
  }>;
}) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Weekly control center</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          One-place orientation for draft freshness, publication state and editorial sync health.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {detailCards.map((item) => (
          <SurfaceStatusCard key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}

export function WeeklyRunsList({
  activeReportId,
  language,
  preview,
  reports,
}: {
  activeReportId?: string | null;
  language: ReportAdminLocale;
  preview: WeeklyPreviewMode;
  reports: WeeklyReportRecord[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" id="weekly-archive">
      <h2 className="text-lg font-semibold text-white">Weekly runs</h2>
      <div className="mt-4 grid gap-3">
        {reports.length > 0 ? (
          reports.map((item) => (
            <Link
              className={`rounded-[1rem] border p-4 text-sm transition ${
                activeReportId === item.id
                  ? "border-uga-green bg-uga-green/10 text-white"
                  : "border-white/10 bg-black/30 text-white/75 hover:border-white/25"
              }`}
              href={buildReportsUrl("weekly", {
                lang: language,
                preview,
                reportId: item.id,
                week: item.weekEndDate,
              })}
              key={item.id}
            >
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                {item.weekEndDate} · {humanizeWeeklyStatus(item.status)} · v{item.version}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-white/65">No weekly runs stored yet.</p>
        )}
      </div>
    </div>
  );
}

export function WeeklyPreviewPanel({
  language,
  preview,
  report,
}: {
  language: ReportAdminLocale;
  preview: WeeklyPreviewMode;
  report: WeeklyReportRecord;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5" id="weekly-preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Weekly preview</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">
            Switch between website, Telegram and editorial views instead of scrolling through all three.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "website", label: "Website output" },
            { key: "telegram", label: "Telegram output" },
            { key: "editorial", label: "Editorial layer" },
          ].map((item) => (
            <Link
              className={`rounded-full border px-3 py-1 text-sm transition ${
                preview === item.key
                  ? "border-uga-green bg-uga-green/10 text-white"
                  : "border-white/15 text-white/70 hover:border-uga-green hover:text-uga-green"
              }`}
              href={buildReportsUrl("weekly", {
                lang: language,
                preview: item.key,
                reportId: report.id,
                week: report.weekEndDate,
              })}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-[#050505] p-5">
        {preview === "website" ? (
          <WeeklyReportView report={report} />
        ) : preview === "telegram" ? (
          <WeeklyTelegramPreview report={report} />
        ) : (
          <WeeklyEditorialPreview report={report} />
        )}
      </div>
    </section>
  );
}

function WeeklyTelegramPreview({ report }: { report: WeeklyReportRecord }) {
  return (
    <div className="grid gap-4">
      {report.adminEditedContent?.coverImageUrl ? (
        <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
            Cover asset
          </p>
          <div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-[0.9rem]">
            <Image
              alt={report.adminEditedContent.coverImageAlt || "Weekly cover asset"}
              className="object-cover"
              fill
              sizes="(max-width: 1280px) 100vw, 50vw"
              src={report.adminEditedContent.coverImageUrl}
              unoptimized
            />
          </div>
          <p className="mt-2 break-all text-sm text-uga-green">
            {report.adminEditedContent.coverImageUrl}
          </p>
          {report.adminEditedContent.coverImageCaption ? (
            <p className="mt-2 text-sm leading-6 text-white/72">
              {report.adminEditedContent.coverImageCaption}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {report.content?.telegramMessages.map((message, index) => (
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
    </div>
  );
}

function WeeklyEditorialPreview({ report }: { report: WeeklyReportRecord }) {
  const draft = report.content?.blogDraft;

  if (!draft) {
    return (
      <div className="rounded-[1rem] border border-white/10 bg-black/30 p-4 text-sm text-white/62">
        Editorial layer appears here after the weekly draft is built.
      </div>
    );
  }

  return (
    <article className="rounded-[1.2rem] border border-white/10 bg-black/30 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
        Editorial layer
      </p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{draft.title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/62">{draft.subtitle}</p>
      <p className="mt-4 text-sm leading-7 text-white/78">{draft.intro}</p>
      <div className="mt-5 grid gap-4">
        {draft.sections.map((section) => (
          <section
            className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
            key={section.title}
          >
            <h4 className="text-base font-semibold text-white">{section.title}</h4>
            <p className="mt-2 text-sm leading-7 text-white/72">{section.body}</p>
          </section>
        ))}
      </div>
      <div className="mt-5 grid gap-3 rounded-[1rem] border border-white/10 bg-black/30 p-4 text-sm text-white/72">
        <p><span className="font-semibold text-white">Closing:</span> {draft.closing}</p>
        <p><span className="font-semibold text-white">SEO description:</span> {draft.seoDescription}</p>
        <p><span className="font-semibold text-white">Slug:</span> {draft.slug}</p>
        <p><span className="font-semibold text-white">Cover alt:</span> {draft.coverAlt}</p>
        <p><span className="font-semibold text-white">Cover prompt:</span> {draft.coverPrompt}</p>
      </div>
    </article>
  );
}

function SurfaceStatusCard({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "ok" | "warn";
  value: string;
}) {
  return (
    <article className="rounded-[1rem] border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">{label}</h3>
        <span
          className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
            tone === "ok"
              ? "bg-uga-green/15 text-uga-green"
              : "bg-amber-400/15 text-amber-100"
          }`}
        >
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/68">{detail}</p>
    </article>
  );
}
