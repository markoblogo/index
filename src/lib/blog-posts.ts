import type { Locale } from "@/lib/i18n";

export type BlogPost = {
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

export const spikeBlogPosts: BlogPost[] = [
  {
    body: [
      "Ukraine's agricultural export market moves quickly. Prices are influenced by global commodity trends, port logistics, freight costs, currency movements, local supply, farmer selling activity and daily trade flow.",
      "In such an environment, market participants need more than scattered quotes or one-off conversations. They need a clear daily reference point that helps them compare price levels across commodities, bases and market segments.",
      "The SPIKE Spot Commodity Index Ukraine is designed to provide that reference. It brings together spot market information into a structured daily format, showing index values for key Ukrainian agricultural commodities across relevant export and processing bases.",
      "The purpose is not to replace negotiation or individual market judgment. Instead, the index gives producers, traders, processors, analysts and institutions a common benchmark for reading the market.",
      "A transparent daily index can help reduce information gaps, improve price discovery and make market discussion more disciplined. For a market as important and dynamic as Ukraine's, this kind of reference is becoming increasingly necessary.",
    ],
    coverImage: "/blog/why-ukraine-needs-daily-spot-commodity-index.png",
    excerpt:
      "A daily spot index helps market participants read Ukrainian grain and oilseed price levels with more structure, transparency and consistency.",
    publishedAt: "2026-05-22",
    readingMinutes: 3,
    seoDescription:
      "A short overview of why daily spot commodity indices matter for Ukrainian grain and oilseed markets.",
    seoTitle: "Why Ukraine Needs a Daily Spot Commodity Index",
    slug: "why-ukraine-needs-daily-spot-commodity-index",
    tags: [
      "Market index",
      "Ukraine",
      "Grain market",
      "Price discovery",
      "Spike Brokers",
    ],
    title: "Why Ukraine Needs a Daily Spot Commodity Index",
  },
  {
    body: [
      "Commodity markets generate a large amount of daily information: bids, offers, indicative levels, completed trades, logistics updates and currency movements. Without structure, this information can be difficult to compare.",
      "A spot index helps turn daily market signals into a more readable format. By publishing values for selected commodities and bases, the index gives users a clearer view of where the market stands at a specific point in time.",
      "For Ukrainian grain and oilseed markets, this is especially useful because price formation depends on several moving parts at once. Export demand, port availability, delivery basis, quality parameters and processing demand can all affect the final price level.",
      "The value of a spot index is in consistency. When the same methodology is applied every day, market participants can track movement over time, compare commodities and identify changes in direction more easily.",
      "The SPIKE Spot Commodity Index Ukraine is built to support this kind of daily market reading. It provides a compact view of current values while leaving space for deeper analytics, historical comparison and future data products.",
      "As with any market data, index values should be used as information, not as a trading instruction. The strongest use case is as a disciplined reference point for analysis, discussion and decision-making.",
    ],
    coverImage: "/blog/how-spot-indices-help-read-daily-grain-market-movement.png",
    excerpt:
      "Spot indices do not predict the market. They help organize daily price information into a clearer benchmark.",
    publishedAt: "2026-05-22",
    readingMinutes: 4,
    seoDescription:
      "A brief explanation of how spot commodity indices help organize daily Ukrainian grain market information.",
    seoTitle: "How Spot Indices Help Read Daily Grain Market Movement",
    slug: "how-spot-indices-help-read-daily-grain-market-movement",
    tags: [
      "Spot index",
      "Grain prices",
      "Ukraine exports",
      "Commodity analytics",
      "Market data",
    ],
    title: "How Spot Indices Help Read Daily Grain Market Movement",
  },
];

export function getBlogPost(slug: string) {
  return spikeBlogPosts.find((post) => post.slug === slug) ?? null;
}

export function getBlogTags() {
  return [...new Set(spikeBlogPosts.flatMap((post) => post.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getBlogLabels(locale: Locale) {
  if (locale === "uk") {
    return {
      allPosts: "Усі пости",
      blog: "Блог",
      copy: "Копіювати",
      copied: "Скопійовано",
      empty: "Нічого не знайдено. Спробуйте інший запит або тег.",
      latest: "Останні матеріали",
      minutes: "хв читання",
      published: "Опубліковано",
      read: "Читати",
      search: "Пошук",
      searchPlaceholder: "Пошук за темою, тегом або текстом",
      share: "Поділитися",
      subtitle:
        "Market notes, methodology context and practical explanations for the SPIKE Spot Commodity Index Ukraine.",
      tagCloud: "Хмара тегів",
      title: "Блог SPIKE Index",
    } as const;
  }

  return {
    allPosts: "All posts",
    blog: "Blog",
    copy: "Copy",
    copied: "Copied",
    empty: "No posts found. Try another query or tag.",
    latest: "Latest articles",
    minutes: "min read",
    published: "Published",
    read: "Read",
    search: "Search",
    searchPlaceholder: "Search by topic, tag or article text",
    share: "Share",
    subtitle:
      "Market notes, methodology context and practical explanations for the SPIKE Spot Commodity Index Ukraine.",
    tagCloud: "Tag cloud",
    title: "SPIKE Index Blog",
  } as const;
}
