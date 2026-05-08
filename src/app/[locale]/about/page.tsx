import { SectionHeader } from "@/components/ui/section-header";
import { getDictionary, type Locale } from "@/lib/i18n";
import { respondents } from "@/lib/mock-data";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <>
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <SectionHeader
            label={dict.about.label}
            title={dict.about.title}
            description={dict.about.description}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            {dict.about.rolesTitle}
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            {dict.about.rolesHeading}
          </h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {dict.about.partners.map((partner) => (
            <article
              key={partner.name}
              className="rounded-[3px] border border-black/10 bg-white p-6 "
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uga-mist text-sm font-black text-uga-green ring-1 ring-uga-green/15">
                {partner.name.slice(0, 1)}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-black">
                {partner.name}
              </h3>
              <p className="mt-3 text-sm leading-6 text-black/65">
                {partner.role}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-uga-mist">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[23rem_1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
                {dict.about.respondentsLabel}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
                {dict.about.respondentsTitle}
              </h2>
              <p className="mt-4 text-base leading-7 text-black/65">
                {dict.about.respondentsDescription}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {respondents.map((respondent) => (
                <div
                  className="rounded-[3px] border border-black/10 bg-white px-4 py-4 text-sm font-semibold text-black "
                  key={respondent.id}
                >
                  {respondent.legalName}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="rounded-[3px] border border-black/10 bg-uga-dark p-7 text-white ">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-lime">
            {dict.about.disclaimerTitle}
          </p>
          <p className="mt-4 max-w-4xl text-base leading-7 text-white/75">
            {dict.about.disclaimer}
          </p>
        </div>
      </section>
    </>
  );
}
