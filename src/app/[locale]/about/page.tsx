import Image from "next/image";

import { SITE_CONFIG } from "@/lib/constants";
import { getDictionary, type Locale } from "@/lib/i18n";
import {
  MN7R_MONITOR_RESPONDENT_ID,
  SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
} from "@/lib/index-platform";
import { respondents } from "@/lib/mock-data";

const MN7R_RESPONDENT_ID = MN7R_MONITOR_RESPONDENT_ID;
const HIDDEN_PUBLIC_RESPONDENT_IDS = new Set([
  "fop-solovey",
  SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
]);

const respondentLinks = new Map([
  [MN7R_RESPONDENT_ID, "https://mn7r.com/"],
  ["bunge-ukraine", "https://www.bunge.com/Ukraine"],
  ["adm-ukraine", "https://www.adm.com/"],
  ["hermes-trading", "http://www.ukragrocom.com/index.php/"],
  ["louis-dreyfus-ukraine", "https://www.ldc.com/ua/uk/"],
  ["kernel-trade", "http://www.kernel.ua/ua/"],
  ["cofco-agri-resources-ukraine", "https://www.cofcointernational.com/"],
  ["new-world-grain-ukraine", "https://www.soufflet.com/"],
  ["nibulon", "http://www.nibulon.com/?t=1509267760"],
]);

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  if (SITE_CONFIG.tenantId === "spike-ua") {
    return <SpikeAboutPage dict={dict} locale={locale} />;
  }

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.about.label}
          </p>
          <div>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-6xl">
              {dict.about.title}
            </h1>
            <p className="mt-5 max-w-4xl text-base font-semibold leading-7 text-black/70 sm:text-lg">
              {dict.about.descriptionBeforeLink}
              <a
                className="font-black text-uga-green underline decoration-uga-lime decoration-2 underline-offset-4 transition hover:text-black"
                href={dict.about.ugaHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                {dict.about.descriptionLinkText}
              </a>
              {dict.about.descriptionAfterLink}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.about.whyLabel}
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black lg:text-4xl">
            {dict.about.whyTitle}
          </h2>
        </div>
        <div className="grid gap-6">
          <div className="grid gap-4 text-base leading-7 text-black/70">
            {dict.about.whyBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="grid border border-black bg-white">
            {dict.about.whyFeatures.map((feature, index) => (
              <article
                className="grid gap-3 border-b border-black p-4 last:border-b-0 sm:grid-cols-[2.5rem_0.85fr_1.15fr] sm:items-start"
                key={feature.title}
              >
                <span className="text-lg font-black text-uga-green">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-black uppercase leading-5 text-black">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-black/65">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black bg-uga-mist">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[23rem_1fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
                {dict.about.respondentsLabel}
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black">
                {dict.about.respondentsTitle}
              </h2>
              <p className="mt-4 text-sm leading-6 text-black/65">
                {dict.about.respondentsDescription}
              </p>
            </div>
            <div className="grid border border-black bg-white sm:grid-cols-2">
              {respondents.map((respondent) => {
                const respondentHref = respondentLinks.get(respondent.id) ?? "#";
                const hasExternalLink = respondentHref !== "#";

                return (
                <a
                  className={`group border-b border-black px-4 py-3 text-sm font-black text-black transition sm:border-r odd:sm:border-r even:sm:border-r-0 [&:nth-last-child(-n+2)]:sm:border-b-0 last:border-b-0 ${
                    hasExternalLink ? "hover:bg-uga-lime" : "pointer-events-none"
                  }`}
                  href={respondentHref}
                  key={respondent.id}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {hasExternalLink ? (
                    <span className="mr-2 text-[0.62rem] uppercase text-uga-green transition group-hover:text-black">
                      URL
                    </span>
                  ) : null}
                  {respondent.legalName}
                </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-12">
        <div className="grid border border-black bg-uga-dark text-white lg:grid-cols-[20rem_1fr]">
          <div className="border-b border-white/25 p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase leading-5 tracking-[0.18em] text-uga-lime">
              {dict.about.label}
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-normal">
              {dict.about.disclaimerTitle}
            </h2>
          </div>
          <p className="p-5 text-sm leading-6 text-white/75 lg:p-6">
            {dict.about.disclaimer}
          </p>
        </div>
      </section>
    </>
  );
}

function SpikeAboutPage({
  dict,
  locale,
}: {
  dict: ReturnType<typeof getDictionary>;
  locale: Locale;
}) {
  const publicRespondents = respondents.filter(
    (respondent) => !HIDDEN_PUBLIC_RESPONDENT_IDS.has(respondent.id),
  );
  const spikeRespondents = [
    ...publicRespondents.filter(
      (respondent) => respondent.id === MN7R_RESPONDENT_ID,
    ),
    ...publicRespondents.filter(
      (respondent) => respondent.id !== MN7R_RESPONDENT_ID,
    ),
  ];
  const resourceButtonClass =
    "inline-flex rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-5 py-2.5 text-sm font-black text-[#f8f8f2] no-underline transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505] hover:shadow-[0_0_0_1px_var(--spike-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--spike-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]";
  const showResourcesSection = locale === "uk";

  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] text-[#f8f8f2]">
      <section className="relative border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto grid max-w-[1900px] gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_28rem] lg:px-8 lg:py-16">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {dict.about.label}
            </p>
            <h1 className="mt-5 max-w-5xl text-[clamp(2.05rem,4.55vw,4.75rem)] font-black uppercase leading-[0.94] tracking-normal text-[#f8f8f2]">
              {dict.about.title}
            </h1>
          </div>
          <div className="self-end rounded-[1.4rem] border border-white/18 bg-black/35 p-5 backdrop-blur">
            <p className="text-base font-semibold leading-7 text-white/72">
              {dict.about.descriptionBeforeLink}
              <a
                className="font-black text-[var(--spike-accent)] underline-offset-4 hover:underline"
                href={dict.about.ugaHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                {dict.about.descriptionLinkText}
              </a>
              {dict.about.descriptionAfterLink}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1900px] gap-6 px-6 py-10 lg:grid-cols-[0.42fr_0.58fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {dict.about.whyLabel}
          </p>
          <h2 className="mt-4 max-w-xl text-4xl font-black uppercase leading-none tracking-normal text-white lg:text-5xl">
            {dict.about.whyTitle}
          </h2>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-4 text-base leading-7 text-white/66">
            {dict.about.whyBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {dict.about.whyFeatures.map((feature, index) => (
              <article
                className="rounded-[1.35rem] border border-white/12 bg-[#f8f8f2] p-5 text-[#050505] transition hover:-translate-y-1 hover:border-[var(--spike-accent)]"
                key={feature.title}
              >
                <span className="text-sm font-black text-[var(--spike-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-8 text-lg font-black uppercase leading-5 text-[#050505]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/65">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {showResourcesSection ? (
        <section className="border-y border-white/10 bg-[#090909]">
          <div className="mx-auto grid max-w-[1900px] gap-6 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
                {dict.about.resources.title}
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-white">
                {dict.about.resources.cardTitle}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/58">
                {dict.about.resources.description}
              </p>
            </div>
            <article className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#f8f8f2] p-4 text-[#050505] sm:p-5">
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <div className="rounded-[1rem] border border-black/12 bg-black/5 p-3">
                  <Image
                    alt={dict.about.resources.coverAlt}
                    className="h-full w-full rounded-[0.7rem] object-contain"
                    height={960}
                    src={dict.about.resources.cover}
                    width={640}
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-[var(--spike-accent)]">
                    {dict.about.resources.title}
                  </p>
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.1em] text-black/45">
                    {dict.about.resources.pdfLabel} ·{" "}
                    {dict.about.resources.epubLabel}
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase leading-6 text-black">
                    {dict.about.resources.cardTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/70">
                    {dict.about.resources.cardDescription}
                  </p>
                  {dict.about.resources.releaseDate ||
                  dict.about.resources.releaseVersion ||
                  dict.about.resources.releaseLanguage ||
                  dict.about.resources.audience ? (
                    <div className="mt-3 grid gap-1 text-xs font-black uppercase tracking-[0.08em] text-black/55">
                      {dict.about.resources.releaseLabel &&
                      dict.about.resources.releaseVersion ? (
                        <p>
                          {dict.about.resources.releaseLabel}:{" "}
                          {dict.about.resources.releaseVersion}
                        </p>
                      ) : null}
                      {dict.about.resources.releaseDate ? (
                        <p>
                          {dict.about.resources.releaseDateLabel ?? "Date"}:{" "}
                          {dict.about.resources.releaseDate}
                        </p>
                      ) : null}
                      {dict.about.resources.releaseLanguage ? (
                        <p>
                          {dict.about.resources.releaseLanguageLabel ?? "Language"}:{" "}
                          {dict.about.resources.releaseLanguage}
                        </p>
                      ) : null}
                      {dict.about.resources.audience ? (
                        <p>
                          {dict.about.resources.audienceLabel ?? "Audience"}:{" "}
                          {dict.about.resources.audience}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {dict.about.resources.highlights?.length ? (
                    <div className="mt-4">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-black/45">
                        {dict.about.resources.highlightsLabel ??
                          "What this guide covers"}
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-black/70">
                        {dict.about.resources.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 pt-2">
                <a
                  className={resourceButtonClass}
                  download
                  href="/files/spot-market-handbook-ua.pdf"
                >
                  {dict.about.resources.pdfDownload}
                </a>
                <a
                  className={resourceButtonClass}
                  href="/files/spot-market-handbook-ua.pdf"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {dict.about.resources.pdfOpen}
                </a>
                <a
                  className={resourceButtonClass}
                  download
                  href="/files/spot-market-handbook-ua.epub"
                >
                  {dict.about.resources.epubDownload}
                </a>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="border-y border-white/10 bg-[#090909]">
        <div className="mx-auto grid max-w-[1900px] gap-6 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
              {dict.about.respondentsLabel}
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-white">
              {dict.about.respondentsTitle}
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/58">
              {dict.about.respondentsDescription}
            </p>
          </div>
          <div
            className={
              spikeRespondents.length === 1
                ? "grid max-w-[38rem] gap-2"
                : "grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
            }
          >
            {spikeRespondents.map((respondent, index) => {
              const respondentHref = respondentLinks.get(respondent.id) ?? "#";
              const hasExternalLink = respondentHref !== "#";
              const isMn7rMonitor = respondent.id === MN7R_RESPONDENT_ID;

              return (
                <a
                  className={`group relative overflow-hidden rounded-[1rem] border border-white/10 text-sm font-black transition ${
                    isMn7rMonitor
                      ? "grid min-h-[17rem] place-items-center bg-[radial-gradient(circle_at_82%_8%,rgba(49,255,30,0.22),transparent_18rem),linear-gradient(145deg,#07070b,#101417)] px-5 py-5 text-white"
                      : "bg-[#f8f8f2] px-4 py-4 text-[#050505]"
                  } ${
                    hasExternalLink
                      ? "hover:border-[var(--spike-accent)]"
                      : "pointer-events-none"
                  }`}
                  href={respondentHref}
                  key={respondent.id}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span
                    className={`text-[0.64rem] uppercase tracking-[0.18em] ${
                      isMn7rMonitor ? "text-white/55" : "text-black/38"
                    } ${isMn7rMonitor ? "absolute left-5 top-5" : "block"}`}
                  >
                    Partner {String(index + 1).padStart(2, "0")}
                  </span>
                  {isMn7rMonitor ? (
                    <span className="flex w-full items-center justify-center">
                      <Image
                        alt="MN7R"
                        className="h-auto w-[118%] max-w-none object-contain transition group-hover:scale-[1.03]"
                        height={819}
                        priority={false}
                        src="/brand/mn7r-logo-white.png"
                        width={1920}
                      />
                    </span>
                  ) : (
                    respondent.legalName
                  )}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-6 py-10 lg:px-8 lg:py-12">
        <div className="rounded-[1.5rem] border border-white/12 bg-[radial-gradient(circle_at_90%_0%,rgba(255,63,115,0.22),transparent_28rem),#080808] p-6 lg:grid lg:grid-cols-[22rem_1fr] lg:gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
              {dict.about.label}
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase leading-tight tracking-normal text-white">
              {dict.about.disclaimerTitle}
            </h2>
          </div>
          <p className="mt-5 text-sm leading-6 text-white/62 lg:mt-0">
            {dict.about.disclaimer}
          </p>
        </div>
      </section>
    </main>
  );
}
