import type { WeeklyReportRecord } from "@/lib/weekly-ai-report";

export function WeeklyReportView({ report }: { report: WeeklyReportRecord }) {
  if (!report.content) {
    return (
      <div className="rounded-[1.2rem] border border-white/12 bg-[#0b0b0b] p-5 text-sm text-white/60">
        Weekly report content has not been generated yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.35rem] border border-white/12 bg-[#0b0b0b] p-6 text-[#f8f8f2]">
        <div className="flex flex-wrap items-center gap-2 text-[0.72rem] font-black uppercase tracking-[0.14em]">
          <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
            AI-assisted
          </span>
          <span className="rounded-full border border-white/14 px-3 py-1 text-white/66">
            Week ending {report.weekEndDate}
          </span>
          <span className="rounded-full border border-white/14 px-3 py-1 text-white/66">
            Published {report.publishedAt?.slice(0, 10) ?? "pending"}
          </span>
          <span className="rounded-full border border-white/14 px-3 py-1 text-white/66">
            Data confidence: {report.dataConfidence}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-white">
          {report.title}
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-white/68">
          {report.content.methodology}
        </p>
      </section>

      {report.content.parts.map((part) => (
        <section
          className="rounded-[1.35rem] border border-white/12 bg-[#0b0b0b] p-6 text-[#f8f8f2]"
          key={part.key}
        >
          <h2 className="text-2xl font-black uppercase tracking-normal text-white">
            {part.title}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {part.sections.map((section) => (
              <article
                className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-[#050505]"
                key={`${part.key}-${section.title}`}
              >
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-[#050505]">
                  {section.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-black/68">
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[1.35rem] border border-white/12 bg-[#0b0b0b] p-6 text-[#f8f8f2]">
        <h2 className="text-xl font-black uppercase tracking-normal text-white">
          Source notes
        </h2>
        <div className="mt-4 grid gap-3">
          {report.content.sourceNotes.length > 0 ? (
            report.content.sourceNotes.map((source) => (
              <div
                className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
                key={`${source.title}-${source.url}`}
              >
                <p className="text-sm font-black uppercase tracking-[0.08em] text-white">
                  {source.title}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/42">
                  {source.type}
                </p>
                {source.url ? (
                  <a
                    className="mt-2 block text-sm font-semibold text-[var(--spike-accent)] underline-offset-4 hover:underline"
                    href={source.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {source.url}
                  </a>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-white/60">
              No source notes were attached to this report.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-white/12 bg-[#0b0b0b] p-6 text-xs font-semibold leading-6 text-white/56">
        {report.content.disclaimer}
      </section>
    </div>
  );
}
