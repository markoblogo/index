import type { EverydayIndexDashboard as EverydayIndexDashboardData } from "@/lib/everyday-index/types";

export function EverydayIndexDashboard({
  data,
}: {
  data: EverydayIndexDashboardData;
}) {
  const primarySeries = data.chartSeries.find((series) => series.values.length > 1) ?? null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f6f1e7_0%,#f4efe6_36%,#efe8dc_100%)] text-[#17120d]">
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(193,84,31,0.14),transparent_34%),radial-gradient(circle_at_14%_18%,rgba(15,111,87,0.12),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#9b4e22]">
                day.1d3x.com
              </p>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.04em] text-[#17120d] sm:text-6xl">
                Everyday Index
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-black/68 sm:text-xl">
                Burger, latte and iPhone price signals across countries.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-black/58">
                <span className="rounded-full border border-black/12 bg-white/70 px-3 py-2">
                  Country mode default
                </span>
                <span className="rounded-full border border-black/12 bg-white/70 px-3 py-2">
                  Rebased chart mode
                </span>
                <span className="rounded-full border border-black/12 bg-white/70 px-3 py-2">
                  English only
                </span>
              </div>
            </div>

            <form className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/78 p-4 shadow-[0_20px_60px_rgba(23,18,13,0.08)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-semibold text-black/72">
                Country
                <select
                  className="min-w-[16rem] rounded-full border border-black/15 bg-white px-4 py-3 text-base font-semibold text-[#17120d] outline-none"
                  defaultValue={data.selectedCountry.iso2}
                  name="country"
                >
                  {data.countries.map((country) => (
                    <option key={country.iso2} value={country.iso2}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="inline-flex h-[3.15rem] items-center justify-center rounded-full bg-[#17120d] px-5 text-sm font-black uppercase tracking-[0.14em] text-[#f6f1e7] transition hover:bg-[#9b4e22]"
                type="submit"
              >
                Update
              </button>
            </form>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-black/62 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3">
              Selected country: <span className="font-black text-[#17120d]">{data.selectedCountry.name}</span>
            </div>
            <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3">
              Geo detection:{" "}
              <span className="font-black text-[#17120d]">
                {data.detectedCountryIso2 ?? "Unknown"}
              </span>
            </div>
            <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3">
              Preview status: <span className="font-black text-[#17120d]">{data.updatePolicy}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-5 xl:grid-cols-3">
          {data.cards.map((card) => (
            <article
              className="rounded-[1.75rem] border border-black/10 bg-white/82 p-5 shadow-[0_24px_60px_rgba(23,18,13,0.07)]"
              key={card.key}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#9b4e22]">
                    {card.title}
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#17120d]">
                    {card.localPriceLabel}
                  </p>
                  <p className="mt-1 text-sm text-black/56">{card.usdPriceLabel} USD equivalent</p>
                </div>
                <span className="rounded-full border border-black/12 bg-[#f4ede1] px-3 py-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-[#17120d]">
                  {card.statusLabel}
                </span>
              </div>

              <dl className="mt-5 grid gap-3 text-sm text-black/68">
                <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3">
                  <dt>Index vs USA / New York</dt>
                  <dd className="font-semibold text-[#17120d]">{card.indexVsUsLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3">
                  <dt>Source-defined US comparison</dt>
                  <dd className="font-semibold text-[#17120d]">
                    {card.sourceComparisonLabel ?? "Unavailable"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3">
                  <dt>Last verified</dt>
                  <dd className="font-semibold text-[#17120d]">{card.lastVerifiedLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-black/8 pt-3">
                  <dt>Confidence</dt>
                  <dd className="font-semibold text-[#17120d]">{card.confidenceLabel}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-[#f8f3ea] p-3">
                <Sparkline values={card.sparkline} />
              </div>
              <p className="mt-4 text-sm leading-6 text-black/62">{card.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <article className="rounded-[1.9rem] border border-black/10 bg-[#17120d] p-6 text-[#f6f1e7] shadow-[0_24px_70px_rgba(23,18,13,0.18)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f2b37d]">
                  Overlay chart
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Rebased to 100
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f6f1e7]/64">
                  Every selected series equals 100 on the selected start date. This keeps burger, latte, iPhone and overlay series comparable even when units differ.
                </p>
              </div>
              <div className="rounded-full border border-white/12 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#f6f1e7]/72">
                Default mode
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#211912] p-4">
              <OverlayChart series={primarySeries} />
            </div>
          </article>

          <article className="rounded-[1.9rem] border border-black/10 bg-white/82 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9b4e22]">
              Series coverage
            </p>
            <div className="mt-4 grid gap-3">
              {data.chartSeries.map((series) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-[1.1rem] border border-black/10 bg-[#fbf7f0] px-4 py-3"
                  key={series.key}
                >
                  <span className="font-semibold text-[#17120d]">{series.label}</span>
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-black/54">
                    {series.status.replaceAll("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8 lg:px-10">
        <div className="grid gap-5 xl:grid-cols-4">
          {data.rankings.map((block) => (
            <article className="rounded-[1.6rem] border border-black/10 bg-white/78 p-5" key={block.key}>
              <h2 className="text-lg font-black tracking-[-0.03em] text-[#17120d]">{block.title}</h2>
              {block.available ? (
                <div className="mt-4 grid gap-4 text-sm">
                  {block.mostExpensive ? (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9b4e22]">
                        Most expensive
                      </p>
                      <p className="mt-1 font-semibold text-[#17120d]">
                        {block.mostExpensive.country} · {block.mostExpensive.valueLabel}
                      </p>
                      <p className="text-black/56">{block.mostExpensive.note}</p>
                    </div>
                  ) : null}
                  {block.leastExpensive ? (
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f6f57]">
                        Least expensive
                      </p>
                      <p className="mt-1 font-semibold text-[#17120d]">
                        {block.leastExpensive.country} · {block.leastExpensive.valueLabel}
                      </p>
                      <p className="text-black/56">{block.leastExpensive.note}</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-black/62">{block.note}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-black/10 bg-[#f0e6d7] p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9b4e22]">
            Methodology
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {data.methodology.map((item) => (
              <article
                className="rounded-[1.35rem] border border-black/10 bg-white/68 p-5"
                key={item.title}
              >
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#17120d]">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-black/68">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10 bg-[#17120d] text-[#f6f1e7]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 text-sm sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
          <div>
            <p className="text-base font-black uppercase tracking-[0.14em]">1d3x</p>
            <p className="mt-2 max-w-3xl leading-6 text-[#f6f1e7]/68">
              Everyday Index is a 1d3x consumer-price product line under active build. Current publishing is limited to automatically verified source data; unsupported values remain visibly unavailable.
            </p>
          </div>
          <div className="text-[#f6f1e7]/62">
            <p>Sources and trademarks belong to their respective owners.</p>
            <p className="mt-2">
              No partnership with McDonald&apos;s, Starbucks, Apple, The Economist or market-data providers is implied.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center text-xs font-semibold uppercase tracking-[0.14em] text-black/38">
        No verified history yet
      </div>
    );
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
        stroke="#9b4e22"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
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
      <div className="flex h-[20rem] items-center justify-center text-sm font-semibold uppercase tracking-[0.16em] text-[#f6f1e7]/42">
        No verified overlay series yet
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
      <div className="mb-4 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.16em] text-[#f6f1e7]/62">
        <span>{series.label}</span>
        <span>{series.values[0]?.date} to {series.values.at(-1)?.date}</span>
      </div>
      <svg className="h-[18rem] w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <polyline
          fill="none"
          points={points}
          stroke="#f2b37d"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />
      </svg>
    </div>
  );
}
