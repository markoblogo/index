export type PlatformBlogPost = {
  body: string[];
  coverImage: string;
  excerpt: string;
  publishedAt: string;
  readingMinutes: number;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  tags: string[];
  title: string;
};

export const platformBlogPosts: PlatformBlogPost[] = [
  {
    body: [
      "Today we officially launched the 1d3x blog.",
      "This is where we will publish practical updates on how local commodity index infrastructure is built, what we release first, and where we partner next.",
      "The 1d3x platform connects proven index methodology and publishing technology with local market leaders. We are already active with UGA and SPIKE and preparing additional local products with the same repeatable model.",
      "We will share partner updates, implementation notes and practical market context from new jurisdictions as we enter new launches.",
    ],
    coverImage: "/brand/operational-model.png",
    excerpt:
      "We launched the 1d3x blog to publish updates on local commodity index launches, methodology and partner projects.",
    publishedAt: "2026-05-30",
    readingMinutes: 2,
    seoDescription:
      "The 1d3x blog launch post introduces our index infrastructure initiative, methodology-driven local launches, and partnership-focused growth model.",
    seoTitle: "We launched the 1d3x blog",
    slug: "we-launched-the-1d3x-blog",
    tags: ["1d3x", "announcement", "market infrastructure"],
    title: "We launched the 1d3x blog",
  },
];

export function getPlatformBlogPost(slug: string) {
  return platformBlogPosts.find((post) => post.slug === slug) ?? null;
}

export function getPlatformBlogPosts() {
  return [...platformBlogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

export function getPlatformBlogTags() {
  return [...new Set(platformBlogPosts.flatMap((post) => post.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}
