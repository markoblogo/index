import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShareTools } from "@/components/blog/blog-share-tools";
import { SITE_CONFIG } from "@/lib/constants";
import {
  getBlogLabels,
  getBlogPost,
  spikeBlogPosts,
} from "@/lib/blog-posts";
import { isLocale, type Locale } from "@/lib/i18n";

type BlogPostPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return spikeBlogPosts.flatMap((post) => [
    { locale: "uk", slug: post.slug },
    { locale: "en", slug: post.slug },
  ]);
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);

  if (!post || !isLocale(locale)) {
    return {};
  }

  return {
    title: `${post.seoTitle} | ${SITE_CONFIG.name}`,
    description: post.seoDescription,
    openGraph: {
          description: post.seoDescription,
          images: [post.coverImage],
          title: post.seoTitle,
          type: "article",
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;

  if (SITE_CONFIG.tenantId !== "spike-ua" || !isLocale(locale)) {
    notFound();
  }

  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const labels = getBlogLabels(locale);
  const absoluteUrl = `${SITE_CONFIG.publicSiteUrl.replace(/\/+$/, "")}/${locale}/blog/${post.slug}`;

  return (
    <article className="min-h-screen bg-[var(--spike-hero-bg)] text-[#f8f8f2]">
      <div className="mx-auto max-w-[1900px] px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          className="inline-flex rounded-full border border-white/18 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/70 transition hover:border-[var(--spike-accent)] hover:text-white"
          href={`/${locale}/blog`}
        >
          ← {labels.blog}
        </Link>

        <header className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/18 bg-[#050505]/86 shadow-2xl shadow-black/25">
          <div className="grid gap-7 border-b border-white/12 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:p-9">
            <div className="max-w-6xl">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    className="rounded-full border border-white/18 bg-white/8 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505]"
                    href={`/${locale}/blog?tag=${encodeURIComponent(tag)}`}
                    key={tag}
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <h1 className="mt-6 max-w-6xl text-4xl font-black uppercase leading-[0.92] tracking-normal text-white sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              <div className="mt-6 flex flex-wrap gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
                <span className="text-[var(--spike-accent)]">
                  {post.language.toUpperCase()}
                </span>
                <span>{labels.published}: {formatDate(post.publishedAt, locale)}</span>
                <span>{post.readingMinutes} {labels.minutes}</span>
              </div>
              <p className="mt-5 max-w-4xl text-xl font-semibold leading-8 text-white/78">
                {post.excerpt}
              </p>
            </div>
            <div className="lg:justify-self-end lg:self-end">
              <BlogShareTools
                copiedLabel={labels.copied}
                copyLabel={labels.copy}
                label={labels.share}
                title={post.title}
                url={absoluteUrl}
              />
            </div>
          </div>

          <div className="relative aspect-[1672/720] max-h-[34rem] overflow-hidden">
            <Image
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover object-top"
              height={941}
              priority
              src={post.coverImage}
              width={1672}
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505]/62 to-transparent" />
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-6 text-lg font-medium leading-8 text-white/76">
            {post.body.map((paragraph, index) =>
              renderBlogParagraph(
                paragraph,
                locale,
                `paragraph-${locale}-${post.slug}-${index}`,
              ),
            )}
          </div>
          <aside className="h-fit rounded-[1.15rem] border border-white/18 bg-[#050505]/76 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[var(--spike-pink)]">
              {labels.tagCloud}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  className="rounded-full border border-white/18 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-white/70 transition hover:border-[var(--spike-accent)] hover:text-white"
                  href={`/${locale}/blog?tag=${encodeURIComponent(tag)}`}
                  key={tag}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function isBodyHeading(value: string) {
  return value.length <= 80 && !/[.!?…]$/.test(value);
}

function getResourceLinkMeta(line: string, locale: Locale) {
  const match = line.match(/^(PDF|EPUB):\s*(https?:\/\/\S+)$/i);

  if (!match) {
    return null;
  }

  const type = match[1].toUpperCase() as "PDF" | "EPUB";
  const href = match[2];

  return {
    href,
    label:
      locale === "uk"
        ? `Завантажити ${type}`
        : `Download ${type}`,
  };
}

function renderBlogParagraph(
  value: string,
  locale: Locale,
  keyPrefix: string,
) {
  const resource = getResourceLinkMeta(value, locale);
  if (resource) {
    return (
      <a
        className="inline-flex w-fit rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:bg-[var(--spike-accent)] hover:text-[#050505]"
        download
        href={resource.href}
        key={keyPrefix}
        rel="noopener noreferrer"
        target="_blank"
      >
        {resource.label}
      </a>
    );
  }

  if (isBodyHeading(value)) {
    return (
      <h2
        className="pt-5 text-2xl font-black uppercase leading-tight text-white"
        key={keyPrefix}
      >
        {value}
      </h2>
    );
  }

  return <p key={keyPrefix}>{value}</p>;
}
