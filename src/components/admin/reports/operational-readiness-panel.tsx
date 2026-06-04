export function OperationalReadinessPanel({
  items,
  warnings,
}: {
  items: Array<{ detail: string; label: string; ok: boolean }>;
  warnings: string[];
}) {
  return (
    <section className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Operational readiness</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          This shows whether the current environment can actually collect sources,
          generate reports and send Telegram output.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article
            className="rounded-[1rem] border border-white/10 bg-black/30 p-4"
            key={item.label}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{item.label}</h3>
              <span
                className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                  item.ok
                    ? "bg-uga-green/15 text-uga-green"
                    : "bg-amber-400/15 text-amber-200"
                }`}
              >
                {item.ok ? "ready" : "blocked"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/68">{item.detail}</p>
          </article>
        ))}
      </div>
      {warnings.length > 0 ? (
        <div className="rounded-[1rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
