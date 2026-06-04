import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { isLocale, type Locale } from "@/lib/i18n";
import { listPublishedWeeklyEditorialPosts } from "@/lib/weekly-editorial-posts";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale: Locale = isLocale(locale) ? locale : "en";
  const title =
    safeLocale === "uk" ? "Market Intelligence" : "Market Intelligence";
  const description =
    safeLocale === "uk"
      ? "Щотижневі AI-assisted editorial market intelligence posts на базі SPIKE weekly reports."
      : "Weekly AI-assisted editorial market intelligence posts built from SPIKE weekly reports.";

  return {
    title: `${title} | ${SITE_CONFIG.name}`,
    description,
    alternates: {
      canonical: `/${safeLocale}/market-intelligence`,
    },
    openGraph: {
      description,
      title,
      type: "website",
      url: `/${safeLocale}/market-intelligence`,
    },
  };
}

export default async function MarketIntelligencePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    notFound();
  }

  const posts = await listPublishedWeeklyEditorialPosts(locale);

  return (
    <main className="min-h-screen bg-[var(--spike-hero-bg)] text-[#f8f8f2]">
      <section className="border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-14">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            Market intelligence
          </p>
          <h1 className="mt-4 max-w-5xl text-[clamp(2rem,4.5vw,4.4rem)] font-black uppercase leading-[0.94] tracking-normal text-white">
            {locale === "uk"
              ? "Weekly AI editorial posts for SEO and market discovery"
              : "Weekly AI editorial posts for SEO and market discovery"}
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-7 text-white/64">
            {locale === "uk"
              ? "Окремий public stream на базі опублікованих weekly reports: більш narrative market posts, cover assets і indexable article pages."
              : "A dedicated public stream built from published weekly reports: more narrative market posts, cover assets and indexable article pages."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-5 xl:grid-cols-2">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Link
                className="group overflow-hidden rounded-[1.25rem] border border-white/18 bg-[#050505]/84 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-[var(--spike-accent)]"
                href={`/${locale}/market-intelligence/${post.slug}`}
                key={post.slug}
              >
                {post.coverImage ? (
                  <div className="relative aspect-[3/1.8] overflow-hidden border-b border-white/12">
                    <img
                      alt={post.coverImageAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      src={post.coverImage}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050505]/52 to-transparent" />
                  </div>
                ) : null}
                <div className="grid gap-4 p-5">
                  <div className="flex flex-wrap gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
                    <span className="rounded-full bg-[var(--spike-accent)] px-3 py-1 text-[#050505]">
                      AI editorial
                    </span>
                    <span>{post.publishedAt}</span>
                    <span>{post.weekEndDate}</span>
                  </div>
                  <h2 className="text-2xl font-black uppercase leading-[0.98] text-white transition group-hover:text-[var(--spike-accent)]">
                    {post.title}
                  </h2>
                  <p className="text-sm font-semibold leading-6 text-white/64">
                    {post.excerpt}
                  </p>
                  <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#050505] transition group-hover:bg-[var(--spike-accent)]">
                    {locale === "uk" ? "Читати" : "Read"}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-[1.25rem] border border-white/10 bg-[#0b0b0b] p-5 text-sm text-white/60">
              {locale === "uk"
                ? "Ще немає опублікованих editorial market posts."
                : "No published editorial market posts yet."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
