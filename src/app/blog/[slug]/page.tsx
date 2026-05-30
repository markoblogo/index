import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatformBlogPost, getPlatformBlogPosts } from "@/lib/platform-blog-posts";
import { isPlatformSite } from "@/lib/platform-site";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function generateStaticParams() {
  return getPlatformBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPlatformBlogPost(slug);

  if (!post) {
    return {
      title: "1d3x Blog",
    };
  }

  return {
    title: `${post.seoTitle} | 1d3x Blog`,
    description: post.seoDescription,
    openGraph: {
      description: post.seoDescription,
      images: [post.coverImage],
      title: post.seoTitle,
      type: "article",
    },
  };
}

export default async function PlatformBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isPlatformSite()) {
    notFound();
  }

  const { slug } = await params;
  const post = getPlatformBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#07100c] text-white">
      <article className="mx-auto max-w-5xl px-5 py-8 sm:px-6 lg:px-8 lg:py-12">
        <Link
          className="inline-flex rounded-full border border-white/18 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/70 transition hover:border-[#d6ff58] hover:text-white"
          href="/blog"
        >
          ← Back to blog
        </Link>

        <header className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/18 bg-[#050505]/86 shadow-2xl shadow-black/25">
          <div className="border-b border-white/12 p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Link
                  className="rounded-full border border-white/18 bg-white/8 px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-[#d6ff58] hover:bg-[#d6ff58] hover:text-[#07100c]"
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  key={tag}
                >
                  {tag}
                </Link>
              ))}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[0.92] tracking-normal sm:text-5xl">
              {post.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/45">
              <span className="text-[#d6ff58]">{formatDate(post.publishedAt)}</span>
              <span>{post.readingMinutes} min read</span>
            </div>
            <p className="mt-5 max-w-4xl text-xl font-semibold leading-8 text-white/78">
              {post.excerpt}
            </p>
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
          </div>
        </header>

        <div className="mx-auto max-w-5xl gap-8 py-10">
          <div className="grid gap-5 text-lg font-medium leading-8 text-white/76">
            {post.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
