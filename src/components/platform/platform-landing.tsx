import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/platform/contact-form";

const liveIndices = [
  {
    name: "UGA Index",
    href: "https://uga.1d3x.com",
    embed: "https://uga.1d3x.com/embed/site?locale=en&theme=light&view=index",
    description:
      "An institutional export price benchmark for Ukrainian grain and oilseed markets, built with the Ukrainian Grain Association.",
  },
  {
    name: "SPIKE SPOT INDEX",
    href: "https://spike.1d3x.com",
    embed: "https://spike.1d3x.com/embed/site?locale=en&theme=dark&view=index",
    description:
      "A spot benchmark for Ukrainian agricultural export and processing markets, built with Spike Brokers.",
  },
] as const;

const legalNotices = [
  {
    title: "Informational use only",
    text: "Index values and analytics shown through 1d3x projects are published for informational and analytical purposes only. They are not investment advice, trading advice, a public offer or a recommendation to buy or sell any commodity.",
  },
  {
    title: "Independent decisions",
    text: "Market participants remain responsible for their own commercial, trading, financial and risk-management decisions and should verify information independently before relying on it.",
  },
  {
    title: "Data handling",
    text: "The 1d3x landing site does not collect or process respondent price submissions. Local index projects operate their own respondent workflows and publish only aggregated outputs according to their methodologies.",
  },
  {
    title: "No liability",
    text: "1d3x, project partners and technology providers are not liable for decisions, losses or damages arising from use of published index values, embeds, analytics or related materials.",
  },
] as const;

const faqs = [
  {
    question: "What does 1d3x build?",
    answer:
      "1d3x builds local commodity index products with the methodology, publication workflow, respondent tooling and embeddable index interfaces needed to launch trusted market benchmarks.",
  },
  {
    question: "Who can partner with 1d3x?",
    answer:
      "We work with institutional associations, brokers, market operators and credible local leaders who can bring domain expertise, respondent access and distribution.",
  },
  {
    question: "Do partners need to build technology?",
    answer:
      "No. 1d3x provides the reusable index engine, launch process and publishing infrastructure while partners focus on market leadership and local relationships.",
  },
  {
    question: "Which markets are next?",
    answer:
      "We are preparing similar index products for Italian and Turkish commodity markets and are open to other regional markets where transparent local benchmarks can improve infrastructure.",
  },
  {
    question: "Can index widgets be embedded?",
    answer:
      "Yes. Each local index project can expose controlled embeddable views for partner websites, media, institutional pages and market information products.",
  },
  {
    question: "Are the indices trading advice?",
    answer:
      "No. Published index values are informational market benchmarks and analytics only. They are not trading, investment or commercial recommendations.",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://1d3x.com/#organization",
      name: "1d3x",
      url: "https://1d3x.com",
      logo: "https://1d3x.com/brand/1d3x-logo.png",
      email: "partnerships@1d3x.com",
      description:
        "Commodity index infrastructure for local agricultural markets, built with institutional partners and market leaders.",
      sameAs: ["https://uga.1d3x.com", "https://spike.1d3x.com"],
    },
    {
      "@type": "WebSite",
      "@id": "https://1d3x.com/#website",
      name: "1d3x",
      url: "https://1d3x.com",
      publisher: { "@id": "https://1d3x.com/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": "https://1d3x.com/#faq",
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export function PlatformLanding() {
  return (
    <main className="min-h-screen bg-[#07100c] text-white">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <header className="border-b border-white/10 bg-[#07100c]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="block" href="/" aria-label="1d3x home">
            <PlatformLogo className="h-5 w-auto sm:h-6" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-white/68 md:flex">
            <a className="transition hover:text-white" href="#indices">
              Live indices
            </a>
            <a className="transition hover:text-white" href="#methodology">
              Methodology
            </a>
            <a className="transition hover:text-white" href="#partners">
              Partners
            </a>
            <a className="transition hover:text-white" href="/blog">
              Blog
            </a>
          </nav>
          <a
            className="border border-white/25 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
            href="#contact"
          >
            Contact
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,#0a170f_0%,#06100c_100%)]">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-3xl">
            <PlatformLogo className="mb-8 h-10 w-auto sm:h-14" />
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-normal text-white sm:text-6xl lg:text-7xl">
              Local commodity indices, built with market leaders.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              1d3x is an index infrastructure platform for local agricultural
              markets, created by the team behind agri-market infrastructure
              projects including MN7R and Cropto.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center border border-[#d6ff58] bg-[#d6ff58] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#08100c] transition hover:bg-white"
                href="#contact"
              >
                Partner with us
              </a>
              <a
                className="inline-flex h-12 items-center justify-center border border-white/20 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:border-white"
                href="#indices"
              >
                View live indices
              </a>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center overflow-visible">
            <div
              className="relative w-full max-w-[36rem] border border-white/12 bg-[#07100c] transition duration-500 ease-out lg:hover:z-30 lg:hover:scale-[1.75] lg:focus:z-30 lg:focus:scale-[1.75] lg:focus:outline-none xl:max-w-[40rem]"
              tabIndex={0}
            >
              <Image
                alt="1d3x operational model: local partner, index methodology, data workflow and public benchmark connected to the 1d3x infrastructure platform."
                className="h-auto w-full"
                height={1024}
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                src="/brand/operational-model.png"
                width={1536}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b1711]" id="indices">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              Live index projects
            </h2>
            <p className="max-w-3xl text-lg leading-7 text-white/68 lg:justify-self-end">
              We launch trusted local index products in partnership with
              institutional organizations and market leaders. Each project keeps
              its local brand while running on shared 1d3x infrastructure.
            </p>
          </div>
          <div className="mt-10 grid gap-8">
            {liveIndices.map((index) => (
              <article
                className="border border-white/14 bg-[#07100c]"
                key={index.name}
              >
                <div className="grid gap-4 border-b border-white/10 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <h3 className="text-2xl font-black">{index.name}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
                      {index.description}
                    </p>
                  </div>
                  <a
                    className="shrink-0 border border-white/18 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
                    href={index.href}
                  >
                    Open
                  </a>
                </div>
                <div className="bg-white">
                  <iframe
                    className="h-[620px] w-full bg-white md:h-[740px] lg:h-[820px]"
                    loading="eager"
                    src={index.embed}
                    title={`${index.name} embedded preview`}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-b border-white/10 bg-[#07100c]"
        id="methodology"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-10">
          <div>
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              A repeatable playbook for local markets.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/68">
              1d3x provides the technology, methodology, publishing
              infrastructure and operational process. Local partners bring
              credibility, market access and domain expertise.
            </p>
          </div>
          <div className="relative z-10 flex items-center justify-center overflow-visible">
            <div
              className="relative w-full max-w-[21rem] border border-white/12 bg-[#07100c] transition duration-500 ease-out lg:hover:z-30 lg:hover:scale-[2.15] lg:focus:z-30 lg:focus:scale-[2.15] lg:focus:outline-none xl:max-w-[23rem]"
              tabIndex={0}
            >
              <Image
                alt="1d3x repeatable playbook for local markets: methodology, engine and workflows, data infrastructure and delivery."
                className="h-auto w-full"
                height={1024}
                sizes="(min-width: 1024px) 52vw, 100vw"
                src="/brand/repeatable-playbook.png"
                width={1536}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-white/10 bg-[#f4f7ef] text-[#07100c]"
        id="partners"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div>
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              Built for associations, brokers and commodity market operators.
            </h2>
          </div>
          <div>
            <p className="text-xl leading-8 text-[#07100c]/70">
              We are preparing similar index products for the Italian and
              Turkish markets and are open to other regional commodity
              partnerships where transparent local benchmarks can improve market
              infrastructure.
            </p>
            <p className="mt-6 text-xl leading-8 text-[#07100c]/70">
              The partnership terms are designed to stay simple, practical and
              mutually attractive: 1d3x brings the platform and launch process;
              partners bring market leadership and distribution.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#07100c]" id="contact">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-14">
          <div>
            <h2 className="text-3xl font-black leading-tight sm:text-4xl">
              Launch a local commodity index with us.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
              Contact us for institutional partnerships, national market
              projects, broker-led benchmarks and regional commodity index
              launches.
            </p>
            <a
              className="mt-5 inline-block text-base font-black text-[#d6ff58] transition hover:text-white"
              href="mailto:partnerships@1d3x.com"
            >
              partnerships@1d3x.com
            </a>
          </div>
          <div className="border border-white/12 bg-white/[0.045] p-4 sm:p-5">
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b1711]" id="faq">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              FAQ
            </h2>
            <p className="max-w-3xl text-lg leading-7 text-white/68 lg:justify-self-end">
              Short answers for organizations considering a local commodity
              index launch with the 1d3x platform.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <details
                className="group border border-white/12 bg-[#07100c] p-5 open:border-[#d6ff58]/60"
                key={item.question}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-black text-white">
                  <span>{item.question}</span>
                  <span className="text-2xl font-light leading-none text-[#d6ff58] group-open:hidden">
                    +
                  </span>
                  <span className="hidden text-2xl font-light leading-none text-[#d6ff58] group-open:block">
                    -
                  </span>
                </summary>
                <p className="mt-4 text-base leading-7 text-white/62">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-sm text-white/50 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8">
          <div className="grid gap-4 border-b border-white/10 pb-7 md:grid-cols-4">
            {legalNotices.map((notice) => (
              <section key={notice.title}>
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-white/70">
                  {notice.title}
                </h2>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  {notice.text}
                </p>
              </section>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PlatformLogo className="h-4 w-auto opacity-60" />
            <p>Commodity index infrastructure.</p>
          </div>
          <div className="flex gap-5">
            <a
              className="transition hover:text-white"
              href="/blog"
            >
              Blog
            </a>
            <a
              className="transition hover:text-white"
              href="https://uga.1d3x.com"
            >
              UGA Index
            </a>
            <a
              className="transition hover:text-white"
              href="https://spike.1d3x.com"
            >
              SPIKE SPOT INDEX
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PlatformLogo({ className }: { className: string }) {
  return (
    <Image
      alt="1d3x"
      className={className}
      height={736}
      priority
      src="/brand/1d3x-logo-white.png"
      width={2140}
    />
  );
}
