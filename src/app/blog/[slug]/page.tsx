import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlatformBlogPost,
  getPlatformBlogPosts,
  type PlatformBlogContentBlock,
  type PlatformBlogPost,
} from "@/lib/platform-blog-posts";
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

  const blocks = post.content ?? legacyBodyToBlocks(post.body);

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
            {blocks.map((block, index) => (
              <PlatformPostBlock block={block} key={`${post.slug}-block-${index}`} />
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}

function PlatformPostBlock({ block }: { block: PlatformBlogContentBlock }) {
  if (block.kind === "paragraph") {
    return (
      <p>
        {block.text.split("\n\n").map((line, index) => (
          <span className="block" key={`${line}-${index}`}>
            {line}
          </span>
        ))}
      </p>
    );
  }

  if (block.kind === "heading") {
    if (block.level === 2) {
      return (
        <h2 className="mt-8 text-2xl font-black uppercase tracking-[0.08em] text-[#d6ff58] md:text-3xl">
          {block.text}
        </h2>
      );
    }

    return (
      <h3 className="mt-8 text-xl font-black uppercase tracking-[0.08em] text-[#d6ff58] md:text-2xl">
        {block.text}
      </h3>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="grid gap-2 pl-5 text-base leading-7 text-white/82 md:text-lg">
        {block.items.map((item) => (
          <li className="list-disc" key={item}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "downloadButtons") {
    return (
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {block.links.map((link) => (
          <Link
            className="inline-flex justify-center rounded-full border border-[#d6ff58] bg-[#d6ff58] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#07100c] transition hover:bg-[#d6ff58]/85"
            href={link.href}
            key={link.href}
            target="_blank"
          >
            {link.label}
          </Link>
        ))}
      </div>
    );
  }

  if (block.kind === "bookPanel") {
    return (
      <div className="grid gap-6 rounded-[1.25rem] border border-white/18 bg-[#050505]/84 p-5 md:grid-cols-[220px_1fr] md:gap-8 md:p-6 lg:grid-cols-[260px_1fr]">
        <Image
          alt={block.imageAlt}
          className="w-full rounded-xl border border-white/12 object-cover"
          height={1400}
          src={block.image}
          width={980}
        />
        <div className="grid gap-4">
          <p className="text-base leading-7 text-white/82">{block.description}</p>
          <div className="grid gap-3 sm:flex">
            <Link
              className="inline-flex justify-center rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#07100c] transition hover:bg-[#d6ff58]"
              href={block.pdf}
              target="_blank"
            >
              Даунлоад PDF
            </Link>
            <Link
              className="inline-flex justify-center rounded-full border border-white/18 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white/88 transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
              href={block.epub}
              target="_blank"
            >
              Даунлоад EPUB
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="rounded-[1rem] border border-white/18 bg-[#091f17] p-5 text-base leading-8 text-[#9fffb1] md:text-lg">
      {block.text.split("\n\n").map((line, index) => (
        <span className="block" key={`${line}-${index}`}>
          {line}
        </span>
      ))}
    </p>
  );
}

function legacyBodyToBlocks(body: PlatformBlogPost["body"]) {
  return body.map((paragraph) => ({
    kind: "paragraph" as const,
    text: paragraph,
  }));
}
