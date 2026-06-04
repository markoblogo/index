import Link from "next/link";
import type { WeeklyEditorialPost } from "@/lib/weekly-editorial-posts";

export function WeeklyEditorialPostView({
  locale,
  post,
}: {
  locale: "en" | "uk";
  post: WeeklyEditorialPost;
}) {
  const reportHref = `/${locale}/analytics/weekly-reports/${post.relatedReportSlug}`;
  const listingHref = `/${locale}/market-intelligence`;

  return (
    <article className="min-h-screen bg-[var(--spike-hero-bg)] text-[#f8f8f2]">
      <div className="mx-auto max-w-[1900px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          className="inline-flex rounded-full border border-white/18 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/70 transition hover:border-[var(--spike-accent)] hover:text-white"
          href={listingHref}
        >
          ← {locale === "uk" ? "Market intelligence" : "Market intelligence"}
        </Link>

        <header className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/18 bg-[#050505]/86 shadow-2xl shadow-black/25">
          <div className="grid gap-7 border-b border-white/12 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-9">
            <div className="max-w-6xl">
              <div className="flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
                <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
                  AI editorial
                </span>
                <span>{formatDate(post.publishedAt, locale)}</span>
                <span>
                  {locale === "uk" ? "Тиждень до" : "Week ending"} {post.weekEndDate}
                </span>
              </div>
              <h1 className="mt-6 max-w-6xl text-4xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              <p className="mt-5 max-w-4xl text-xl font-semibold leading-8 text-white/78">
                {post.subtitle}
              </p>
            </div>
            <div className="self-end rounded-[1rem] border border-white/12 bg-white/4 p-4 text-sm leading-6 text-white/64">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--spike-accent)]">
                {locale === "uk" ? "Повний звіт" : "Full report"}
              </p>
              <p className="mt-3">{post.relatedReportTitle}</p>
              <Link
                className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#050505] transition hover:bg-[var(--spike-accent)]"
                href={reportHref}
              >
                {locale === "uk" ? "Відкрити weekly report" : "Open weekly report"}
              </Link>
            </div>
          </div>

          {post.coverImage ? (
            <div className="relative aspect-[3/1.55] max-h-[36rem] overflow-hidden">
              <img
                alt={post.coverImageAlt}
                className="absolute inset-0 h-full w-full object-cover"
                src={post.coverImage}
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505]/62 to-transparent" />
            </div>
          ) : null}
        </header>

        <div className="mx-auto grid max-w-6xl gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-8 text-lg font-medium leading-8 text-white/76">
            <section>
              <p>{post.intro}</p>
            </section>
            {post.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-black uppercase leading-tight text-white">
                  {section.title}
                </h2>
                <p className="mt-4">{section.body}</p>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-[1.15rem] border border-white/18 bg-[#050505]/76 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--spike-pink)]">
              {locale === "uk" ? "SEO / LLMO signals" : "SEO / LLMO signals"}
            </p>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-white/64">
              <p>{locale === "uk" ? "Тижневий editorial layer на базі SPIKE weekly report." : "Weekly editorial layer derived from the SPIKE weekly report."}</p>
              <p>{locale === "uk" ? "Окремий canonical URL, article metadata і cover asset." : "Separate canonical URL, article metadata and cover asset."}</p>
              <p>{locale === "uk" ? "Повний report залишається доступним за linked analytics URL." : "The full report remains available at the linked analytics URL."}</p>
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string, locale: "en" | "uk") {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
