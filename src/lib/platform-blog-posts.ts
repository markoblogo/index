import { spikeBlogPosts } from "@/lib/blog-posts";
import { getTenantAssetAbsoluteUrl } from "@/lib/tenant-assets";

export type PlatformBlogPost = {
  body: string[];
  coverImage: string;
  excerpt: string;
  readingMinutes: number;
  publishedAt: string;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  tags: string[];
  content?: PlatformBlogContentBlock[];
  title: string;
};

export type PlatformBlogContentBlock =
  | {
      kind: "paragraph" | "heading" | "highlight";
      text: string;
      level?: 2;
    }
  | { kind: "inlineLink"; before: string; label: string; href: string; after: string }
  | { kind: "list"; items: string[] }
  | {
      kind: "downloadButtons";
      links: {
        href: string;
        label: string;
      }[];
    }
  | {
      kind: "image";
      image: string;
      imageAlt: string;
    }
  | {
      kind: "imageTextPanel";
      image: string;
      imageAlt: string;
      text: string;
    }
  | {
      kind: "bookPanel";
      description: string;
      image: string;
      imageAlt: string;
      pdf: string;
      epub: string;
    };

const spikeAiPost = spikeBlogPosts.find(
  (post) =>
    post.slug ===
    "teaching-grain-markets-to-think-ai-supercharges-spike-spot-index",
)!;
const spikeHandbookUaPdfUrl = getTenantAssetAbsoluteUrl(
  "spike.handbook.ua.pdf",
  "https://spike.1d3x.com",
);
const spikeHandbookUaEpubUrl = getTenantAssetAbsoluteUrl(
  "spike.handbook.ua.epub",
  "https://spike.1d3x.com",
);

const spikeAiRepostContent: PlatformBlogContentBlock[] = [
  {
    kind: "paragraph",
    text: "This post is republished from the SPIKE Spot Index website.",
  },
  {
    kind: "inlineLink",
    before: "Read the original article: ",
    label: "https://spike.1d3x.com/en/blog/teaching-grain-markets-to-think-ai-supercharges-spike-spot-index",
    href: "https://spike.1d3x.com/en/blog/teaching-grain-markets-to-think-ai-supercharges-spike-spot-index",
    after: "",
  },
  ...spikeAiPost.body.map((text) => ({
    kind: "paragraph" as const,
    text,
  })),
];

export const platformBlogPosts: PlatformBlogPost[] = [
  {
    body: [
      "This post is republished from: https://spike.1d3x.com/en/blog/teaching-grain-markets-to-think-ai-supercharges-spike-spot-index",
      ...spikeAiPost.body,
    ],
    coverImage: spikeAiPost.coverImage,
    excerpt: spikeAiPost.excerpt,
    publishedAt: spikeAiPost.publishedAt,
    readingMinutes: spikeAiPost.readingMinutes,
    seoDescription: spikeAiPost.seoDescription,
    seoTitle: spikeAiPost.seoTitle,
    slug: spikeAiPost.slug,
    tags: ["spike", ...spikeAiPost.tags.map((tag) => tag.toLowerCase())],
    title: spikeAiPost.title,
    content: spikeAiRepostContent,
  },
  {
    body: [
      "Today we officially launched the 1d3x blog.",
      "This is where we will publish practical updates on how local commodity index infrastructure is built, what we release first, and where we partner next.",
      "The 1d3x platform connects proven index methodology and publishing technology with local market leaders. We are already active with UGA and SPIKE and preparing additional local products with the same repeatable model.",
      "We will share partner updates, implementation notes and practical market context from new jurisdictions as we enter new launches.",
    ],
    coverImage: "/brand/operational-model.webp",
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
  {
    body: [
      "At 1D3X, we believe that market indices are not just numbers on a screen.",
      "A good index is market infrastructure.",
      "It helps fragmented markets become more readable, comparable and usable for trading, analytics, contracts, risk management and future data products.",
      "That is why we are pleased to recommend a new free publication released within the Spike Spot Index project.",
      "Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work",
      "The book is currently available in Ukrainian on the Spike Spot Index website.",
      "You can download it at the end of this article.",
      "Why this handbook matters",
      "Ukrainian agricultural prices are not formed in a single place.",
      "They are shaped by physical logistics, FOB and CPT bases, port access, Danube and Black Sea routes, local liquidity, currency movements, respondent data, execution risk and the constant difference between global futures and local physical reality.",
      "This is exactly why spot indices matter.",
      "They do not remove risk.",
      "They make risk visible.",
      "They help the market understand whether a price movement reflects a real market signal, a temporary logistics distortion, a thin-market condition or simply noise.",
      "What the book explains",
      "The handbook is written as a practical guide for market participants who want to understand how Ukrainian agricultural prices actually work in the physical market.",
      "The book explains:",
      "- why the local physical market is not the same as Chicago futures;",
      "- how FOB, CPT, farmgate and processing bases differ;",
      "- why “one commodity” can have many valid prices;",
      "- how spot markets work in practice;",
      "- what separates an indicative quote, a bid, an offer and an executed trade;",
      "- why fragmented OTC markets need public benchmarks;",
      "- how respondent-based indices are built;",
      "- why median-based calculation is more robust than a simple arithmetic average;",
      "- how outlier filtering protects benchmarks from distorted quotes;",
      "- why insufficient data can itself be meaningful market information;",
      "- how basis risk appears;",
      "- how spot indices can evolve into analytics, APIs and market infrastructure.",
      "The book also includes practical case studies, including situations where Chicago rises while FOB Black Sea weakens, port restrictions widen basis, Danube and Greater Odesa routes create different economics, and a benchmark chooses not to publish when the market is too thin.",
      "Why 1D3X recommends it",
      "1D3X is being developed as an index engine and infrastructure layer for methodology-driven market benchmarks.",
      "Spike Spot Index is one of the projects built around this logic: a practical spot index and analytics product focused on Ukrainian export and processing bases.",
      "For Ukrainian-speaking traders, brokers, exporters, processors, analysts and agricultural companies, this handbook is a useful starting point for understanding why structured market data matters.",
      "It also explains the broader idea behind index-based commodity trading: before a market can become programmable, connected or tokenized, it first needs a reliable reference layer.",
      "That reference layer starts with transparent indices.",
      "Ukrainian note",
      "Книга Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work вже доступна українською мовою на сайті Spike Spot Index.",
      "Ми рекомендуємо її трейдерам, брокерам, експортерам, переробникам, агровиробникам, аналітикам та всім україномовним учасникам ринку, які хочуть краще зрозуміти, як насправді формуються ціни на фізичному аграрному ринку України.",
      "Це не академічний підручник.",
      "Це практичний гід про локальні базиси, FOB/CPT, ліквідність, респондентські моделі, спотові індекси, basis risk та майбутню роль індексної інфраструктури в аграрній торгівлі.",
      "Завантажити книгу:",
      `PDF: ${spikeHandbookUaPdfUrl}`,
      `EPUB: ${spikeHandbookUaEpubUrl}`,
      "English edition coming soon",
      "The current version is published in Ukrainian because the first audience for this handbook is the Ukrainian agricultural market itself.",
      "An English-language edition is planned next.",
      "It will make the same ideas accessible to international market participants, commodity analysts, data infrastructure teams, investors and companies interested in Ukrainian agricultural benchmarks and index-based commodity trading.",
      "For now, we strongly recommend the Ukrainian edition to everyone working directly with the Ukrainian physical grain and oilseed market.",
      "Read it, download it, share it with your team, and use it as a practical introduction to how spot indices can make commodity markets more structured, transparent and readable.",
    ],
    content: [
      { kind: "paragraph", text: "At 1D3X, we believe that market indices are not just numbers on a screen." },
      { kind: "paragraph", text: "A good index is market infrastructure." },
      {
        kind: "paragraph",
        text: "It helps fragmented markets become more readable, comparable and usable for trading, analytics, contracts, risk management and future data products.",
      },
      {
        kind: "paragraph",
        text: "That is why we are pleased to recommend a new free publication released within the Spike Spot Index project:",
      },
      {
        kind: "heading",
        level: 2,
        text: "Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work",
      },
      {
        kind: "inlineLink",
        before: "The book is currently available in Ukrainian on the ",
        label: "Spike Spot Index website",
        href: "https://spike.1d3x.com/",
        after: ".",
      },
      {
        kind: "downloadButtons",
        links: [
          {
            href: spikeHandbookUaPdfUrl,
            label: "Download PDF",
          },
          {
            href: spikeHandbookUaEpubUrl,
            label: "Download EPUB",
          },
        ],
      },
      {
        kind: "heading",
        level: 2,
        text: "Why this handbook matters",
      },
      {
        kind: "paragraph",
        text: "Ukrainian agricultural prices are not formed in a single place.",
      },
      {
        kind: "paragraph",
        text: "They are shaped by physical logistics, FOB and CPT bases, port access, Danube and Black Sea routes, local liquidity, currency movements, respondent data, execution risk and the constant difference between global futures and local physical reality.",
      },
      {
        kind: "paragraph",
        text: "This is exactly why spot indices matter.",
      },
      {
        kind: "paragraph",
        text: "They do not remove risk.\n\nThey make risk visible.\n\nThey help the market understand whether a price movement reflects a real market signal, a temporary logistics distortion, a thin-market condition or simply noise.",
      },
      { kind: "heading", level: 2, text: "What the book explains" },
      { kind: "paragraph", text: "The handbook is written as a practical guide for market participants who want to understand how Ukrainian agricultural prices actually work in the physical market." },
      {
        kind: "list",
        items: [
          "why the local physical market is not the same as Chicago futures;",
          "how FOB, CPT, farmgate and processing bases differ;",
          "why “one commodity” can have many valid prices;",
          "how spot markets work in practice;",
          "what separates an indicative quote, a bid, an offer and an executed trade;",
          "why fragmented OTC markets need public benchmarks;",
          "how respondent-based indices are built;",
          "why median-based calculation is more robust than a simple arithmetic average;",
          "how outlier filtering protects benchmarks from distorted quotes;",
          "why insufficient data can itself be meaningful market information;",
          "how basis risk appears;",
          "how spot indices can evolve into analytics, APIs and market infrastructure.",
        ],
      },
      {
        kind: "paragraph",
        text: "The book also includes practical case studies, including situations where Chicago rises while FOB Black Sea weakens, port restrictions widen basis, Danube and Greater Odesa routes create different economics, and a benchmark chooses not to publish when the market is too thin.",
      },
      { kind: "heading", level: 2, text: "Why 1D3X recommends it" },
      {
        kind: "paragraph",
        text: "1D3X is being developed as an index engine and infrastructure layer for methodology-driven market benchmarks.",
      },
      {
        kind: "paragraph",
        text: "Spike Spot Index is one of the projects built around this logic: a practical spot index and analytics product focused on Ukrainian export and processing bases.",
      },
      {
        kind: "paragraph",
        text: "For Ukrainian-speaking traders, brokers, exporters, processors, analysts and agricultural companies, this handbook is a useful starting point for understanding why structured market data matters.",
      },
      {
        kind: "paragraph",
        text: "It also explains the broader idea behind index-based commodity trading: before a market can become programmable, connected or tokenized, it first needs a reliable reference layer. That reference layer starts with transparent indices.",
      },
      {
        kind: "heading",
        level: 2,
        text: "Ukrainian note",
      },
      {
        kind: "imageTextPanel",
        image: "/blog/spot-market-handbook-book-cover.webp",
        imageAlt: "Spot Market Handbook cover",
        text: "Книга Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work вже доступна українською мовою на сайті Spike Spot Index.\n\nМи рекомендуємо її трейдерам, брокерам, експортерам, переробникам, агровиробникам, аналітикам та всім україномовним учасникам ринку, які хочуть краще зрозуміти, як насправді формуються ціни на фізичному аграрному ринку України.\n\nЦе не академічний підручник.\n\nЦе практичний гід про локальні базиси, FOB/CPT, ліквідність, респондентські моделі, спотові індекси, basis risk та майбутню роль індексної інфраструктури в аграрній торгівлі.",
      },
      {
        kind: "downloadButtons",
        links: [
          {
            href: spikeHandbookUaPdfUrl,
            label: "Download PDF",
          },
          {
            href: spikeHandbookUaEpubUrl,
            label: "Download EPUB",
          },
        ],
      },
      {
        kind: "heading",
        level: 2,
        text: "English edition coming soon",
      },
      {
        kind: "paragraph",
        text: "The current version is published in Ukrainian because the first audience for this handbook is the Ukrainian agricultural market itself.",
      },
      {
        kind: "paragraph",
        text: "An English-language edition is planned next.",
      },
      {
        kind: "paragraph",
        text: "It will make the same ideas accessible to international market participants, commodity analysts, data infrastructure teams, investors and companies interested in Ukrainian agricultural benchmarks and index-based commodity trading.",
      },
      {
        kind: "paragraph",
        text: "For now, we strongly recommend the Ukrainian edition to everyone working directly with the Ukrainian physical grain and oilseed market.",
      },
      {
        kind: "paragraph",
        text: "Read it, download it, share it with your team, and use it as a practical introduction to how spot indices can make commodity markets more structured, transparent and readable.",
      },
    ],
    coverImage: "/blog/spot-market-handbook-cover-hero.webp",
    excerpt:
      "A practical free handbook on how Ukrainian agricultural prices are formed and why spot indices are needed for readable, transparent physical market trading.",
    publishedAt: "2026-05-31",
    readingMinutes: 9,
    seoDescription:
      "We recommend the free Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work, practical guidance on Ukrainian physical price formation, spot indices, logistics and market infrastructure.",
    seoTitle: "Spot Market Handbook: a practical guide to Ukrainian agricultural price formation",
    slug: "spot-market-handbook-practical-guide-to-ukrainian-agricultural-price-formation",
    tags: ["1d3x", "spike", "handbook", "market infrastructure", "announcement"],
    title: "Spot Market Handbook: a practical guide to Ukrainian agricultural price formation",
  },
  {
    "body": [
      "At 1d3x, we build infrastructure for creating clear, local and meaningful indices.",
      "We started with agricultural commodity benchmarks: the **SPIKE Spot Index** at [spike.1d3x.com](https://spike.1d3x.com/) and the Ukrainian Grain Association index. These projects focus on making physical commodity markets more transparent, readable and easier to navigate.",
      "But an index can describe far more than commodity prices.",
      "We later launched [pop.1d3x.com](https://pop.1d3x.com/), a lighter project that tracks familiar global comparisons: the Big Mac Index, Starbucks Latte Index and iPhone Index. It is a reminder that indexes can turn complex differences between places into something instantly understandable.",
      "There are many more unusual, useful and occasionally provocative indices worth exploring. We are starting to collect them here on the 1d3x blog under the #PopIndex tag.",
      "Our first pick is the **Ciggie Index**:\n[https://cig-index.vercel.app/](https://cig-index.vercel.app/)",
      "Instead of presenting air pollution only as an AQI number, it translates exposure into a more intuitive equivalent: the estimated number of cigarettes a person would effectively “smoke” by spending time outdoors in a given city.",
      "At the time of writing, for example, the index shows that spending 24 hours outside in New York at the displayed air-quality level corresponds to roughly **1.2 cigarettes**. On more polluted days and in more polluted cities, the equivalent can be dramatically higher. The point is less the exact number, which changes with air quality, than the way the index translates an abstract environmental reading into an immediately understandable comparison.",
      "Of course, this is not a literal medical measurement of smoking. It is a communication tool — a striking way to make an abstract environmental metric more personal and memorable.",
      "That is the power of a good index: it takes a number people may ignore and gives it a meaning they can immediately feel."
    ],
    "coverImage": "/blog/popindex-measuring-air-pollution-in-cigarettes.png",
    "excerpt": "A 1D3X note on the Ciggie Index as a memorable alternative index that translates air pollution into a more intuitive public comparison.",
    "publishedAt": "2026-08-10",
    "readingMinutes": 2,
    "seoDescription": "A 1D3X note on the Ciggie Index and why unusual indices can make abstract environmental metrics instantly understandable.",
    "seoTitle": "#PopIndex: Measuring Air Pollution in Cigarettes",
    "slug": "popindex-measuring-air-pollution-in-cigarettes",
    "tags": [
      "popindex",
      "air quality",
      "AQI",
      "data",
      "index",
      "1D3X"
    ],
    "title": "#PopIndex: Measuring Air Pollution in Cigarettes"
  }
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
