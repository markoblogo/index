"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { BASKET_MARKETS, BASKET_PRODUCTS } from "@/lib/basket/products";
import {
  getBasketCompare,
  getBasketHistory,
  getBasketLatest,
  getBasketMonthlyReport,
} from "@/lib/basket/data";
import type { BasketChartSeries, BasketLatestItem, BasketMarket } from "@/lib/basket/types";

export function BasketLanding({ embed = false, initialMarket = "GLOBAL" }: { embed?: boolean; initialMarket?: BasketMarket }) {
  const [market, setMarket] = useState<BasketMarket>(initialMarket);
  const latest = useMemo(() => getBasketLatest(market), [market]);
  const history = useMemo(() => getBasketHistory(market), [market]);
  const compare = useMemo(() => getBasketCompare(market), [market]);
  const report = getBasketMonthlyReport();

  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white" data-basket-site>
      <BasketStyles />
      {!embed ? <BasketHeader market={market} setMarket={setMarket} /> : null}
      <section className="relative mx-auto grid min-h-[720px] max-w-[1440px] gap-10 px-5 pb-10 pt-24 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-10">
        <div className="relative z-10 flex flex-col justify-center">
          <p className="text-sm font-semibold text-white/58">Consumer basket indices by 1D3X</p>
          <h1 className="mt-8 max-w-2xl font-black uppercase leading-[0.9] tracking-normal">
            <span className="block text-[clamp(3.4rem,6vw,6rem)]">
              1D3X <span className="text-[#ffc42e]">Basket</span>
            </span>
            <span className="mt-3 block text-[clamp(2.8rem,5.4vw,5.4rem)]">
              Consumer basket indices for the real world.
            </span>
          </h1>
          <p className="mt-7 max-w-md text-xl leading-8 text-white/78">
            Big Mac. Starbucks Latte. iPhone. Everyday prices turned into global signals.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="basket-primary-button" href="#analytics">
              Explore analytics
              <ArrowIcon />
            </a>
            <a className="basket-secondary-button" href="#methodology">
              How it works
            </a>
          </div>
          <div className="mt-7 text-xs font-semibold text-white/48">
            Independent fan project. Data sources:
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-black">
              <span className="bg-[#e61e28] px-2 py-1">The Economist</span>
              <span className="text-[#ffc42e]">McDonald&apos;s</span>
              <span className="text-[#70f2bd]">Starbucks</span>
              <span>Apple</span>
            </div>
          </div>
        </div>
        <ProductStage />
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 sm:px-8 lg:grid-cols-3 lg:px-10">
        {latest.products.map((item) => (
          <BasketIndexCard item={item} key={item.product} />
        ))}
      </section>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-8 gap-y-2 px-5 pt-4 text-xs text-white/50 sm:px-8 lg:px-10">
        <span>Baseline: United States (US)</span>
        <span>Values show USD prices and percent change vs baseline</span>
        <span>Last update: {new Date(latest.updatedAt).toUTCString()}</span>
        <span className="ml-auto">Coverage: {latest.composite.coverage.label}</span>
      </div>

      <section id="analytics" className="mx-auto mt-7 max-w-[1440px] px-5 sm:px-8 lg:px-10">
        <div className="basket-panel p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase">Analytics Lab</h2>
              <p className="mt-1 text-sm text-white/58">
                Compare consumer basket indices with currencies, commodities and SPIKE Spot Index positions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {BASKET_MARKETS.map((item) => (
                <button
                  className={`basket-chip ${market === item.id ? "basket-chip-active" : ""}`}
                  key={item.id}
                  onClick={() => setMarket(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]">
            <BasketLineChart series={history} />
            <CorrelationPanel correlations={compare.correlations} />
          </div>
          <p className="mt-4 text-xs text-white/48">Normalized to 100. Ukraine mode adds selected SPIKE Spot Index overlays.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 py-7 sm:px-8 lg:grid-cols-3 lg:px-10">
        <InfoPanel id="methodology" title="How it works" cta="Full methodology">
          <ul className="grid gap-3 text-sm leading-6 text-white/68">
            <li>Prices are collected from credited public and monitored sources.</li>
            <li>Local prices are converted to USD using daily FX rates.</li>
            <li>Each index shows price level vs US baseline and movement over time.</li>
            <li>Basket Composite averages available verified or monitored components.</li>
          </ul>
        </InfoPanel>
        <InfoPanel id="api" title="API Access" cta="API documentation">
          <ul className="grid gap-2 text-sm leading-6 text-white/68">
            <li>Latest values and history</li>
            <li>Cross-index comparison</li>
            <li>Source metadata and confidence</li>
            <li>Embeddable widgets</li>
          </ul>
          <p className="mt-4 text-xs text-white/42">Access available on request.</p>
        </InfoPanel>
        <InfoPanel id="media" title="Monthly Basket Review" cta="Read latest report">
          <p className="text-xs font-semibold uppercase text-white/45">{report.month}</p>
          <h3 className="mt-3 text-xl font-black">{report.title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/62">{report.summary}</p>
        </InfoPanel>
      </section>

      {!embed ? <BasketFooter /> : null}
    </main>
  );
}

export function BasketCardsEmbed({ market = "GLOBAL" }: { market?: BasketMarket }) {
  const latest = getBasketLatest(market);

  return (
    <main className="min-h-screen bg-[#05070d] p-4 text-white" data-basket-site>
      <BasketStyles />
      <div className="grid gap-3 md:grid-cols-3">
        {latest.products.map((item) => (
          <BasketIndexCard item={item} key={item.product} compact />
        ))}
      </div>
    </main>
  );
}

export function BasketChartEmbed({ market = "GLOBAL" }: { market?: BasketMarket }) {
  return (
    <main className="min-h-screen bg-[#05070d] p-4 text-white" data-basket-site>
      <BasketStyles />
      <div className="basket-panel p-4">
        <h1 className="mb-4 text-lg font-black uppercase">1D3X Basket Analytics</h1>
        <BasketLineChart series={getBasketHistory(market)} compact />
      </div>
    </main>
  );
}

export function BasketHeroEmbed({ market = "GLOBAL" }: { market?: BasketMarket }) {
  const latest = getBasketLatest(market);

  return (
    <main className="min-h-screen bg-[#05070d] p-5 text-white" data-basket-site>
      <BasketStyles />
      <div className="grid min-h-[520px] gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col justify-center">
          <h1 className="text-5xl font-black uppercase leading-none">
            1D3X <span className="text-[#ffc42e]">Basket</span>
          </h1>
          <p className="mt-4 max-w-sm text-lg text-white/70">Consumer basket indices for the real world.</p>
          <p className="mt-5 text-sm text-white/48">Coverage: {latest.composite.coverage.label}</p>
        </div>
        <ProductStage compact />
      </div>
    </main>
  );
}

function BasketHeader({ market, setMarket }: { market: BasketMarket; setMarket: (market: BasketMarket) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#05070d]/82 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-[1440px] items-center gap-5 px-5 py-4 sm:px-8 lg:px-10">
        <Link className="text-2xl font-black tracking-normal" href="/">
          1D3X <span className="text-[#ffc42e]">BASKET</span>
        </Link>
        <span className="hidden max-w-36 text-xs leading-4 text-white/48 md:inline">Consumer basket indices by 1D3X</span>
        <div className="ml-auto hidden items-center gap-8 text-sm font-semibold text-white/74 md:flex">
          <a href="#analytics">Analytics</a>
          <a href="#methodology">Methodology</a>
          <a href="#media">Media</a>
          <a href="#api">API</a>
          <a href="https://1d3x.com">1D3X</a>
        </div>
        <select
          aria-label="Market"
          className="rounded-lg border border-white/16 bg-black/30 px-3 py-2 text-sm font-bold text-white outline-none"
          onChange={(event) => setMarket(event.target.value as BasketMarket)}
          value={market}
        >
          {BASKET_MARKETS.map((item) => (
            <option className="bg-[#05070d]" key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </nav>
    </header>
  );
}

function ProductStage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`basket-stage ${compact ? "min-h-[420px]" : ""}`}>
      <div className="basket-glow basket-glow-gold" />
      <div className="basket-glow basket-glow-green" />
      <div className="basket-glow basket-glow-purple" />
      <div className="basket-product basket-burger">
        <div className="burger-top" />
        <div className="burger-layer burger-cheese" />
        <div className="burger-layer burger-patty" />
        <div className="burger-layer burger-lettuce" />
        <div className="burger-bottom" />
      </div>
      <div className="basket-product basket-cup">
        <div className="cup-steam" />
        <div className="cup-lid" />
        <div className="cup-body">
          <span>STAR</span>
        </div>
      </div>
      <div className="basket-product basket-phone">
        <div className="phone-camera" />
        <div className="phone-logo" />
      </div>
    </div>
  );
}

function BasketIndexCard({ item, compact = false }: { item: BasketLatestItem; compact?: boolean }) {
  const product = BASKET_PRODUCTS[item.product];
  const value = item.valueUsd === null ? "Unavailable" : item.valueUsd > 100 ? item.valueUsd.toLocaleString("en-US") : item.valueUsd.toFixed(2);
  const trend = item.changeYoY === null ? "Source pending" : `${item.changeYoY > 0 ? "+" : ""}${item.changeYoY}% vs US baseline`;

  return (
    <article className="basket-card" style={{ ["--basket-accent" as string]: product.accent }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black uppercase">{product.name}</h2>
        <span className="rounded-full border border-white/16 px-2 py-1 text-[0.65rem] font-bold uppercase text-white/50">
          {item.confidence}
        </span>
      </div>
      <div className={`mt-5 font-black tabular-nums ${compact ? "text-4xl" : "text-6xl"}`} style={{ color: product.accent }}>
        {value}
        {item.valueUsd !== null ? <span className="ml-2 text-base text-white/80">USD</span> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-white/68">{trend}</p>
      <Sparkline values={item.sparkline} color={product.accent} />
      <p className="mt-4 text-xs text-white/45">Source: {item.source.label}</p>
      {item.note ? <p className="mt-2 text-xs text-[#ffc42e]/70">{item.note}</p> : null}
    </article>
  );
}

function BasketLineChart({ series, compact = false }: { series: BasketChartSeries[]; compact?: boolean }) {
  const visible = series.slice(0, compact ? 6 : 10);
  const values = visible.flatMap((item) => item.points.map((point) => point.value));
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {visible.map((item) => (
          <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold text-white/62" key={item.id}>
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <svg className={compact ? "h-72 w-full" : "h-[28rem] w-full"} preserveAspectRatio="none" viewBox="0 0 100 100">
        {[20, 40, 60, 80].map((y) => (
          <line key={y} stroke="rgba(255,255,255,.08)" strokeWidth="0.45" vectorEffect="non-scaling-stroke" x1="0" x2="100" y1={y} y2={y} />
        ))}
        {visible.map((item) => (
          <polyline
            fill="none"
            key={item.id}
            points={toPoints(item.points.map((point) => point.value), min, max)}
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={item.id === "basket" ? "2.6" : "1.7"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}

function CorrelationPanel({ correlations }: { correlations: Array<{ id: string; label: string; correlationToBasket: number | null }> }) {
  return (
    <aside className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black uppercase">Correlation to Basket</h3>
      <div className="mt-4 grid gap-2">
        {correlations.slice(0, 8).map((item) => (
          <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 text-sm" key={item.id}>
            <span className="truncate text-white/62">{item.label}</span>
            <span className="font-black tabular-nums text-white">{item.correlationToBasket ?? "n/a"}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InfoPanel({ id, title, cta, children }: { id: string; title: string; cta: string; children: ReactNode }) {
  return (
    <article className="basket-panel p-6" id={id}>
      <h2 className="text-xl font-black uppercase">{title}</h2>
      <div className="mt-5">{children}</div>
      <button className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#ffc42e]/60 px-4 py-2 text-sm font-black text-[#ffc42e]" type="button">
        {cta}
        <ArrowIcon />
      </button>
    </article>
  );
}

function BasketFooter() {
  return (
    <footer className="mx-auto max-w-[1440px] px-5 pb-10 pt-2 text-white/48 sm:px-8 lg:px-10">
      <div className="basket-panel flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-3xl font-black text-white">1D3X</p>
          <p className="mt-2 max-w-3xl text-sm leading-6">
            1D3X Basket is an independent fan and research project. Big Mac, McDonald&apos;s, Starbucks, iPhone, Apple and The Economist are trademarks or properties of their respective owners. No partnership, sponsorship or endorsement is implied. Data for informational purposes only.
          </p>
        </div>
        <div className="flex gap-3 text-sm font-bold text-white/70">
          <a href="https://1d3x.com">About</a>
          <a href="mailto:partnerships@1d3x.com">Contact</a>
        </div>
      </div>
    </footer>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  return (
    <svg className="mt-4 h-16 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline fill="none" points={toPoints(values, Math.min(...values) - 2, Math.max(...values) + 2)} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function toPoints(values: number[], min: number, max: number) {
  const range = Math.max(max - min, 1);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 88 - ((value - min) / range) * 76;
      return `${x},${y}`;
    })
    .join(" ");
}

function BasketStyles() {
  return (
    <style jsx global>{`
      [data-basket-site] {
        background:
          radial-gradient(circle at 18% 9%, rgba(255, 196, 46, 0.18), transparent 23rem),
          radial-gradient(circle at 70% 18%, rgba(112, 242, 189, 0.15), transparent 28rem),
          radial-gradient(circle at 94% 25%, rgba(185, 108, 255, 0.22), transparent 26rem),
          #05070d;
      }
      .basket-primary-button,
      .basket-secondary-button {
        display: inline-flex;
        align-items: center;
        gap: .65rem;
        min-height: 3rem;
        border-radius: .55rem;
        padding: .75rem 1.15rem;
        font-weight: 900;
        font-size: .9rem;
      }
      .basket-primary-button { background: #ffc42e; color: #090909; }
      .basket-secondary-button { border: 1px solid rgba(255,255,255,.28); color: white; }
      .basket-panel,
      .basket-card {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: .5rem;
        background: linear-gradient(145deg, rgba(13, 21, 34, .92), rgba(5, 8, 14, .72));
        box-shadow: inset 0 1px rgba(255,255,255,.05), 0 24px 80px rgba(0,0,0,.26);
      }
      .basket-card {
        position: relative;
        overflow: hidden;
        padding: 1.55rem;
      }
      .basket-card:before {
        content: "";
        position: absolute;
        inset: auto 0 0;
        height: 46%;
        background: linear-gradient(0deg, color-mix(in srgb, var(--basket-accent) 18%, transparent), transparent);
        pointer-events: none;
      }
      .basket-chip {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: .5rem;
        padding: .55rem .85rem;
        color: rgba(255,255,255,.62);
        font-size: .8rem;
        font-weight: 800;
      }
      .basket-chip-active {
        border-color: rgba(255,196,46,.6);
        background: rgba(255,196,46,.12);
        color: #ffc42e;
      }
      .basket-stage {
        position: relative;
        min-height: 620px;
        isolation: isolate;
      }
      .basket-glow {
        position: absolute;
        border-radius: 999px;
        filter: blur(22px);
        opacity: .78;
      }
      .basket-glow-gold { width: 20rem; height: 20rem; left: 7%; top: 34%; background: rgba(255,196,46,.16); }
      .basket-glow-green { width: 22rem; height: 22rem; left: 38%; top: 20%; background: rgba(56,255,174,.13); }
      .basket-glow-purple { width: 24rem; height: 24rem; right: 1%; top: 28%; background: rgba(185,108,255,.17); }
      .basket-product {
        position: absolute;
        animation: basket-float 7s ease-in-out infinite;
        transform-style: preserve-3d;
      }
      .basket-burger { left: 4%; top: 34%; width: min(28vw, 330px); height: 220px; }
      .basket-cup { left: 39%; top: 20%; width: min(23vw, 250px); height: 360px; animation-delay: -2s; }
      .basket-phone { right: 4%; top: 25%; width: min(20vw, 230px); height: 390px; animation-delay: -4s; transform: rotate(12deg); }
      .burger-top, .burger-bottom, .burger-layer {
        position: absolute;
        left: 6%;
        right: 6%;
        border-radius: 999px;
        box-shadow: 0 18px 40px rgba(0,0,0,.45);
      }
      .burger-top { top: 4%; height: 46%; border-radius: 999px 999px 52px 52px; background: radial-gradient(circle at 35% 18%, #fff4bd 1px, transparent 3px), radial-gradient(circle at 52% 24%, #fff4bd 1px, transparent 3px), radial-gradient(circle at 68% 19%, #fff4bd 1px, transparent 3px), linear-gradient(#f4b947, #9b5218); }
      .burger-cheese { top: 46%; height: 12%; border-radius: 16px; background: #ffc42e; }
      .burger-patty { top: 54%; height: 18%; border-radius: 18px; background: linear-gradient(#4c2114, #1d0d08); }
      .burger-lettuce { top: 68%; height: 12%; border-radius: 22px; background: #83d33d; }
      .burger-bottom { top: 76%; height: 23%; border-radius: 42px 42px 999px 999px; background: linear-gradient(#d98a2b, #8d4417); }
      .cup-steam {
        position: absolute;
        left: 34%;
        top: -8%;
        width: 32%;
        height: 26%;
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(255,255,255,.45), transparent 62%);
        filter: blur(6px);
      }
      .cup-lid { position: absolute; inset: 3% 8% auto; height: 17%; border-radius: 50%; background: linear-gradient(#fff4e1, #d8bf97); }
      .cup-body {
        position: absolute;
        inset: 15% 15% 0;
        display: grid;
        place-items: center;
        color: #0f6845;
        font-weight: 900;
        border-radius: 18% 18% 30% 30%;
        background: linear-gradient(90deg, #f5e3bc, #fff4db 45%, #cdb37f);
        clip-path: polygon(8% 0, 92% 0, 78% 100%, 22% 100%);
      }
      .basket-phone {
        border-radius: 2rem;
        background: linear-gradient(135deg, #20152d, #6e527e 42%, #14131d);
        border: 2px solid rgba(255,255,255,.24);
        box-shadow: 0 30px 80px rgba(160,80,255,.28);
      }
      .phone-camera { position: absolute; left: 12%; top: 8%; width: 4.8rem; height: 4.8rem; border-radius: 1.2rem; background: radial-gradient(circle at 28% 30%, #05070d 0 12%, transparent 13%), radial-gradient(circle at 68% 30%, #05070d 0 12%, transparent 13%), radial-gradient(circle at 48% 68%, #05070d 0 12%, transparent 13%), rgba(255,255,255,.16); }
      .phone-logo { position: absolute; inset: 45% 0 auto; margin: auto; width: 3rem; height: 3rem; border-radius: 50%; background: rgba(255,255,255,.72); }
      @keyframes basket-float {
        0%, 100% { transform: translate3d(0,0,0) rotate(-2deg); }
        50% { transform: translate3d(0,-18px,0) rotate(4deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        .basket-product { animation: none !important; }
      }
      @media (max-width: 900px) {
        .basket-stage { min-height: 420px; }
        .basket-burger { left: 0; top: 30%; width: 42vw; }
        .basket-cup { left: 33%; top: 10%; width: 34vw; }
        .basket-phone { right: 0; top: 23%; width: 30vw; height: 300px; }
      }
    `}</style>
  );
}
