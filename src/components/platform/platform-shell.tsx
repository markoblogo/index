import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const legalNotices = [
  {
    title: "Informational use only",
    text: "Index values, media monitoring and analytics are published for informational and analytical purposes only. They are not investment, trading or commercial advice.",
  },
  {
    title: "Independent decisions",
    text: "Market participants remain responsible for their own commercial, financial and risk-management decisions and should verify information independently.",
  },
  {
    title: "Data handling",
    text: "1d3x infrastructure separates public aggregated outputs from respondent workflows operated inside local index projects.",
  },
  {
    title: "No liability",
    text: "1d3x, project partners and technology providers are not liable for decisions, losses or damages arising from use of published content.",
  },
] as const;

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <PlatformHeader />
      {children}
      <PlatformFooter />
    </div>
  );
}

function PlatformHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07100c]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link aria-label="1d3x home" className="block" href="/">
          <PlatformLogo className="h-5 w-auto sm:h-6" />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-white/68 md:flex">
          <Link className="transition hover:text-white" href="/#indices">
            Live indices
          </Link>
          <Link className="text-[#d6ff58] transition hover:text-white" href="/media-hub">
            Media Hub
          </Link>
          <Link className="transition hover:text-white" href="/#methodology">
            Methodology
          </Link>
          <Link className="transition hover:text-white" href="/#partners">
            Partners
          </Link>
          <Link className="transition hover:text-white" href="/blog">
            Blog
          </Link>
        </nav>
        <Link
          className="border border-white/25 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition hover:border-[#d6ff58] hover:text-[#d6ff58]"
          href="/#contact"
        >
          Contact
        </Link>
      </div>
    </header>
  );
}

function PlatformFooter() {
  return (
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
        <div className="flex flex-wrap gap-5">
          <Link className="transition hover:text-white" href="/blog">
            Blog
          </Link>
          <a className="transition hover:text-white" href="https://uga.1d3x.com">
            UGA Index
          </a>
          <a className="transition hover:text-white" href="https://spike.1d3x.com">
            SPIKE SPOT INDEX
          </a>
        </div>
      </div>
    </footer>
  );
}

function PlatformLogo({ className }: { className: string }) {
  return (
    <Image
      alt="1d3x"
      className={className}
      height={736}
      priority
      src="/brand/1d3x-logo-white.webp"
      width={2140}
    />
  );
}
