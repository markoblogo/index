import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import {
  getBlogLabels,
  getBlogTags,
  spikeBlogPosts,
  type BlogPostLanguage,
} from "@/lib/blog-posts";
import { isLocale, type Locale } from "@/lib/i18n";

type BlogPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lang?: string; q?: string; tag?: string }>;
};

type BlogLanguageFilter = "all" | BlogPostLanguage;

export function generateStaticParams() {
  return [{ locale: "uk" }, { locale: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "en";
  const labels = getBlogLabels(safeLocale);

  return {
    title: `${labels.title} | ${SITE_CONFIG.name}`,
    description: labels.subtitle,
  };
}

export default async function BlogPage({ params, searchParams }: BlogPageProps) {
  const [{ locale }, queryParams] = await Promise.all([params, searchParams]);

  if (SITE_CONFIG.tenantId !== "spike-ua" || !isLocale(locale)) {
    notFound();
  }

  const labels = getBlogLabels(locale);
  const query = (queryParams.q ?? "").trim();
  const selectedTag = (queryParams.tag ?? "").trim();
  const selectedLanguage = normalizeBlogLanguage(queryParams.lang);
  const normalizedQuery = query.toLowerCase();
  const languageCounts = {
    all: spikeBlogPosts.length,
    en: spikeBlogPosts.filter((post) => post.language === "en").length,
    uk: spikeBlogPosts.filter((post) => post.language === "uk").length,
  };
  const posts = spikeBlogPosts.filter((post) => {
    const matchesLanguage =
      selectedLanguage === "all" ? true : post.language === selectedLanguage;
    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;
    const searchable = [
      post.title,
      post.excerpt,
      post.body.join(" "),
      post.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = normalizedQuery
      ? searchable.includes(normalizedQuery)
      : true;

    return matchesLanguage && matchesTag && matchesSearch;
  });

  return (
    <section className="spike-blog-page min-h-screen bg-[var(--spike-hero-bg)] text-[#f8f8f2]">
      <div className="mx-auto max-w-[1900px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-8 border-b border-white/20 pb-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.26em] text-[var(--spike-accent)]">
              {labels.blog}
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black uppercase leading-[0.94] tracking-normal text-white sm:text-5xl lg:text-6xl">
              {labels.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/70 sm:text-lg">
              {labels.subtitle}
            </p>
          </div>

          <form className="grid gap-3 rounded-[1.15rem] border border-white/20 bg-[#050505]/72 p-4 shadow-2xl shadow-black/20">
            <label className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/48">
              {labels.search}
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="rounded-full border border-white/18 bg-[#f8f8f2] px-4 py-3 text-sm font-black text-[#050505] outline-none transition placeholder:text-black/45 focus:border-[var(--spike-accent)]"
                defaultValue={query}
                name="q"
                placeholder={labels.searchPlaceholder}
              />
              {selectedTag ? <input name="tag" type="hidden" value={selectedTag} /> : null}
              {selectedLanguage !== "all" ? (
                <input name="lang" type="hidden" value={selectedLanguage} />
              ) : null}
              <button className="rounded-full bg-[var(--spike-accent)] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#050505] transition hover:bg-white">
                {labels.search}
              </button>
            </div>
          </form>
        </div>

        <div className="grid gap-7 py-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-[1.15rem] border border-white/20 bg-[#050505]/72 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/48">
              {labels.tagCloud}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <TagLink
                active={!selectedTag}
                href={buildBlogHref(locale, {
                  lang: selectedLanguage,
                  q: query,
                })}
              >
                {labels.allPosts}
              </TagLink>
              {getBlogTags().map((tag) => (
                <TagLink
                  active={selectedTag === tag}
                  href={buildBlogHref(locale, {
                    lang: selectedLanguage,
                    q: query,
                    tag,
                  })}
                  key={tag}
                >
                  {tag}
                </TagLink>
              ))}
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--spike-pink)]">
                  {labels.latest}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/52">
                  {posts.length} / {spikeBlogPosts.length}
                </p>
              </div>
              <div className="rounded-full border border-white/16 bg-[#050505]/72 p-1">
                <p className="sr-only">{labels.languageFilter}</p>
                <div className="flex flex-wrap gap-1">
                  <LanguageLink
                    active={selectedLanguage === "all"}
                    count={languageCounts.all}
                    href={buildBlogHref(locale, {
                      q: query,
                      tag: selectedTag,
                    })}
                    label={labels.languageAll}
                  />
                  <LanguageLink
                    active={selectedLanguage === "en"}
                    count={languageCounts.en}
                    href={buildBlogHref(locale, {
                      lang: "en",
                      q: query,
                      tag: selectedTag,
                    })}
                    label={labels.languageEn}
                  />
                  <LanguageLink
                    active={selectedLanguage === "uk"}
                    count={languageCounts.uk}
                    href={buildBlogHref(locale, {
                      lang: "uk",
                      q: query,
                      tag: selectedTag,
                    })}
                    label={labels.languageUk}
                  />
                </div>
              </div>
            </div>

            {posts.length > 0 ? (
              <div className="grid gap-5 xl:grid-cols-2">
                {posts.map((post) => (
                  <article
                    className="group overflow-hidden rounded-[1.25rem] border border-white/18 bg-[#050505]/84 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-[var(--spike-accent)]"
                    key={post.slug}
                  >
                    <Link href={`/${locale}/blog/${post.slug}`}>
                      <div className="relative aspect-[1672/941] overflow-hidden border-b border-white/12">
                        <Image
                          alt={post.title}
                          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                          height={941}
                          src={post.coverImage}
                          width={1672}
                        />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050505]/52 to-transparent" />
                      </div>
                      <div className="grid gap-4 p-5">
                        <div className="flex flex-wrap gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
                          <span className="text-[var(--spike-accent)]">
                            {post.language.toUpperCase()}
                          </span>
                          <span>{formatDate(post.publishedAt, locale)}</span>
                          <span>{post.readingMinutes} {labels.minutes}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              className="rounded-full border border-white/16 bg-white/7 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/58"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h2 className="text-2xl font-black uppercase leading-[0.98] text-white transition group-hover:text-[var(--spike-accent)]">
                          {post.title}
                        </h2>
                        <p className="text-sm font-semibold leading-6 text-white/64">
                          {post.excerpt}
                        </p>
                        <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#050505] transition group-hover:bg-[var(--spike-accent)]">
                          {labels.read}
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-white/18 bg-[#050505]/84 p-8 text-sm font-semibold text-white/64">
                {labels.empty}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function LanguageLink({
  active,
  count,
  href,
  label,
}: {
  active: boolean;
  count: number;
  href: string;
  label: string;
}) {
  const className = `inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
    active
      ? "bg-[var(--spike-accent)] text-[#050505]"
      : "bg-white/8 text-white/68 hover:bg-white/14 hover:text-white"
  }`;

  if (count === 0) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white/28"
      >
        {label}
        <span className="text-white/24">{count}</span>
      </span>
    );
  }

  return (
    <Link className={className} href={href}>
      {label}
      <span className={active ? "text-[#050505]/58" : "text-white/38"}>
        {count}
      </span>
    </Link>
  );
}

function TagLink({
  active,
  children,
  href,
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-[var(--spike-accent)] bg-[var(--spike-accent)] text-[#050505]"
          : "border-white/18 bg-white/8 text-white/70 hover:border-[var(--spike-accent)] hover:text-white"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function normalizeBlogLanguage(value?: string): BlogLanguageFilter {
  return value === "en" || value === "uk" ? value : "all";
}

function buildBlogHref(
  locale: Locale,
  params: {
    lang?: BlogLanguageFilter;
    q?: string;
    tag?: string;
  },
) {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }

  if (params.tag) {
    query.set("tag", params.tag);
  }

  if (params.lang && params.lang !== "all") {
    query.set("lang", params.lang);
  }

  const serialized = query.toString();

  return serialized ? `/${locale}/blog?${serialized}` : `/${locale}/blog`;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
