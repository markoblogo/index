import { getDictionary, type Locale } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/constants";

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  if (SITE_CONFIG.tenantId === "spike-ua") {
    return <SpikeMethodologyPage dict={dict} />;
  }

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.methodology.label}
          </p>
          <div>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-6xl">
              {dict.methodology.title}
            </h1>
            <p className="mt-5 max-w-4xl text-base font-semibold leading-7 text-black/70 sm:text-lg">
              {dict.methodology.description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.methodology.coreLabel}
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black lg:text-4xl">
            {dict.methodology.coreTitle}
          </h2>
        </div>

        <div className="grid gap-6">
          <div className="grid gap-4 text-base leading-7 text-black/70">
            {dict.methodology.coreNarrative.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="grid border border-black bg-white sm:grid-cols-2 xl:grid-cols-3">
            {dict.methodology.facts.map((fact) => (
              <div
                className="border-b border-black px-4 py-3 sm:border-r sm:[&:nth-child(2n)]:border-r-0 xl:[&:nth-child(2n)]:border-r xl:[&:nth-child(3n)]:border-r-0 [&:nth-last-child(-n+2)]:sm:border-b-0 [&:nth-last-child(-n+3)]:xl:border-b-0"
                key={`${fact.value}-${fact.label}`}
              >
                <p className="text-sm font-black uppercase leading-5 text-black">
                  {fact.value}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-black/55">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black bg-uga-mist">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {dict.methodology.label}
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black lg:text-4xl">
              {dict.methodology.flowTitle}
            </h2>
          </div>

          <div className="grid border border-black bg-white">
            {dict.methodology.flow.map((step, index) => (
              <article
                className="grid gap-3 border-b border-black p-4 last:border-b-0 sm:grid-cols-[3rem_0.9fr_1.4fr] sm:items-start"
                key={step.title}
              >
                <span className="text-lg font-black text-uga-green">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-black uppercase leading-5 text-black">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-black/65">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <div className="grid border border-black bg-white lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="border-b border-black p-5 lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              PDF
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-normal text-black">
              {dict.methodology.pdfTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/65">
              {dict.methodology.pdfDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 p-5">
            <a
              className="inline-flex rounded-[3px] border border-black bg-uga-dark px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-uga-green"
              download
              href={SITE_CONFIG.methodologyPdfPath}
            >
              {dict.methodology.pdfDownload}
            </a>
            <a
              className="inline-flex rounded-[3px] border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-uga-lime"
              href={SITE_CONFIG.methodologyPdfPath}
              rel="noopener noreferrer"
              target="_blank"
            >
              {dict.methodology.pdfOpen}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8 lg:pb-14">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
              {dict.methodology.label}
            </p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal text-black">
              {dict.methodology.faqTitle}
            </h2>
          </div>
          <div className="grid border border-black bg-white">
            {dict.methodology.faq.map((item) => (
              <details
                className="group border-b border-black p-4 last:border-b-0"
                key={item.question}
              >
                <summary className="cursor-pointer list-none text-base font-black text-black marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {item.question}
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-black text-sm font-black text-uga-green transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SpikeMethodologyPage({
  dict,
}: {
  dict: ReturnType<typeof getDictionary>;
}) {
  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] text-[#f8f8f2]">
      <section className="border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto grid max-w-[1900px] gap-8 px-6 py-12 lg:grid-cols-[0.52fr_0.48fr] lg:px-8 lg:py-16">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {dict.methodology.label}
            </p>
            <h1 className="mt-5 max-w-5xl text-[clamp(2.55rem,5.7vw,6rem)] font-black uppercase leading-[0.88] tracking-normal text-white">
              {dict.methodology.title}
            </h1>
          </div>
          <div className="self-end rounded-[1.4rem] border border-white/18 bg-black/35 p-5 backdrop-blur">
            <p className="text-base font-semibold leading-7 text-white/70">
              {dict.methodology.description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1900px] gap-7 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {dict.methodology.coreLabel}
          </p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white">
            {dict.methodology.coreTitle}
          </h2>
        </div>
        <div className="grid gap-5">
          <div className="grid gap-4 text-base leading-7 text-white/64">
            {dict.methodology.coreNarrative.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {dict.methodology.facts.map((fact) => (
              <div
                className="rounded-[1.1rem] border border-white/12 bg-[#f8f8f2] p-5 text-[#050505]"
                key={`${fact.value}-${fact.label}`}
              >
                <p className="text-2xl font-black uppercase leading-none text-[#050505]">
                  {fact.value}
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-black/60">
                  {fact.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090909]">
        <div className="mx-auto grid max-w-[1900px] gap-7 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
              {dict.methodology.label}
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white">
              {dict.methodology.flowTitle}
            </h2>
          </div>

          <div className="grid gap-3">
            {dict.methodology.flow.map((step, index) => (
              <article
                className="grid gap-4 rounded-[1.15rem] border border-white/10 bg-[#f8f8f2] p-5 text-[#050505] transition hover:border-[var(--spike-accent)] sm:grid-cols-[4rem_0.8fr_1.35fr] sm:items-start"
                key={step.title}
              >
                <span className="text-2xl font-black text-[var(--spike-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-base font-black uppercase leading-5 text-[#050505]">
                  {step.title}
                </h3>
                <p className="text-sm leading-6 text-black/62">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-6 py-8 lg:px-8 lg:py-10">
        <div className="grid gap-5 rounded-[1.35rem] border border-white/12 bg-[#101010] p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              PDF
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-normal text-white">
              {dict.methodology.pdfTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/58">
              {dict.methodology.pdfDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex rounded-full bg-[var(--spike-accent)] px-5 py-2.5 text-sm font-black text-[#050505] transition hover:bg-white"
              download
              href={SITE_CONFIG.methodologyPdfPath}
            >
              {dict.methodology.pdfDownload}
            </a>
            <a
              className="inline-flex rounded-full border border-white/22 bg-[#f8f8f2] px-5 py-2.5 text-sm font-black text-[#050505] transition hover:bg-white"
              href={SITE_CONFIG.methodologyPdfPath}
              rel="noopener noreferrer"
              target="_blank"
            >
              {dict.methodology.pdfOpen}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1900px] px-6 pb-10 lg:px-8 lg:pb-14">
        <div className="grid gap-7 lg:grid-cols-[24rem_1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
              {dict.methodology.label}
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white">
              {dict.methodology.faqTitle}
            </h2>
          </div>
          <div className="grid gap-3">
            {dict.methodology.faq.map((item) => (
              <details
                className="group rounded-[1.15rem] border border-white/10 bg-[#f8f8f2] p-5 text-[#050505]"
                key={item.question}
              >
                <summary className="cursor-pointer list-none text-base font-black text-[#050505] marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {item.question}
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/8 text-sm font-black text-[var(--spike-accent)] transition group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-black/62">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
