import { getDictionary, type Locale } from "@/lib/i18n";
import { respondents } from "@/lib/mock-data";

const respondentLinks = new Map([
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
