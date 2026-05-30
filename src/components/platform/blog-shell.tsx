import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const legalNotices = [
  "Index values and analytics shown through 1d3x projects are published for informational and analytical purposes only. They are not investment advice, trading advice, a public offer or a recommendation to buy or sell any commodity.",
  "Market participants remain responsible for their own commercial, trading, financial and risk-management decisions and should verify information independently before relying on it.",
  "The 1d3x landing site does not collect or process respondent price submissions. Local index projects operate their own respondent workflows and publish only aggregated outputs according to their methodologies.",
  "1d3x, project partners and technology providers are not liable for decisions, losses or damages arising from use of published index values, embeds, analytics or related materials.",
] as const;

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07100c]/95">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link className="flex h-full min-w-0 items-center gap-3 leading-none" href="/">
          <Image
            alt="1d3x"
            className="h-5 w-auto sm:h-6"
            height={736}
            priority
            src="/brand/1d3x-logo-white.png"
            width={2140}
          />
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold text-white/68 md:gap-5">
          <a className="hidden transition hover:text-white md:inline-flex" href="/#indices">
            Live indices
          </a>
          <a className="hidden transition hover:text-white md:inline-flex" href="/#methodology">
            Methodology
          </a>
          <Link className="transition hover:text-white" href="/">
            Home
          </Link>
          <Link className="transition hover:text-white" href="/blog">
            Blog
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 text-sm text-white/50 sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-8">
        <div className="grid gap-4 border-b border-white/10 pb-7 md:grid-cols-4">
          {legalNotices.map((notice) => (
            <p className="text-xs leading-5 text-white/45" key={notice}>
              {notice}
            </p>
          ))}
        </div>
        <div className="mx-auto mt-1 flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Image
              alt="1d3x"
              className="h-4 w-auto opacity-60"
              height={736}
              src="/brand/1d3x-logo-white.png"
              width={2140}
            />
            <p>Commodity index infrastructure.</p>
          </div>
          <div className="flex gap-5">
            <Link className="transition hover:text-white" href="/">
              Home
            </Link>
            <Link className="transition hover:text-white" href="/#indices">
              Live indices
            </Link>
            <Link className="transition hover:text-white" href="mailto:partnerships@1d3x.com">
              partnerships@1d3x.com
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07100c] text-white">
      <BlogHeader />
      <main>{children}</main>
      <BlogFooter />
    </div>
  );
}
