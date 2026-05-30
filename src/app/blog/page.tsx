import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlatformBlogPosts,
  getPlatformBlogTags,
  type PlatformBlogPost,
} from "@/lib/platform-blog-posts";
import { isPlatformSite } from "@/lib/platform-site";

type SearchParams = {
  tag?: string;
  q?: string;
};

function buildBlogHref(params: { tag?: string; q?: string }) {
  const query = new URLSearchParams();

  if (params.q?.trim()) {
    query.set("q", params.q.trim());
  }

  if (params.tag?.trim()) {
    query.set("tag", params.tag.trim());
  }

  const search = query.toString();

  return search ? `/blog?${search}` : "/blog";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function matchesQuery(post: PlatformBlogPost, query: string) {
  if (!query) {
    return true;
  }

  const haystack = buildPlatformSearchText(post).toLowerCase();

  return haystack.includes(query);
}

function buildPlatformSearchText(post: PlatformBlogPost) {
  const richText = post.content
    ? post.content
        .map((block) => {
          switch (block.kind) {
            case "heading":
            case "paragraph":
            case "highlight":
              return block.text;
            case "list":
              return block.items.join(" ");
            case "downloadButtons":
              return block.links.map((link) => link.label).join(" ");
            case "bookPanel":
              return `${block.description} ${block.imageAlt}`;
            default:
              return "";
          }
        })
        .join(" ")
    : post.body.join(" ");

  return [post.title, post.excerpt, post.tags.join(" "), richText].join(" ");
}

export const metadata: Metadata = {
  title: "1d3x Blog",
  description: "News and updates from the 1d3x index infrastructure initiative.",
  alternates: {
    canonical: "/blog",
  },
};

export default async function PlatformBlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isPlatformSite()) {
    notFound();
  }

  const queryParams = await searchParams;
  const search = (queryParams.q ?? "").toLowerCase().trim();
  const selectedTag = (queryParams.tag ?? "").trim();

  const allPosts = getPlatformBlogPosts();
  const tags = getPlatformBlogTags();

  const posts = allPosts.filter((post) => {
    const byTag = selectedTag ? post.tags.includes(selectedTag) : true;
    const byQuery = matchesQuery(post, search);

    return byTag && byQuery;
  });

  return (
    <main className="min-h-screen bg-[#07100c] text-white">
      <section className="border-b border-white/10 bg-[linear-gradient(180deg,#0a170f_0%,#06100c_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
          <p className="text-sm font-black uppercase tracking-[0.26em] text-[#9fffa8]">
            1d3x blog
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.94] tracking-normal sm:text-5xl lg:text-6xl">
            Market notes from the index launch team
          </h1>
          <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-white/70 sm:text-lg">
            We publish updates on local commodity benchmark launches, methodology,
            launches and partnership milestones.
          </p>

          <form className="mt-8 grid gap-3 rounded-[1.15rem] border border-white/20 bg-[#050505]/72 p-4 shadow-2xl shadow-black/20 lg:max-w-2xl">
            <label className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/48">
              Search
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="rounded-full border border-white/18 bg-[#f8f8f2] px-4 py-3 text-sm font-black text-[#050505] outline-none transition placeholder:text-black/45 focus:border-[#d6ff58]"
                defaultValue={queryParams.q ?? ""}
                name="q"
                placeholder="Search by topic or keyword"
              />
              {selectedTag ? <input name="tag" type="hidden" value={selectedTag} /> : null}
              <button className="rounded-full bg-[#d6ff58] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#07100c] transition hover:bg-white">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b1711]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:py-12">
          <aside className="h-fit rounded-[1.15rem] border border-white/20 bg-[#07100c] p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/48">
              Tag cloud
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  !selectedTag
                    ? "border-[#d6ff58] bg-[#d6ff58] text-[#07100c]"
                    : "border-white/18 bg-white/8 text-white/72 hover:border-[#d6ff58] hover:text-white"
                }`}
                href="/blog"
              >
                All posts
              </Link>
              {tags.map((tag) => (
                <Link
                  className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                    selectedTag === tag
                      ? "border-[#d6ff58] bg-[#d6ff58] text-[#07100c]"
                      : "border-white/18 bg-white/8 text-white/72 hover:border-[#d6ff58] hover:text-white"
                  }`}
                  href={buildBlogHref({ tag })}
                  key={tag}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </aside>

          <div>
            {posts.length > 0 ? (
              <div className="grid gap-5">
                {posts.map((post) => (
                  <article
                    className="group overflow-hidden rounded-[1.25rem] border border-white/18 bg-[#050505]/84 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#d6ff58]"
                    key={post.slug}
                  >
                    <Link href={`/blog/${post.slug}`}>
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
                          <span className="text-[#d6ff58]">{formatDate(post.publishedAt)}</span>
                          <span>{post.readingMinutes} min read</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {post.tags.map((tag) => (
                            <span
                              className="rounded-full border border-white/16 bg-white/7 px-3 py-1 text-[0.64rem] font-black uppercase tracking-[0.12em] text-white/58"
                              key={tag}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <h2 className="text-2xl font-black uppercase leading-[0.98] text-white transition group-hover:text-[#d6ff58]">
                          {post.title}
                        </h2>
                        <p className="text-sm font-semibold leading-6 text-white/64">
                          {post.excerpt}
                        </p>
                        <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#050505] transition group-hover:bg-[#d6ff58]">
                          Read
                        </span>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-white/18 bg-[#050505]/84 p-8 text-sm font-semibold text-white/64">
                No posts found. Try another search or tag.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
