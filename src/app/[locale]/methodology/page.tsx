import { SectionHeader } from "@/components/ui/section-header";
import { getDictionary, type Locale } from "@/lib/i18n";

export default async function MethodologyPage({
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
            label={dict.methodology.label}
            title={dict.methodology.title}
            description={dict.methodology.description}
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {dict.methodology.metrics.map((metric) => (
              <MethodMetric
                key={`${metric.value}-${metric.label}`}
                value={metric.value}
                label={metric.label}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {dict.methodology.sections.map((section, index) => (
            <article
              className="rounded-[3px] border border-black/10 bg-white p-6 "
              key={section.title}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-uga-green text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-black">
                    {section.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-black/65">
                    {section.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-black/10 bg-uga-mist">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[1fr_22rem] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              PDF
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
              {dict.methodology.signedPdfTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-black/65">
              {dict.methodology.signedPdfDescription}
            </p>
          </div>
          <div className="rounded-[3px] border border-dashed border-uga-green/45 bg-white p-6 ">
            <div className="flex aspect-[4/3] items-center justify-center rounded-[3px] bg-uga-mist">
              <span className="rounded-full bg-uga-green px-4 py-2 text-sm font-semibold text-white">
                {dict.methodology.signedPdfAction}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            FAQ
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-black">
            {dict.methodology.faqTitle}
          </h2>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {dict.methodology.faq.map((item) => (
            <details
              className="group rounded-[3px] border border-black/10 bg-white p-5 "
              key={item.question}
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-black marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.question}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-uga-mist text-uga-green transition group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-4 text-sm leading-6 text-black/65">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function MethodMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[3px] border border-black/10 bg-uga-mist p-5">
      <p className="text-4xl font-semibold tracking-tight text-uga-green">
        {value}
      </p>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-black/50">
        {label}
      </p>
    </div>
  );
}
