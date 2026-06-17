import type { EverydayIndexDashboard as EverydayIndexDashboardData } from "@/lib/everyday-index/types";

const PERIOD_OPTIONS = ["1M", "3M", "1Y", "All"] as const;
const MODE_OPTIONS = ["Rebased to 100", "USD", "Local", "% change"] as const;

export function EverydayIndexDashboard({
  data,
}: {
  data: EverydayIndexDashboardData;
}) {
  const primarySeries = data.chartSeries.find((series) => series.values.length > 1) ?? null;
  const burgerRanking = data.rankings.find((block) => block.key === "burger") ?? null;
  const methodology = buildMethodologyCards(data);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070909] text-[#f3f1e8]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(243,255,86,0.08),transparent_30%),radial-gradient(circle_at_20%_20%,rgba(0,197,167,0.08),transparent_28%),linear-gradient(180deg,#070909_0%,#090b0c_48%,#050607_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="fixed inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(transparent_0%,rgba(255,255,255,0.28)_50%,transparent_100%)] [background-size:100%_5px]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070909]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <a className="text-sm font-black uppercase tracking-[0.28em] text-white" href="#top">
              1d3x / Everyday Index
            </a>
            <span className="rounded-full border border-[#f3ff56]/30 bg-[#f3ff56]/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#f3ff56]">
              Preview
            </span>
          </div>

          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-[0.18em] text-white/58 md:flex">
            <a className="transition hover:text-white" href="#indices">
              Indices
            </a>
            <a className="transition hover:text-white" href="#dynamics">
              Dynamics
            </a>
            <a className="transition hover:text-white" href="#methodology">
              Methodology
            </a>
            <a className="transition hover:text-white" href="#contact">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <section className="relative min-h-[calc(100svh-4.5rem)]" id="top">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.34em] text-[#f3ff56]/76">
                day.1d3x.com
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                Consumer prices on a dark live board.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/62 sm:text-lg">
                Everyday Index is a one-page public preview for verified burger, latte and
                iPhone price signals. Only published values go live. Unsupported products stay
                visibly pending.
              </p>
            </div>

            <form
              className="flex flex-wrap items-end gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
              id="contact"
            >
              <div className="grid gap-1">
                <span className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/44">
                  Country
                </span>
                <span className="text-2xl font-black tracking-[-0.04em] text-white">
                  {data.selectedCountry.name}
                </span>
              </div>
              <label className="sr-only" htmlFor="everyday-country">
                Change country
              </label>
              <select
                className="min-w-[14rem] rounded-full border border-white/12 bg-black/40 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-[#f3ff56]/50"
                defaultValue={data.selectedCountry.iso2}
                id="everyday-country"
                name="country"
              >
                {data.countries.map((country) => (
                  <option key={country.iso2} value={country.iso2}>
                    {country.name}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex h-[3.1rem] items-center justify-center rounded-full bg-[#f3ff56] px-5 text-sm font-black uppercase tracking-[0.16em] text-[#070909] transition hover:bg-[#fbff9a]"
                type="submit"
              >
                Change
              </button>
            </form>
          </div>

          <div className="grid gap-4 lg:min-h-[68svh] lg:grid-cols-3" id="indices">
            {data.cards.map((card) => (
              <IndexPanel card={card} key={card.key} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14" id="dynamics">
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d1010] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
            <div className="border-b border-white/10 px-6 py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.26em] text-[#f3ff56]/78">
                    Index dynamics
                  </p>
                  <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl">
                    Compare verified series in rebased-to-100 mode.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                    Rebased mode makes series with different units comparable.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {PERIOD_OPTIONS.map((option) => (
                    <span
                      className={`rounded-full border px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                        option === "All"
                          ? "border-[#f3ff56]/40 bg-[#f3ff56]/12 text-[#f3ff56]"
                          : "border-white/10 bg-white/[0.03] text-white/54"
                      }`}
                      key={option}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {MODE_OPTIONS.map((option) => (
                  <span
                    className={`rounded-full border px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                      option === "Rebased to 100"
                        ? "border-[#00d3b2]/40 bg-[#00d3b2]/10 text-[#93fff0]"
                        : "border-white/10 bg-white/[0.03] text-white/54"
                    }`}
                    key={option}
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,#0e1111_0%,#090b0c_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <OverlayChart series={primarySeries} />
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/46">
              Series toggles
            </p>
            <div className="mt-5 grid gap-3">
              {data.chartSeries.map((series) => (
                <div
                  className={`flex items-center justify-between gap-4 rounded-[1.15rem] border px-4 py-3 ${
                    series.status === "verified"
                      ? "border-[#f3ff56]/22 bg-[#f3ff56]/8 text-white"
                      : "border-white/8 bg-black/18 text-white/54"
                  }`}
                  key={series.key}
                >
                  <span className="font-semibold">{series.label}</span>
                  <span
                    className={`text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                      series.status === "verified" ? "text-[#f3ff56]" : "text-white/38"
                    }`}
                  >
                    {series.status === "verified" ? "Live" : "Soon"}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/46">
                Rankings
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white">
                Published cross-country view.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/56">
              Rankings appear only after verified values are published. Latte and iPhone stay off
              until their source automation exists.
            </p>
          </div>

          {burgerRanking?.available ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <RankingPanel
                item={burgerRanking.mostExpensive}
                keyLabel="Most expensive burger"
                tone="warm"
              />
              <RankingPanel
                item={burgerRanking.leastExpensive}
                keyLabel="Least expensive burger"
                tone="cool"
              />
            </div>
          ) : (
            <div className="mt-6 rounded-[1.6rem] border border-dashed border-white/12 bg-black/18 px-6 py-10 text-center">
              <p className="font-mono text-3xl font-black uppercase tracking-[0.22em] text-[#f3ff56]">
                STANDBY
              </p>
              <p className="mt-3 text-sm leading-6 text-white/56">
                Rankings will appear after verified values are published.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10" id="methodology">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/46">
              Methodology
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-4xl">
              Public rules, before polish.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-white/58">
            The preview keeps consumer price definitions strict, withholds unsupported references,
            and avoids implied automation that does not exist yet.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {methodology.map((item) => (
            <article
              className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
              key={item.title}
            >
              <h3 className="text-lg font-black uppercase tracking-[0.02em] text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/62">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050606]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div>
            <p className="text-base font-black uppercase tracking-[0.18em] text-white">1d3x</p>
            <p className="mt-3 max-w-3xl leading-6 text-white/58">
              Everyday Index is a 1d3x consumer-price preview under active build. Current public
              output is limited to verified source data and intentionally honest pending states.
            </p>
          </div>
          <div className="text-white/52">
            <p>Sources and trademarks belong to their respective owners.</p>
            <p className="mt-2">
              No partnership with McDonald&apos;s, Starbucks, Apple, The Economist or market-data
              providers is implied.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function IndexPanel({
  card,
}: {
  card: EverydayIndexDashboardData["cards"][number];
}) {
  const state = getPanelState(card);

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#101314_0%,#090b0b_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,255,86,0.08),transparent_36%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/28 to-transparent" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-black uppercase tracking-[0.24em] text-white/48">
              {card.title}
            </p>
            <p className="mt-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/34">
              {state.unit}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-[0.64rem] font-black uppercase tracking-[0.16em] ${
              state.tone === "live"
                ? "border-[#00d3b2]/34 bg-[#00d3b2]/10 text-[#8ef8e6]"
                : "border-[#f3ff56]/20 bg-[#f3ff56]/10 text-[#f3ff56]"
            }`}
          >
            {state.badge}
          </span>
        </div>

        <div className="mt-8 flex min-h-[15rem] items-center justify-center">
          <PanelIllustration kind={card.key} />
        </div>

        <div className="mt-auto">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="font-mono text-[clamp(3.2rem,8vw,5.8rem)] font-black uppercase leading-none tracking-[0.08em] text-[#f3ff56] [text-shadow:0_0_22px_rgba(243,255,86,0.22)]">
              {state.display}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/62">{state.caption}</div>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/18 p-4">
            {state.sparkline ? (
              <Sparkline values={card.sparkline} />
            ) : (
              <div className="flex h-20 items-center justify-center text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/30">
                {state.sparklineLabel}
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm leading-6 text-white/54">
            <p>{state.note}</p>
            <p className="text-white/38">{state.source}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function RankingPanel({
  item,
  keyLabel,
  tone,
}: {
  item: EverydayIndexDashboardData["rankings"][number]["mostExpensive"];
  keyLabel: string;
  tone: "warm" | "cool";
}) {
  return (
    <div
      className={`rounded-[1.6rem] border p-5 ${
        tone === "warm"
          ? "border-[#f3ff56]/16 bg-[#f3ff56]/7"
          : "border-[#00d3b2]/16 bg-[#00d3b2]/7"
      }`}
    >
      <p className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-white/44">
        {keyLabel}
      </p>
      <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">
        {item?.country ?? "Pending"}
      </p>
      <p
        className={`mt-2 font-mono text-4xl font-black uppercase tracking-[0.1em] ${
          tone === "warm" ? "text-[#f3ff56]" : "text-[#93fff0]"
        }`}
      >
        {item?.valueLabel ?? "--"}
      </p>
      <p className="mt-3 text-sm leading-6 text-white/54">
        {item?.note ?? "Published burger rankings will appear here after the first verified release."}
      </p>
    </div>
  );
}

function PanelIllustration({
  kind,
}: {
  kind: EverydayIndexDashboardData["cards"][number]["key"];
}) {
  if (kind === "burger") {
    return (
      <svg className="h-44 w-44" viewBox="0 0 220 220">
        <ellipse cx="110" cy="188" fill="rgba(243,255,86,0.12)" rx="72" ry="16" />
        <path d="M54 118h112c0 14-9 27-22 31H76c-13-4-22-17-22-31Z" fill="#f2bd53" />
        <path d="M64 109c15-11 27-14 46-14 17 0 31 2 46 14l-8 11H72l-8-11Z" fill="#4caf70" />
        <rect fill="#6e361d" height="11" rx="5.5" width="96" x="62" y="98" />
        <path d="M57 95c5-30 27-47 53-47 26 0 48 17 53 47H57Z" fill="#f0a553" />
        <circle cx="88" cy="68" fill="#fff0bd" r="3" />
        <circle cx="116" cy="61" fill="#fff0bd" r="3" />
        <circle cx="138" cy="72" fill="#fff0bd" r="3" />
      </svg>
    );
  }

  if (kind === "latte") {
    return (
      <svg className="h-44 w-44" viewBox="0 0 220 220">
        <ellipse cx="104" cy="186" fill="rgba(243,255,86,0.12)" rx="64" ry="15" />
        <path d="M76 62h76v82c0 19-15 34-34 34h-8c-19 0-34-15-34-34V62Z" fill="#ddd1bb" />
        <path d="M76 78h76v55H76Z" fill="#8b5632" />
        <path d="M88 54h52c9 0 16 7 16 16v8H72v-8c0-9 7-16 16-16Z" fill="#f0e5d4" />
        <path d="M151 88h14c11 0 19 8 19 19s-8 19-19 19h-9" fill="none" stroke="#ddd1bb" strokeWidth="12" />
        <path d="M101 94c8-11 27-11 35 0-8 9-27 9-35 0Z" fill="none" stroke="#f0e5d4" strokeWidth="5" />
        <path d="M84 46c0-10 8-18 18-18" fill="none" stroke="#f3ff56" strokeLinecap="round" strokeWidth="4" />
        <path d="M112 40c0-9 7-16 16-16" fill="none" stroke="#f3ff56" strokeLinecap="round" strokeWidth="4" />
      </svg>
    );
  }

  return (
    <svg className="h-44 w-44" viewBox="0 0 220 220">
      <ellipse cx="110" cy="188" fill="rgba(243,255,86,0.12)" rx="58" ry="14" />
      <rect fill="#1a1e22" height="118" rx="24" width="78" x="71" y="44" />
      <rect fill="#0d1115" height="96" rx="17" width="62" x="79" y="55" />
      <rect fill="#f3ff56" height="14" opacity="0.16" rx="7" width="30" x="95" y="168" />
      <circle cx="110" cy="61" fill="#252b31" r="3" />
      <path d="M95 92h30M95 108h30M95 124h30" stroke="#f3ff56" strokeLinecap="round" strokeWidth="6" />
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((value - min) / (max - min)) * 100;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-20 w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <polyline
        fill="none"
        points={points}
        stroke="#f3ff56"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3.4"
      />
    </svg>
  );
}

function OverlayChart({
  series,
}: {
  series: EverydayIndexDashboardData["chartSeries"][number] | null;
}) {
  if (!series || series.values.length < 2) {
    return (
      <div className="flex h-[22rem] flex-col items-center justify-center text-center">
        <p className="font-mono text-4xl font-black uppercase tracking-[0.24em] text-[#f3ff56]">
          LOCKED
        </p>
        <p className="mt-3 max-w-md text-sm leading-6 text-white/56">
          The chart will unlock after the first verified Burger import.
        </p>
      </div>
    );
  }

  const values = series.values.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = series.values
    .map((point, index) => {
      const x = (index / (series.values.length - 1)) * 100;
      const y = max === min ? 50 : 100 - ((point.value - min) / (max - min)) * 100;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/42">
        <span>{series.label}</span>
        <span>
          {series.values[0]?.date} to {series.values.at(-1)?.date}
        </span>
      </div>
      <svg className="h-[20rem] w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="everyday-chart-glow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f3ff56" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#00d3b2" stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          points={points}
          stroke="url(#everyday-chart-glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

function getPanelState(card: EverydayIndexDashboardData["cards"][number]) {
  if (card.key === "burger" && card.realData) {
    return {
      badge: "Verified",
      caption: `${card.usdPriceLabel} · ${card.lastVerifiedLabel}`,
      display: card.localPriceLabel,
      note: card.note,
      source: "Source-defined Big Mac dataset",
      sparkline: card.sparkline.length > 1,
      sparklineLabel: "Mini history",
      tone: "live" as const,
      unit: "Consumer paid retail price",
    };
  }

  if (card.key === "burger") {
    return {
      badge: "Pending",
      caption: "Awaiting first verified import",
      display: "PENDING",
      note: "Burger publishing stays on hold until the first verified persisted import is available for the selected country.",
      source: "Source-defined Big Mac dataset. Not a New York retail reference.",
      sparkline: false,
      sparklineLabel: "Awaiting first verified import",
      tone: "pending" as const,
      unit: "Verified price board",
    };
  }

  if (card.key === "latte") {
    return {
      badge: "Soon",
      caption: "Official menu source adapter in progress",
      display: "SOON",
      note: "Latte stays deliberately offline until official menu source automation is verified.",
      source: "No public latte values are being published in this preview.",
      sparkline: false,
      sparklineLabel: "Official source adapter in progress",
      tone: "pending" as const,
      unit: "Official menu source",
    };
  }

  return {
    badge: "Soon",
    caption: "Retail price parser in progress",
    display: "SOON",
    note: "iPhone stays deliberately offline until a consumer-paid retail parser is validated.",
    source: "No retail iPhone values are being published in this preview.",
    sparkline: false,
    sparklineLabel: "Retail parser in progress",
    tone: "pending" as const,
    unit: "Consumer retail parser",
  };
}

function buildMethodologyCards(data: EverydayIndexDashboardData) {
  const byTitle = new Map(data.methodology.map((item) => [item.title, item.body]));

  return [
    {
      title: "What we measure",
      body:
        byTitle.get("Product definition") ??
        "Everyday Index tracks consumer-paid retail pricing across burger, latte and iPhone reference products.",
    },
    {
      title: "Price basis",
      body:
        byTitle.get("Price basis and FX") ??
        "Price basis is consumer paid retail price in local currency and, where supported, USD equivalent.",
    },
    {
      title: "Source hierarchy",
      body:
        byTitle.get("Source hierarchy") ??
        "Structured datasets come first, official brand sources second, and unsupported products remain pending.",
    },
    {
      title: "US/New York reference rule",
      body:
        byTitle.get("US/New York rule") ??
        "A real New York, NY retail reference is required before USA comparisons can be published.",
    },
    {
      title: "Publishing status",
      body: `${data.updatePolicy} ${byTitle.get("Confidence and publishing") ?? ""}`.trim(),
    },
    {
      title: "Credits and trademarks",
      body:
        "No partnership with McDonald's, Starbucks, Apple or The Economist is implied. The Economist Big Mac dataset remains source-defined and must not be mislabeled as a New York retail reference.",
    },
  ];
}
