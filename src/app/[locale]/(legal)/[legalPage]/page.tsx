import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLegalPageContent,
  isLegalPageSlug,
  legalPages,
} from "@/lib/legal-content";
import { SITE_CONFIG } from "@/lib/constants";
import { isLocale, locales, type Locale } from "@/lib/i18n";

type LegalPageProps = {
  params: Promise<{ locale: string; legalPage: string }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    legalPages.map((legalPage) => ({ locale, legalPage })),
  );
}

export async function generateMetadata({
  params,
}: LegalPageProps): Promise<Metadata> {
  const { locale, legalPage } = await params;

  if (!isLocale(locale) || !isLegalPageSlug(legalPage)) {
    return {};
  }

  const content = getLegalPageContent(locale, legalPage);

  return {
    title: content.description,
    description: content.intro[0],
  };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale, legalPage } = await params;

  if (!isLocale(locale) || !isLegalPageSlug(legalPage)) {
    notFound();
  }

  const content = getLegalPageContent(locale as Locale, legalPage);

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto max-w-[900px] px-6 py-10 lg:px-8 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {SITE_CONFIG.name}
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-black/45">
            {content.lastUpdated}
          </p>
          <div className="mt-6 grid gap-4 text-base font-semibold leading-7 text-black/70">
            {content.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[900px] px-6 py-10 lg:px-8 lg:py-12">
        <div className="border border-black bg-white">
          {content.sections.map((section) => (
            <article
              className="border-b border-black p-5 last:border-b-0 sm:p-6"
              key={section.title}
            >
              <h2 className="text-lg font-black uppercase leading-6 tracking-normal text-black">
                {section.title}
              </h2>
              {section.paragraphs ? (
                <div className="mt-3 grid gap-3 text-sm leading-6 text-black/68">
                  {section.paragraphs.map((paragraph) => (
                    <p className="whitespace-pre-line" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
              {section.bullets ? (
                <ul className="mt-3 grid gap-2 pl-4 text-sm leading-6 text-black/68">
                  {section.bullets.map((bullet) => (
                    <li className="list-disc" key={bullet}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {section.paragraphsAfter ? (
                <div className="mt-3 grid gap-3 text-sm leading-6 text-black/68">
                  {section.paragraphsAfter.map((paragraph) => (
                    <p className="whitespace-pre-line" key={paragraph}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
