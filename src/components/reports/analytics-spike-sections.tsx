import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import type { PublicAiMarketBrief } from "@/lib/ai-market-brief-types";
import type { Locale } from "@/lib/i18n";
import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";

export function AnalyticsSpikeSections({
  aiBrief,
  aiCopy,
  locale,
  weeklyCopy,
  weeklyReport,
}: {
  aiBrief: PublicAiMarketBrief | null;
  aiCopy: SpikeAiCopy;
  locale: Locale;
  weeklyCopy: SpikeWeeklyCopy;
  weeklyReport: WeeklyReportRecord | null;
}) {
  return (
    <>
      {aiBrief ? (
        <AiMarketBriefSection brief={aiBrief} copy={aiCopy} locale={locale} />
      ) : null}

      <WeeklyReportSection copy={weeklyCopy} locale={locale} report={weeklyReport} />
    </>
  );
}

function AiMarketBriefSection({
  brief,
  copy,
  locale,
}: {
  brief: PublicAiMarketBrief;
  copy: SpikeAiCopy;
  locale: Locale;
}) {
  return (
    <section className="border-y border-white/10 bg-[#101010]">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[0.76fr_1.24fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-normal text-white">
            {copy.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/64">
            {copy.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em]">
            <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
              {copy.aiAssistedBadge}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.generatedLabel}: {brief.generatedAt}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.confidenceLabel}:{" "}
              {mapBriefConfidenceLabel(brief.confidence, locale)}
            </span>
            <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
              {copy.officialUnchangedBadge}
            </span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {brief.blocks[0] ? (
            <article className="rounded-[1rem] border border-[var(--spike-accent)]/60 bg-[#f8f8f2] p-5 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[0].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
                {brief.blocks[0].body}
              </p>
            </article>
          ) : null}
          {brief.blocks.slice(1, 3).map((block) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505]"
              key={block.title}
            >
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {block.title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {block.body}
              </p>
            </article>
          ))}
          {brief.blocks[3] ? (
            <article className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                {brief.blocks[3].title}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-black/64">
                {brief.blocks[3].body}
              </p>
            </article>
          ) : null}
          <p className="rounded-[1rem] border border-white/10 bg-black/45 p-4 text-xs font-semibold leading-5 text-white/58 md:col-span-2">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

function WeeklyReportSection({
  copy,
  locale,
  report,
}: {
  copy: SpikeWeeklyCopy;
  locale: Locale;
  report: WeeklyReportRecord | null;
}) {
  return (
    <section className="border-y border-white/10 bg-[#0b0b0b]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal text-white">
              {copy.title}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/64">
              {copy.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.12em]">
              {report ? (
                <>
                  <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
                    AI-assisted
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.weekEndingLabel}:{" "}
                    {formatWeeklyBadgeDate(report.weekEndDate, locale) ??
                      report.weekEndDate}
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.publicationLabel}:{" "}
                    {formatWeeklyBadgeDate(report.publishedAt, locale) ??
                      report.weekEndDate}
                  </span>
                  <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                    {copy.confidenceLabel}: {report.dataConfidence}
                  </span>
                </>
              ) : (
                <span className="rounded-full border border-white/18 px-3 py-1 text-white/58">
                  {copy.noReportLabel}
                </span>
              )}
            </div>
            {report?.content?.executiveSummary?.[0] ? (
              <p className="mt-5 rounded-[1rem] border border-white/10 bg-white/4 p-4 text-sm leading-6 text-white/74">
                {report.content.executiveSummary[0]}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                className="rounded-full bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-black transition hover:bg-[var(--spike-accent)]"
                href={report ? `/${locale}/analytics/weekly-reports/${report.slug}` : `/${locale}/analytics/weekly-reports`}
              >
                {report ? copy.openLatestCta : copy.viewArchiveCta}
              </a>
              <a
                className="rounded-full border border-white/18 px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-white transition hover:border-[var(--spike-accent)] hover:text-[var(--spike-accent)]"
                href={`/${locale}/analytics/weekly-reports`}
              >
                {copy.allReportsCta}
              </a>
            </div>
          </div>

          <div className="rounded-[1.15rem] border border-white/10 bg-[#050505] p-4">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:hidden">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    {copy.previewLabel}
                  </p>
                  <p className="mt-2 text-lg font-black uppercase tracking-normal text-white">
                    {copy.previewTitle}
                  </p>
                </div>
                <span className="rounded-full border border-white/14 px-3 py-1 text-xs font-black uppercase text-white/65 transition group-open:bg-white group-open:text-black">
                  {copy.expandLabel}
                </span>
              </summary>
              <div className="mt-5">
                {report ? (
                  <WeeklyReportView report={report} />
                ) : (
                  <div className="rounded-[1rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/64">
                    {copy.noReportBody}
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

type SpikeAiCopy = {
  aiAssistedBadge: string;
  confidenceLabel: string;
  description: string;
  disclaimer: string;
  eyebrow: string;
  generatedLabel: string;
  officialUnchangedBadge: string;
  title: string;
};

type SpikeWeeklyCopy = {
  allReportsCta: string;
  confidenceLabel: string;
  description: string;
  expandLabel: string;
  eyebrow: string;
  noReportBody: string;
  noReportLabel: string;
  openLatestCta: string;
  previewLabel: string;
  previewTitle: string;
  publicationLabel: string;
  title: string;
  viewArchiveCta: string;
  weekEndingLabel: string;
};

function formatWeeklyBadgeDate(value: string | null | undefined, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function mapBriefConfidenceLabel(confidence: string, locale: Locale) {
  if (locale === "uk") {
    return confidence === "strong"
      ? "висока"
      : confidence === "limited"
        ? "обмежена"
        : "нормальна";
  }

  return confidence;
}
