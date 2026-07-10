import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/components/platform/contact-form";
import { AutoplayYoutubeEmbed } from "@/components/platform/autoplay-youtube-embed";
import {
  getTenantAssetAbsoluteUrl,
  getTenantAssetUrl,
} from "@/lib/tenant-assets";

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
    question: "What is 1D3X Cortex?",
    answer:
      "1D3X Cortex is the planned internal intelligence layer that connects Index, Context, MN7R and Cr0pto through evidence-backed context packs, governed assistant tools and later bounded autonomy per capability.",
  },
  {
    question: "Are the indices trading advice?",
    answer:
      "No. Published index values are informational market benchmarks and analytics only. They are not trading, investment or commercial recommendations.",
  },
] as const;

const handbookResource = {
  cover: getTenantAssetAbsoluteUrl(
    "spike.handbook.cover.en",
    "https://spike.1d3x.com",
  ),
  pdf: getTenantAssetAbsoluteUrl("spike.handbook.en.pdf", "https://spike.1d3x.com"),
  epub: getTenantAssetAbsoluteUrl("spike.handbook.en.epub", "https://spike.1d3x.com"),
} as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://1d3x.com/#organization",
      name: "1d3x",
      url: "https://1d3x.com",
      logo: "https://1d3x.com/brand/1d3x-logo.webp",
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

const platformPillars = [
  {
    number: "01",
    title: "Index engine",
    text: "Methodology, respondent workflow, calculation, publishing and embeddable public views in one reusable operating layer.",
  },
  {
    number: "02",
    title: "Context",
    text: "Monitored market context, daily / weekly / monthly report rhythm and editor-submitted material intelligence.",
  },
  {
    number: "03",
    title: "Local franchise",
    text: "A repeatable launch model for associations, brokers and market operators that already own credibility and distribution.",
  },
] as const;

const operatingStack = [
  "Verified respondent and source workflows",
  "Methodology-based calculation layer",
  "Market context via Context and AI-assisted reports",
  "Public embeds, landing pages and partner distribution",
] as const;

const mediaHubSignals = [
  "Daily briefs",
  "Weekly and monthly reports",
  "Source monitoring",
  "Telegram material intake",
] as const;

const cortexCapabilities = [
  {
    title: "Evidence packs",
    text: "Index values, Context sources, Telegram bot materials and approved project records are assembled with source IDs, timestamps and known gaps.",
  },
  {
    title: "Ecosystem context",
    text: "MN7R and Cr0pto assistants can use bounded market context without exposing raw private workspace state to external models.",
  },
  {
    title: "Permission gates",
    text: "Public, internal, protected and secret visibility classes decide what can enter OpenAI or any other model call; autonomy is enabled only per approved capability.",
  },
] as const;

export function PlatformLanding() {
  const partnerDeck = getTenantAssetUrl("1d3x.partnerDeck.pdf");

  return (
    <main className="min-h-screen bg-[#f3f0e8] text-[#050505]">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes id3x-drift {
              0% { transform: translate3d(-2%, 1%, 0) scale(1); opacity: .42; }
              50% { transform: translate3d(5%, -3%, 0) scale(1.08); opacity: .72; }
              100% { transform: translate3d(1%, 4%, 0) scale(.96); opacity: .5; }
            }
            @keyframes id3x-scan {
              0% { transform: translateX(-35%); opacity: 0; }
              18% { opacity: .55; }
              100% { transform: translateX(135%); opacity: 0; }
            }
            @keyframes id3x-float {
              0% { transform: translate3d(0, 0, 0) rotate(0deg); }
              50% { transform: translate3d(18px, -28px, 0) rotate(9deg); }
              100% { transform: translate3d(-12px, 18px, 0) rotate(-7deg); }
            }
            @keyframes id3x-orbit {
              0% { transform: rotate(0deg) translateX(12px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
            }
            @keyframes id3x-pulse {
              0%, 100% { opacity: .32; filter: hue-rotate(0deg); }
              50% { opacity: .9; filter: hue-rotate(34deg); }
            }
            @media (prefers-reduced-motion: reduce) {
              .id3x-animate { animation: none !important; }
            }
          `,
        }}
      />
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f3f0e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="block" href="/" aria-label="1d3x home">
            <PlatformLogo className="h-5 w-auto sm:h-6" variant="dark" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-bold text-black/55 md:flex">
            <a className="transition hover:text-black" href="#indices">
              Live indices
            </a>
            <Link className="transition hover:text-black" href="/media-hub">
              Context
            </Link>
            <a className="transition hover:text-black" href="#methodology">
              Methodology
            </a>
            <a className="transition hover:text-black" href="#partners">
              Partners
            </a>
            <Link className="transition hover:text-black" href="/blog">
              Blog
            </Link>
          </nav>
          <a
            className="border border-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-black hover:bg-black hover:text-white"
            href="#contact"
          >
            Contact
          </a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#050505] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_76%_18%,rgba(214,255,88,0.22),transparent_27%),radial-gradient(circle_at_15%_78%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(135deg,#050505_0%,#0b1511_48%,#050505_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="absolute right-[-18rem] top-20 -z-10 h-[42rem] w-[42rem] rounded-full border border-[#d6ff58]/30" />
        <div className="id3x-animate absolute left-[8%] top-[18%] -z-10 h-44 w-44 rounded-full bg-[#d6ff58]/20 blur-3xl [animation:id3x-drift_13s_ease-in-out_infinite_alternate]" />
        <div className="id3x-animate absolute bottom-[12%] right-[18%] -z-10 h-60 w-60 rounded-full bg-white/10 blur-3xl [animation:id3x-drift_17s_ease-in-out_infinite_alternate-reverse]" />
        <div className="id3x-animate absolute inset-y-0 left-0 -z-10 w-1/3 bg-gradient-to-r from-transparent via-[#d6ff58]/10 to-transparent [animation:id3x-scan_9s_linear_infinite]" />
        <div className="pointer-events-none absolute left-[6%] top-[18%] z-0 hidden h-24 w-24 rounded-[2rem] border border-[#d6ff58]/35 bg-[#d6ff58]/8 backdrop-blur-md id3x-animate [animation:id3x-float_11s_ease-in-out_infinite_alternate] md:block" />
        <div className="pointer-events-none absolute right-[12%] top-[20%] z-0 hidden h-36 w-36 rounded-full border border-white/25 id3x-animate [animation:id3x-orbit_18s_linear_infinite] lg:block">
          <span className="absolute left-1/2 top-[-0.35rem] h-3 w-3 rounded-full bg-[#d6ff58] shadow-[0_0_24px_rgba(214,255,88,.9)]" />
        </div>
        <div className="pointer-events-none absolute bottom-[10%] left-[42%] z-0 hidden h-20 w-44 rounded-full border border-white/14 bg-white/[0.045] backdrop-blur id3x-animate [animation:id3x-float_14s_ease-in-out_infinite_alternate-reverse] lg:block" />
        <div className="pointer-events-none absolute bottom-[28%] right-[4%] z-0 h-2 w-2 rounded-full bg-[#d6ff58] shadow-[0_0_34px_16px_rgba(214,255,88,.22)] id3x-animate [animation:id3x-pulse_3.8s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute left-[18%] top-[62%] z-0 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_28px_12px_rgba(255,255,255,.18)] id3x-animate [animation:id3x-pulse_4.5s_ease-in-out_infinite]" />
        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div>
            <p className="max-w-xl text-xs font-black uppercase tracking-[0.32em] text-[#d6ff58]">
              1D3X infrastructure / Context / local benchmark franchise
            </p>
            <h1 className="mt-8 max-w-5xl text-6xl font-black leading-[0.82] tracking-[-0.07em] sm:text-8xl lg:text-[7.5rem]">
              Commodity intelligence canvas.
            </h1>
            <p className="mt-8 max-w-2xl text-xl leading-8 text-white/70">
              1d3x turns local commodity markets into index products: verified
              price workflows, public benchmark pages, Context context and
              partner distribution in one launch system.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-[#d6ff58] bg-[#d6ff58] px-5 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] text-black transition hover:bg-white sm:text-xs"
                href="#contact"
              >
                Partner with us
              </a>
              <a
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-5 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] text-white transition hover:border-white sm:text-xs"
                href="#indices"
              >
                View live indices
              </a>
              <Link
                className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-5 text-center text-[0.68rem] font-black uppercase tracking-[0.08em] text-white transition hover:border-[#d6ff58] hover:text-[#d6ff58] sm:text-xs"
                href="/media-hub"
              >
                Open Context
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-4 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
                <Image
                  alt="1d3x operational model: local partner, index methodology, data workflow and public benchmark connected to the 1d3x infrastructure platform."
                  className="h-auto w-full"
                  height={1024}
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  src="/brand/operational-model.webp"
                  width={1536}
                />
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 text-center">
                {platformPillars.map((pillar) => (
                  <div className="px-2 py-4" key={pillar.title}>
                    <p className="text-xs font-black text-[#d6ff58]">
                      {pillar.number}
                    </p>
                    <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/70">
                      {pillar.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f0e8] text-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <h2 className="text-5xl font-black leading-[0.9] tracking-[-0.05em] sm:text-7xl">
            One engine.
            <br />
            Many local benchmarks.
          </h2>
          <div className="space-y-7 text-xl leading-9 text-black/68">
            <p>
              The core product is not a website. It is an operating system for
              price benchmarks: respondent intake, methodology, calculation,
              publication, analytics and distribution.
            </p>
            <p>
              Each local index keeps its own market logic and partner
              credibility. 1d3x supplies the infrastructure that makes it
              repeatable.
            </p>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#050505] text-white">
        <div className="pointer-events-none absolute right-[6%] top-14 z-0 h-28 w-28 rounded-[2rem] border border-[#d6ff58]/25 bg-[#d6ff58]/8 id3x-animate [animation:id3x-float_12s_ease-in-out_infinite_alternate]" />
        <div className="pointer-events-none absolute bottom-12 left-[8%] z-0 h-40 w-40 rounded-full border border-white/12 id3x-animate [animation:id3x-orbit_24s_linear_infinite]" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
                Product architecture
              </p>
              <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
                Built as a market intelligence stack.
              </h2>
            </div>
            <div className="divide-y divide-white/12 border-y border-white/12">
              {platformPillars.map((pillar) => (
                <article
                  className="grid gap-4 py-8 sm:grid-cols-[7rem_1fr]"
                  key={pillar.title}
                >
                  <p className="text-5xl font-black tracking-[-0.05em] text-[#d6ff58]">
                    {pillar.number}
                  </p>
                  <div>
                    <h3 className="text-3xl font-black tracking-[-0.03em]">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-lg leading-8 text-white/62">
                      {pillar.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#050505] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_42%,rgba(214,255,88,0.18),transparent_28%),linear-gradient(180deg,#050505_0%,#0b120f_100%)]" />
        <div className="pointer-events-none absolute right-[8%] top-[14%] z-0 h-24 w-24 rounded-[1.75rem] border border-[#d6ff58]/30 bg-[#d6ff58]/8 backdrop-blur id3x-animate [animation:id3x-float_10s_ease-in-out_infinite_alternate]" />
        <div className="pointer-events-none absolute bottom-[12%] left-[10%] z-0 hidden h-32 w-32 rounded-full border border-white/14 id3x-animate [animation:id3x-orbit_20s_linear_infinite] md:block">
          <span className="absolute right-2 top-3 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,.8)]" />
        </div>
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
              Context intelligence layer
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[0.92] tracking-[-0.05em] sm:text-7xl">
              Market context, not content noise.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
              Context monitors relevant market sources, accepts analyst
              materials through Telegram and turns the flow into daily, weekly
              and monthly briefs for each index franchise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {mediaHubSignals.map((signal) => (
                <span
                  className="rounded-full border border-white/15 px-4 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/70"
                  key={signal}
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>
          <div className="relative min-h-[26rem] overflow-hidden rounded-[2rem] border border-white/12 bg-white/[0.045] p-6">
            <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(214,255,88,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(214,255,88,.28)_1px,transparent_1px)] [background-size:44px_44px]" />
            <div className="id3x-animate absolute left-8 top-10 h-28 w-28 rounded-full bg-[#d6ff58]/30 blur-2xl [animation:id3x-drift_10s_ease-in-out_infinite_alternate]" />
            <div className="relative grid gap-4">
              {[
                ["Monitoring feed", "News, blogs, Telegram, APIs and manual files"],
                ["Report engine", "Daily / weekly / monthly summaries"],
                ["Distribution", "Website, Telegram and partner channels"],
              ].map(([title, text], index) => (
                <div
                  className="rounded-[1.25rem] border border-white/12 bg-black/35 p-5 backdrop-blur"
                  key={title}
                >
                  <p className="text-xs font-black text-[#d6ff58]">
                    0{index + 1}
                  </p>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/58">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f3f0e8] text-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:py-24">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-black/45">
              1D3X Cortex
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              The internal context layer for the commodity stack.
            </h2>
            <p className="mt-6 text-lg leading-8 text-black/62">
              Cortex is planned as the evidence-backed intelligence and tool
              layer that connects Index, Context, MN7R Monitor, Cr0pto and
              smaller agro-commodity resources. For SSI and 1D3X reports it can
              ingest Telegram bot materials, build a bounded evidence pack, and
              then hand the approved context to OpenAI API for drafting. Over
              time, the same layer can support approval-gated actions and
              bounded autonomy inside ecosystem products.
            </p>
          </div>
          <div className="grid gap-4">
            {cortexCapabilities.map((item, index) => (
              <article
                className="rounded-[1.25rem] border border-black/10 bg-white p-5 shadow-sm shadow-black/5"
                key={item.title}
              >
                <p className="text-xl font-black text-[#5f6f00]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-[#f3f0e8] text-black" id="indices">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Live index projects
            </h2>
            <p className="max-w-3xl text-lg leading-8 text-black/62 lg:justify-self-end">
              We launch trusted local index products in partnership with
              institutional organizations and market leaders. Each project keeps
              its local brand while running on shared 1d3x infrastructure.
            </p>
          </div>
          <div className="mt-10 grid gap-8">
            {liveIndices.map((index) => (
              <article
                className="overflow-hidden rounded-[1.5rem] border border-black/12 bg-white shadow-xl shadow-black/5"
                key={index.name}
              >
                <div className="grid gap-4 border-b border-black/10 p-5 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div>
                    <h3 className="text-2xl font-black text-black">
                      {index.name}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-black/58">
                      {index.description}
                    </p>
                  </div>
                  <a
                    className="shrink-0 rounded-full border border-black/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-black/70 transition hover:border-black hover:bg-black hover:text-white"
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

      <section className="bg-[#050505] text-white" id="partner-program">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
            NOW EXPANDING ACROSS EUROPE
          </p>
          <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Launch a local index without rebuilding the infrastructure.
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/62">
            We provide the engine, methodology and publication layer. Partners
            provide market access, domain expertise and local trust.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-white/16">
              <AutoplayYoutubeEmbed
                title="1D3X Partner Program"
                videoId="nDtDWvTzELc"
              />
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-6">
              <div className="space-y-4">
                {operatingStack.map((item) => (
                  <p
                    className="border-b border-white/10 pb-4 text-xl font-black leading-7 text-white"
                    key={item}
                  >
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 min-[1180px]:flex-row">
                <a
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-[#d6ff58] bg-[#d6ff58] px-4 text-center text-[0.66rem] font-black uppercase tracking-[0.08em] text-black transition hover:bg-white"
                  href={partnerDeck}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Watch presentation
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-4 text-center text-[0.66rem] font-black uppercase tracking-[0.08em] text-white transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
                  download
                  href={partnerDeck}
                >
                  Download deck
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/20 px-4 text-center text-[0.66rem] font-black uppercase tracking-[0.08em] text-white transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
                  href="#contact"
                >
                  Become partner
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b border-black/10 bg-[#f3f0e8] text-black"
        id="methodology"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-black/45">
              Repeatable methodology
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              A repeatable playbook for local markets.
            </h2>
            <p className="mt-6 text-lg leading-8 text-black/62">
              1d3x provides the technology, methodology, publishing
              infrastructure and operational process. Local partners bring
              credibility, market access and domain expertise.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[30rem] rounded-[1.5rem] border border-black/10 bg-white p-3 shadow-xl shadow-black/10">
              <Image
                alt="1d3x repeatable playbook for local markets: methodology, engine and workflows, data infrastructure and delivery."
                className="h-auto w-full rounded-[1rem]"
                height={1024}
                sizes="(min-width: 1024px) 52vw, 100vw"
                src="/brand/repeatable-playbook.webp"
                width={1536}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#050505] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
              Operational assurance
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Built to be audited before it is published.
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/64">
              Each index tenant runs through repeatable quality gates before
              release: production-env smoke checks, repo health audit, lint,
              regression tests and production build. Public methodology,
              Context delivery and tenant boundaries are treated as part of the
              operational system, not as afterthoughts.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Tenant boundaries",
                body: "Project URLs, public API surfaces and messaging targets are checked per tenant before release.",
              },
              {
                title: "Publication control",
                body: "Index values are calculated, reviewed, locked and recorded through auditable publication events.",
              },
              {
                title: "Context resilience",
                body: "Telegram, WhatsApp and report workflows use explicit secrets, allowlists, timeout bounds and catch-up paths.",
              },
              {
                title: "Release evidence",
                body: "The platform keeps a single audit gate for CI/local verification plus a documented completion matrix.",
              },
            ].map((item, index) => (
              <article
                className="rounded-[1.25rem] border border-white/12 bg-[#f3f0e8] p-5 text-black"
                key={item.title}
              >
                <p className="text-xl font-black text-[#5f6f00]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-lg font-black uppercase leading-5">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-b border-white/10 bg-[#050505] text-white"
        id="partners"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
              Local franchise model
            </p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Built for associations, brokers and commodity market operators.
            </h2>
          </div>
          <div>
            <p className="text-xl leading-8 text-white/64">
              We are preparing similar index products for the Italian and
              Turkish markets and are open to other regional commodity
              partnerships where transparent local benchmarks can improve market
              infrastructure.
            </p>
            <p className="mt-6 text-xl leading-8 text-white/64">
              The partnership terms are designed to stay simple, practical and
              mutually attractive: 1d3x brings the platform and launch process;
              partners bring market leadership and distribution.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#f3f0e8] text-black" id="contact">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-14">
          <div>
            <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-5xl">
              Launch a local commodity index with us.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-black/62">
              Contact us for institutional partnerships, national market
              projects, broker-led benchmarks and regional commodity index
              launches.
            </p>
            <a
              className="mt-5 inline-block text-base font-black text-black transition hover:text-black/60"
              href="mailto:partnerships@1d3x.com"
            >
              partnerships@1d3x.com
            </a>
          </div>
          <div className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-xl shadow-black/5 sm:p-5">
            <ContactForm tone="light" />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6ff58]">
                Recommended reading
              </p>
              <h2 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl">
                Spot-Market Handbook
              </h2>
              <p className="mt-4 text-lg leading-8 text-white/68">
                A practical guide to how physical agricultural markets actually
                work: basis, logistics, liquidity, respondent models, benchmark
                construction and the infrastructure behind trusted commodity
                indices.
              </p>
            </div>

            <article className="grid gap-5 rounded-[1.5rem] border border-white/12 bg-[#f3f0e8] p-5 text-black sm:p-6 lg:grid-cols-[13rem_1fr]">
              <div className="border border-[#07100c]/10 bg-white/55 p-3">
                <Image
                  alt="Spot Market Handbook English cover"
                  className="h-auto w-full object-contain"
                  height={960}
                  src={handbookResource.cover}
                  unoptimized
                  width={640}
                />
              </div>

              <div className="flex flex-col justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-[#6f806f]">
                    Guide to physical commodity markets
                  </p>
                  <h3 className="mt-3 text-2xl font-black leading-tight">
                    Global English edition for traders, brokers, analysts and
                    market operators
                  </h3>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-[#07100c]/72">
                    This edition expands beyond Ukraine into the broader logic
                    of spot commodity markets: how fragmented quotes become
                    benchmarks, how local trading structure shapes price
                    reality, and how index products evolve into market
                    intelligence infrastructure.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:flex-nowrap">
                  <a
                    className="inline-flex min-w-[10.25rem] items-center justify-center rounded-full border border-[#d6ff58] bg-[#d6ff58] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition hover:bg-white"
                    download
                    href={handbookResource.pdf}
                  >
                    Download PDF
                  </a>
                  <a
                    className="inline-flex min-w-[10.25rem] items-center justify-center border border-[#07100c]/16 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#07100c] transition hover:border-[#07100c] hover:bg-white"
                    href={handbookResource.pdf}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open PDF
                  </a>
                  <a
                    className="inline-flex min-w-[10.25rem] items-center justify-center border border-[#07100c]/16 px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#07100c] transition hover:border-[#07100c] hover:bg-white"
                    download
                    href={handbookResource.epub}
                  >
                    Download EPUB
                  </a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-black/10 bg-[#f3f0e8] text-black" id="faq">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <h2 className="text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              FAQ
            </h2>
            <p className="max-w-3xl text-lg leading-8 text-black/62 lg:justify-self-end">
              Short answers for organizations considering a local commodity
              index launch with the 1d3x platform.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <details
                className="group rounded-[1.25rem] border border-black/10 bg-white p-5 shadow-sm open:border-black/40"
                key={item.question}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-lg font-black text-black">
                  <span>{item.question}</span>
                  <span className="text-2xl font-light leading-none text-black/50 group-open:hidden">
                    +
                  </span>
                  <span className="hidden text-2xl font-light leading-none text-black/50 group-open:block">
                    -
                  </span>
                </summary>
                <p className="mt-4 text-base leading-7 text-black/58">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#050505] px-5 py-8 text-sm text-white/50 sm:px-8">
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
            <Link
              className="transition hover:text-white"
              href="/blog"
            >
              Blog
            </Link>
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

function PlatformLogo({
  className,
  variant = "white",
}: {
  className: string;
  variant?: "white" | "dark";
}) {
  return (
    <Image
      alt="1d3x"
      className={className}
      height={736}
      priority
      src={
        variant === "dark"
          ? "/brand/1d3x-logo-dark-transparent.webp"
          : "/brand/1d3x-logo-white.webp"
      }
      width={2140}
    />
  );
}
