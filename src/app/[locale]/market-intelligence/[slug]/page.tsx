import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WeeklyEditorialPostView } from "@/components/reports/weekly-editorial-post-view";
import { SITE_CONFIG } from "@/lib/constants";
import { isLocale, type Locale } from "@/lib/i18n";
import { getPublishedWeeklyEditorialPostBySlug } from "@/lib/weekly-editorial-posts";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  const post = await getPublishedWeeklyEditorialPostBySlug(slug, locale);
  if (!post) {
    return {};
  }

  return {
    title: `${post.seoTitle} | ${SITE_CONFIG.name}`,
    description: post.seoDescription,
    alternates: {
      canonical: `/${locale}/market-intelligence/${post.slug}`,
    },
    openGraph: {
      description: post.seoDescription,
      images: post.coverImage ? [post.coverImage] : [],
      title: post.seoTitle,
      type: "article",
      url: `/${locale}/market-intelligence/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      description: post.seoDescription,
      images: post.coverImage ? [post.coverImage] : [],
      title: post.seoTitle,
    },
  };
}

export default async function MarketIntelligenceDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    notFound();
  }

  const post = await getPublishedWeeklyEditorialPostBySlug(slug, locale);

  if (!post) {
    notFound();
  }

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: {
      "@type": "Organization",
      name: "SPIKE SPOT INDEX",
      url: SITE_CONFIG.publicSiteUrl,
    },
    datePublished: `${post.publishedAt}T00:00:00.000Z`,
    description: post.seoDescription,
    headline: post.title,
    image: post.coverImage ? [post.coverImage] : [],
    inLanguage: locale,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.publicSiteUrl,
    },
    mainEntityOfPage: post.canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: "SPIKE SPOT INDEX",
      url: SITE_CONFIG.publicSiteUrl,
    },
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
        type="application/ld+json"
      />
      <WeeklyEditorialPostView locale={locale} post={post} />
    </>
  );
}
