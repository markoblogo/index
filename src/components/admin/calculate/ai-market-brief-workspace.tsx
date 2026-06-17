"use client";

import type { getAiMarketBriefAdminStatus } from "@/lib/ai-market-brief-lazy";

type AiMarketBriefProps = {
  aiStatus: Awaited<ReturnType<typeof getAiMarketBriefAdminStatus>>;
  date: string;
  regenerateAiBriefAction: (formData: FormData) => Promise<void>;
};

export function AiMarketBriefWorkspace({
  aiStatus,
  date,
  regenerateAiBriefAction,
}: AiMarketBriefProps) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-uga-green">
            AI Market Brief
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Daily stored AI summary
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
            Generated once per trade date and locale, then reused by public
            analytics and index cards. Regeneration is manual and logged with model,
            token usage, estimated cost and fallback status.
          </p>
        </div>
        <form action={regenerateAiBriefAction}>
          <input name="date" type="hidden" value={date} />
          <button
            className="rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:border-uga-green hover:bg-uga-green hover:text-black"
            type="submit"
          >
            Regenerate AI brief
          </button>
        </form>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {aiStatus.rows.length > 0 ? (
          aiStatus.rows.map((row) => (
            <div
              className="rounded-2xl border border-black/10 bg-uga-mist p-4 text-sm"
              key={row.locale}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-black px-3 py-1 text-xs font-black uppercase text-white">
                  {row.locale}
                </span>
                <span className="rounded-full bg-uga-lime px-3 py-1 text-xs font-black uppercase text-black">
                  {row.status}
                </span>
                <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-black uppercase text-black/60">
                  {row.model}
                </span>
              </div>
              <div className="mt-3 grid gap-1 text-xs font-semibold leading-5 text-black/60">
                <p>Generated: {row.generatedAt}</p>
                <p>Hash: {row.inputDataHash}</p>
                <p>
                  Tokens: {row.totalTokens ?? "n/a"} · Cost:{" "}
                  {row.estimatedCostUsd == null
                    ? "n/a"
                    : `$${row.estimatedCostUsd.toFixed(6)} est.`}
                </p>
                {row.fallbackReason ? <p>Fallback: {row.fallbackReason}</p> : null}
                {row.error ? <p className="text-red-700">Error: {row.error}</p> : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-black/10 bg-uga-mist p-4 text-sm font-semibold text-black/60 lg:col-span-2">
            No stored AI brief for this date yet.
          </p>
        )}
      </div>
    </section>
  );
}
