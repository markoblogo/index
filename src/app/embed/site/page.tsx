import Image from "next/image";
import Link from "next/link";
import { EmbedSiteFullscreenButton, EmbedSiteThemeButton } from "@/components/embed/embed-site-controls";
import { HomeHero } from "@/components/ui/home-hero";
import { SITE_CONFIG } from "@/lib/constants";
import { normalizeEmbedLocale } from "@/lib/embed";
import { getFxRates } from "@/lib/fx-rates";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getPublicIndexSnapshot } from "@/lib/public-index-data";
import { getActiveRespondentCountData } from "@/lib/respondent-directory";

type EmbedSiteView = "index" | "methodology" | "about" | "analytics";

type EmbedSitePageProps = {
  searchParams: Promise<{
    locale?: string;
    theme?: string;
    view?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EmbedSitePage({ searchParams }: EmbedSitePageProps) {
  const params = await searchParams;
  const locale = normalizeEmbedLocale(params.locale);
  const view = normalizeView(params.view);
  const theme = params.theme === "dark" ? "dark" : "light";
  const dict = getDictionary(locale);
  const activeIndex = getActiveIndexConfig();
  const snapshot = await getPublicIndexSnapshot();
  const fxRates = await getFxRates();
  const respondentCount = await getActiveRespondentCountData();
  const updatedAt = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(snapshot.updatedAt));

  return (
    <main
      className="min-h-screen bg-white text-uga-dark"
      data-embed-site
      suppressHydrationWarning
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)};`,
        }}
      />
      <EmbedHoverHeader locale={locale} theme={theme} view={view} />

      {view === "index" ? (
        <HomeHero
          commodities={snapshot.commodities}
          fxRates={fxRates}
          labels={{
            analytics: dict.home.viewAnalytics,
            currentValues: dict.home.currentValuesTitle,
            methodology: dict.home.readMore,
            subtitle: activeIndex.home.subtitle[locale],
            trustStrip: activeIndex.home.trustStrip[locale],
            updated: dict.home.updatedLabel,
          }}
          locale={locale}
          respondentCount={respondentCount}
          updatedAt={updatedAt}
        />
      ) : null}
      {view === "methodology" ? <EmbedMethodology locale={locale} /> : null}
      {view === "about" ? <EmbedAbout locale={locale} /> : null}
      {view === "analytics" ? (
        <EmbedAnalytics locale={locale} updatedAt={updatedAt} />
      ) : null}
    </main>
  );
}

function EmbedHoverHeader({
  locale,
  theme,
  view,
}: {
  locale: Locale;
  theme: "light" | "dark";
  view: EmbedSiteView;
}) {
  const dict = getDictionary(locale);
  const logoPath = SITE_CONFIG.logoHeaderPath ?? SITE_CONFIG.logoPath ?? "/icon.png";
  const navItems = [
    { label: dict.nav.home, view: "index" },
    { label: dict.nav.about, view: "about" },
    { label: dict.nav.methodology, view: "methodology" },
    { label: dict.nav.analytics, view: "analytics" },
  ] as const;

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-16 translate-y-[-3.45rem] border-b border-black bg-white/95 shadow-sm backdrop-blur transition-transform duration-200 hover:translate-y-0 focus-within:translate-y-0">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-full h-8 bg-transparent"
      />
      <nav className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 lg:px-6">
        <Link
          className="flex items-center gap-3"
          href={buildEmbedHref(locale, "index", theme)}
        >
          <Image
            alt="UGA Index"
            className="brand-logo block h-8 w-auto object-contain"
            height={757}
            src={logoPath}
            width={1359}
          />
          <span className="hidden h-7 w-px bg-black/10 sm:block" />
          <span className="hidden text-sm font-black sm:inline">
            {SITE_CONFIG.name}
          </span>
        </Link>

        <div className="ml-auto hidden items-center gap-4 md:flex">
          {navItems.map((item) => (
            <Link
              className={`text-sm font-black transition hover:text-uga-green ${
                view === item.view ? "text-black" : "text-black/55"
              }`}
              href={buildEmbedHref(locale, item.view, theme)}
              key={item.view}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-3">
          <Link
            className="border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-uga-lime"
            href={buildEmbedHref(locale === "uk" ? "en" : "uk", view, theme)}
          >
            {locale === "uk" ? "EN" : "UA"}
          </Link>
          <EmbedSiteThemeButton />
          <EmbedSiteFullscreenButton label={locale === "uk" ? "На весь екран" : "Fullscreen"} />
          <a
            className="border border-black bg-uga-dark px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-uga-green"
            href={`/${locale}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {locale === "uk" ? "Відкрити сайт" : "Open site"}
          </a>
        </div>
      </nav>
    </div>
  );
}

function EmbedMethodology({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section className="min-h-screen border-b border-black bg-white px-6 py-14 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.methodology.label}
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-none text-black">
            {dict.methodology.title}
          </h1>
        </div>
        <div className="grid gap-6">
          <p className="text-lg font-semibold leading-8 text-black/70">
            {dict.methodology.description}
          </p>
          <div className="grid border border-black bg-white sm:grid-cols-2 xl:grid-cols-3">
            {dict.methodology.facts.map((fact) => (
              <div className="border-b border-black p-4 sm:border-r" key={fact.label}>
                <p className="text-xl font-black text-black">{fact.value}</p>
                <p className="mt-1 text-xs font-semibold text-black/55">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
          <div className="grid border border-black bg-uga-mist">
            {dict.methodology.flow.slice(0, 5).map((step, index) => (
              <article className="grid gap-3 border-b border-black p-4 last:border-b-0 sm:grid-cols-[3rem_1fr_1.4fr]" key={step.title}>
                <span className="font-black text-uga-green">{index + 1}</span>
                <h2 className="font-black uppercase text-black">{step.title}</h2>
                <p className="text-sm leading-6 text-black/65">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmbedAbout({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);

  return (
    <section className="min-h-screen bg-white px-6 py-14 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.about.label}
          </p>
          <h1 className="mt-4 text-5xl font-black uppercase leading-none text-black">
            {dict.about.title}
          </h1>
        </div>
        <div className="grid gap-5 text-base font-semibold leading-7 text-black/70">
          <p>
            {dict.about.descriptionBeforeLink}
            {dict.about.descriptionLinkText}
            {dict.about.descriptionAfterLink}
          </p>
          <h2 className="text-2xl font-black uppercase text-black">
            {dict.about.whyTitle}
          </h2>
          {dict.about.whyBody.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="grid border border-black bg-uga-mist sm:grid-cols-3">
            {dict.about.whyFeatures.map((feature) => (
              <article className="border-b border-black p-4 sm:border-r" key={feature.title}>
                <h3 className="font-black uppercase text-black">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EmbedAnalytics({
  locale,
  updatedAt,
}: {
  locale: Locale;
  updatedAt: string;
}) {
  const labels =
    locale === "uk"
      ? {
          body: "Публічний перегляд аналітики UGA Index з динамікою значень, змінами та сценарними можливостями.",
          title: "Аналітика значень UGA Index",
          updated: "Оновлено",
        }
      : {
          body: "Public preview of UGA Index analytics with value dynamics, changes and scenario capabilities.",
          title: "UGA Index analytics",
          updated: "Updated",
        };

  return (
    <section className="min-h-screen bg-white px-6 py-14 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
          Analytics
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-none text-black">
          {labels.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-black/70">
          {labels.body}
        </p>
        <div className="mt-8 grid border border-black bg-uga-mist sm:grid-cols-3">
          {["1D", "7D", "30D"].map((period) => (
            <div className="border-b border-black p-5 sm:border-r" key={period}>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-black/45">
                {period}
              </p>
              <p className="mt-2 text-3xl font-black text-uga-green">
                +{period === "1D" ? "0.4" : period === "7D" ? "1.8" : "5.2"} USD/t
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm font-semibold text-black/55">
          {labels.updated}: {updatedAt}
        </p>
      </div>
    </section>
  );
}

function buildEmbedHref(
  locale: Locale,
  view: EmbedSiteView,
  theme: "light" | "dark" = "light",
) {
  return `/embed/site?locale=${locale}&theme=${theme}&view=${view}`;
}

function normalizeView(value: string | undefined): EmbedSiteView {
  return value === "methodology" || value === "about" || value === "analytics"
    ? value
    : "index";
}
