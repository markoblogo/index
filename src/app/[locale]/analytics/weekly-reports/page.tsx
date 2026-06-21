import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { getPublishedWeeklyReports } from "@/lib/weekly-ai-report-lazy";

export const dynamic = "force-dynamic";

export default async function WeeklyReportsArchivePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const reports = await getPublishedWeeklyReports();

  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] text-[#f8f8f2]">
      <section className="border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-14">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            Weekly reports
          </p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2rem,4.5vw,4.4rem)] font-black uppercase leading-[0.94] tracking-normal text-white">
            Weekly AI Commodity & Logistics Report
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-white/64">
            A weekly AI-assisted commodity and logistics market report combining
            SPIKE SPOT INDEX data, logistics inputs, export flows, futures
            context, external market factors and verified sources into a
            structured three-part publication.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-4">
          {reports.length > 0 ? (
            reports.map((report) => (
              <Link
                className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5 transition hover:border-[var(--spike-accent)]"
                href={`/${locale}/analytics/weekly-reports/${report.slug}`}
                key={report.id}
              >
                <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.12em] text-white/52">
                  <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
                    AI-assisted
                  </span>
                  <span className="rounded-full border border-white/14 px-3 py-1">
                    Week ending {report.weekEndDate}
                  </span>
                  <span className="rounded-full border border-white/14 px-3 py-1">
                    {report.dataConfidence}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black uppercase tracking-normal text-white">
                  {report.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Published{" "}
                  {report.publishedAt?.slice(0, 10) ?? report.weekEndDate} ·
                  three-part report covering logistics, grains, oilseeds and
                  processing.
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5 text-sm text-white/60">
              No published weekly reports yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
