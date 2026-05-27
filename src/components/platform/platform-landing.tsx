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

const capabilities = [
  "Methodology design and market-specific governance",
  "Reusable index engine and publication workflows",
  "Respondent data collection, validation and locking",
  "Embeddable widgets for partner websites and media",
] as const;

export function PlatformLanding() {
  return (
    <main className="min-h-screen bg-[#07100c] text-white">
      <header className="border-b border-white/10">
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
          </nav>
          <a
            className="border border-white/25 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
            href="#contact"
          >
            Contact
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[8%] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-[#d6ff58]/20 blur-3xl" />
          <div className="absolute bottom-[-22rem] right-[-6rem] h-[42rem] w-[42rem] rounded-full bg-[#2b7cff]/18 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="max-w-3xl">
            <PlatformLogo className="mb-8 h-12 w-auto sm:h-16" />
            <h1 className="max-w-4xl text-6xl font-black leading-[0.9] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Local commodity indices, built with market leaders.
            </h1>
            <p className="mt-7 max-w-2xl text-xl leading-8 text-white/72">
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

          <div className="grid content-end gap-4 lg:pt-10">
            <div className="border border-white/12 bg-white/[0.045] p-5">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#d6ff58]">
                Operational model
              </p>
              <div className="mt-5 grid gap-3">
                {["Local partner", "Index methodology", "Data workflow", "Public benchmark"].map(
                  (item, index) => (
                    <div
                      className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3"
                      key={item}
                    >
                      <span className="text-sm font-semibold text-white/72">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-black text-white">{item}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b1711]" id="indices">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">Live index projects</h2>
            <p className="max-w-3xl text-lg leading-7 text-white/68 lg:justify-self-end">
              We launch trusted local index products in partnership with
              institutional organizations and market leaders. Each project keeps
              its local brand while running on shared 1d3x infrastructure.
            </p>
          </div>
          <div className="mt-10 grid gap-7 lg:grid-cols-2">
            {liveIndices.map((index) => (
              <article className="border border-white/12 bg-[#07100c]" key={index.name}>
                <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                  <div>
                    <h3 className="text-2xl font-black">{index.name}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/62">
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
                <iframe
                  className="h-[620px] w-full bg-white"
                  loading="lazy"
                  src={index.embed}
                  title={`${index.name} embedded preview`}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10" id="methodology">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
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
          <div className="grid gap-px border border-white/12 bg-white/12">
            {capabilities.map((capability) => (
              <div className="bg-[#07100c] p-5 text-lg font-semibold text-white/82" key={capability}>
                {capability}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#f4f7ef] text-[#07100c]" id="partners">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div>
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              Built for associations, brokers and commodity market operators.
            </h2>
          </div>
          <div>
            <p className="text-xl leading-8 text-[#07100c]/70">
              We are preparing similar index products for the Italian and Turkish
              markets and are open to other regional commodity partnerships where
              transparent local benchmarks can improve market infrastructure.
            </p>
            <p className="mt-6 text-xl leading-8 text-[#07100c]/70">
              The partnership terms are designed to stay simple, practical and
              mutually attractive: 1d3x brings the platform and launch process;
              partners bring market leadership and distribution.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#07100c]" id="contact">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
          <div>
            <h2 className="text-4xl font-black leading-tight sm:text-5xl">
              Launch a local commodity index with us.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/68">
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
          <div className="border border-white/12 bg-white/[0.045] p-5 sm:p-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-8 text-sm text-white/50 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <PlatformLogo className="h-4 w-auto opacity-60" />
            <p>Commodity index infrastructure.</p>
          </div>
          <div className="flex gap-5">
            <a className="transition hover:text-white" href="https://uga.1d3x.com">
              UGA Index
            </a>
            <a className="transition hover:text-white" href="https://spike.1d3x.com">
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
