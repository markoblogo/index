import { getDictionary, type Locale } from "@/lib/i18n";
import { SITE_CONFIG } from "@/lib/constants";
import { getTenantAssetUrl } from "@/lib/tenant-assets";

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  if (SITE_CONFIG.tenantId === "spike-ua") {
    return <SpikeMethodologyPage dict={dict} locale={locale} />;
  }

  return (
    <>
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-7 lg:grid-cols-[0.58fr_1.42fr] lg:items-end lg:px-8 lg:py-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {dict.methodology.label}
          </p>
          <div>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-[3.35rem]">
              {dict.methodology.title}
            </h1>
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-black/70 sm:text-base">
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

      <OperationalReadinessSection locale={locale} variant="uga" />

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
  locale,
}: {
  dict: ReturnType<typeof getDictionary>;
  locale: Locale;
}) {
  const aiFaq =
    locale === "uk"
      ? {
          answer:
            "Ні. Офіційні значення індексу розраховуються відповідно до опублікованої методології SPIKE. AI використовується лише для інтерпретації опублікованих даних, генерації аналітичних briefs, опису волатильності та сценарних нотаток. Він не встановлює, не коригує і не валідовує офіційні значення індексу.",
          question: "Чи розраховує AI офіційне значення SPIKE SPOT INDEX?",
        }
      : {
          answer:
            "No. Official index values are calculated according to the published SPIKE methodology. AI is used only to interpret published data, generate analytical briefs, describe volatility and produce scenario notes. It does not set, adjust or validate official index values.",
          question: "Does AI calculate the official SPIKE SPOT INDEX value?",
        };
  const faqItems = [...dict.methodology.faq, aiFaq];
  const methodologyPdfPath =
    locale === "uk"
      ? getTenantAssetUrl("spike.methodology.uk.pdf")
      : getTenantAssetUrl("spike.methodology.en.pdf");

  return (
    <main className="spike-static-page overflow-hidden bg-[#050505] text-[#f8f8f2]">
      <section className="border-b border-white/10 [background:var(--spike-hero-bg)]">
        <div className="mx-auto grid max-w-[1900px] gap-5 px-6 py-7 lg:grid-cols-[0.6fr_0.4fr] lg:items-end lg:px-8 lg:py-9">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {dict.methodology.label}
            </p>
            <h1 className="mt-3 max-w-5xl text-[clamp(1.85rem,3.55vw,3.55rem)] font-black uppercase leading-[0.96] tracking-normal text-white">
              {dict.methodology.title}
            </h1>
          </div>
          <div className="self-end border-l border-white/18 pl-5">
            <p className="text-sm font-semibold leading-6 text-white/70 sm:text-base">
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

      <SpikeAiPolicySection locale={locale} />

      <OperationalReadinessSection locale={locale} variant="spike" />

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
              className="inline-flex rounded-full bg-[var(--spike-accent)] px-5 py-2.5 text-sm font-black !text-[#050505] transition hover:bg-white hover:!text-[#050505]"
              download
              href={methodologyPdfPath}
            >
              {dict.methodology.pdfDownload}
            </a>
            <a
              className="inline-flex rounded-full border border-white/22 bg-[#f8f8f2] px-5 py-2.5 text-sm font-black !text-[#050505] transition hover:bg-white hover:!text-[#050505]"
              href={methodologyPdfPath}
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
            {faqItems.map((item) => (
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

function OperationalReadinessSection({
  locale,
  variant,
}: {
  locale: Locale;
  variant: "uga" | "spike";
}) {
  const isSpike = variant === "spike";
  const copy =
    locale === "uk"
      ? {
          body:
            "Платформа розділяє офіційний розрахунок, публікацію, аналітичний шар і зовнішні канали доставки. Це зменшує ризик випадкових змін у вже опублікованих значеннях і робить операційний стан перевірюваним перед релізом.",
          eyebrow: "Операційна надійність",
          items: [
            {
              description:
                "Офіційні значення проходять валідацію вибірки, фільтрацію викидів і фіксацію після публікації.",
              title: "Методологічний контроль",
            },
            {
              description:
                "Перерахунки, ручні корекції, catch-up запуск і публікаційні події зберігаються як audit trail.",
              title: "Журнал змін",
            },
            {
              description:
                "Перед релізом код проходить repo audit, production-env smoke, lint, test suite і production build.",
              title: "Release gates",
            },
            {
              description:
                "Публічні сайти, API, Context і канали повідомлень мають окремі tenant/env boundary checks.",
              title: "Межі tenant-проєктів",
            },
          ],
          note:
            "Окремі production-секрети, індивідуальні подання респондентів і внутрішні операційні ключі не публікуються.",
          title: "Як контролюється якість публікації",
        }
      : {
          body:
            "The platform separates official calculation, publication, analytical interpretation and external delivery channels. This reduces accidental changes to locked values and makes the operational state verifiable before release.",
          eyebrow: "Operational reliability",
          items: [
            {
              description:
                "Official values pass sample validation, outlier filtering and post-publication locking.",
              title: "Methodology controls",
            },
            {
              description:
                "Recalculations, manual corrections, catch-up runs and publication events are kept as an audit trail.",
              title: "Change log",
            },
            {
              description:
                "Before release, the code passes repo audit, production-env smoke, lint, test suite and production build.",
              title: "Release gates",
            },
            {
              description:
                "Public sites, APIs, Context and messaging channels use separate tenant/env boundary checks.",
              title: "Tenant boundaries",
            },
          ],
          note:
            "Production secrets, individual respondent submissions and internal operational keys are not published.",
          title: "How publication quality is controlled",
        };

  if (isSpike) {
    return (
      <section className="border-b border-white/10 bg-[#090909]">
        <div className="mx-auto grid max-w-[1900px] gap-7 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-pink)]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white">
              {copy.title}
            </h2>
            <p className="mt-5 text-sm font-semibold leading-6 text-white/58">
              {copy.body}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.items.map((item, index) => (
              <article
                className="rounded-[1.15rem] border border-white/10 bg-[#f8f8f2] p-5 text-[#050505]"
                key={item.title}
              >
                <p className="text-lg font-black text-[var(--spike-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-base font-black uppercase leading-5">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {item.description}
                </p>
              </article>
            ))}
            <p className="rounded-[1.15rem] border border-white/10 bg-black/45 p-5 text-xs font-semibold leading-5 text-white/58 sm:col-span-2">
              {copy.note}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-black bg-uga-dark text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-lime">
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-tight tracking-normal lg:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-5 text-sm font-semibold leading-6 text-white/68">
            {copy.body}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {copy.items.map((item, index) => (
            <article
              className="border border-white/20 bg-white p-4 text-black"
              key={item.title}
            >
              <p className="text-lg font-black text-uga-green">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-base font-black uppercase leading-5">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-black/65">
                {item.description}
              </p>
            </article>
          ))}
          <p className="border border-white/20 bg-black/20 p-4 text-xs font-semibold leading-5 text-white/68 sm:col-span-2">
            {copy.note}
          </p>
        </div>
      </div>
    </section>
  );
}

function SpikeAiPolicySection({ locale }: { locale: Locale }) {
  const copy =
    locale === "uk"
      ? {
          body: [
            "SPIKE SPOT INDEX використовує hybrid approach: спочатку deterministic index calculation, потім AI-assisted interpretation.",
            "Офіційний розрахунок індексу не спирається на AI. Опубліковані значення розраховуються за методологією SPIKE: збір даних респондентів, медіанна валідація, фільтрація викидів, арифметичне середнє очищеної вибірки, мінімальне покриття респондентів і locked publication.",
            "AI використовується лише як аналітичний шар над опублікованими або preview-даними. Analytics page пояснює рух індексу, volatility і spreads; Context окремо моніторить зовнішні джерела та формує daily / weekly / monthly market context.",
            "AI outputs і Context reports не є офіційними цінами, торговими сигналами чи рекомендаціями. Вони не мають доступу до індивідуальних подань респондентів і не замінюють методологію. Увесь AI-assisted content слід читати як аналітичний контекст для розуміння ринку.",
          ],
          disclaimer:
            "Official SPIKE SPOT INDEX values are methodology-based and non-AI-generated. AI-assisted outputs are provided for analytical context only.",
          eyebrow: "AI usage policy",
          items: [
            "verified market data first",
            "deterministic methodology second",
            "Context market context third",
          ],
          title: "Як AI використовується у SPIKE SPOT INDEX",
        }
      : {
          body: [
            "SPIKE SPOT INDEX uses a hybrid approach: deterministic index calculation first, AI-assisted interpretation second.",
            "The official index calculation does not rely on AI. Published values are calculated through the SPIKE methodology: respondent data collection, median validation, outlier filtering, arithmetic averaging of the cleaned sample, minimum respondent coverage and locked publication.",
            "AI is used only as an analytical layer above published or preview data. The analytics page explains index movement, volatility and spreads; Context separately monitors external sources and generates daily / weekly / monthly market context.",
            "AI outputs and Context reports are not official prices, trading signals or recommendations. They do not access individual respondent submissions and do not override the methodology. All AI-assisted content should be read as analytical context for market understanding.",
          ],
          disclaimer:
            "Official SPIKE SPOT INDEX values are methodology-based and non-AI-generated. AI-assisted outputs are provided for analytical context only.",
          eyebrow: "AI usage policy",
          items: [
            "verified market data first",
            "deterministic methodology second",
            "Context market context third",
          ],
          title: "How AI is used in SPIKE SPOT INDEX",
        };

  return (
    <section className="border-b border-white/10 bg-[#050505]">
      <div className="mx-auto grid max-w-[1900px] gap-7 px-6 py-10 lg:grid-cols-[24rem_1fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-black uppercase leading-none tracking-normal text-white">
            {copy.title}
          </h2>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-4 text-base leading-7 text-white/64">
            {copy.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {copy.items.map((item, index) => (
              <div
                className="rounded-[1rem] border border-white/12 bg-[#f8f8f2] p-4 text-[#050505]"
                key={item}
              >
                <p className="text-xl font-black text-[var(--spike-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-5">
                  {item}
                </p>
              </div>
            ))}
          </div>
          <p className="rounded-[1rem] border border-white/10 bg-black/45 p-4 text-xs font-semibold leading-5 text-white/58">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}
