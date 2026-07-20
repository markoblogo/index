import Link from "next/link";
import { requireDemoRole } from "@/lib/demo-auth";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import {
  getCortexSsiIntegrityDailyReport,
  getCortexSsiIntegrityStatistics,
} from "@/lib/cortex-ssi-integrity";
import {
  getCortexEditorialMatchDiagnosticsHistory,
  type CortexEditorialMatchDiagnosticsHistoryPoint,
} from "@/lib/cortex-editorial-match-diagnostics";
import { getActiveIndexConfig } from "@/lib/index-platform";

type IntegrityPageProps = {
  searchParams: Promise<{ date?: string; kind?: string }>;
};
type MatchTrackKind = "daily" | "weekly" | "monthly";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntegrityPage({ searchParams }: IntegrityPageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const date = params.date ?? todayInputDate();
  const kind = (params.kind === "weekly" || params.kind === "monthly" ? params.kind : "daily") as MatchTrackKind;
  const tenantId = getActiveIndexConfig().id;
  const [report, statistics] = await Promise.all([
    getCortexSsiIntegrityDailyReport({ date, tenantId }),
    getCortexSsiIntegrityStatistics({ endDate: date, tenantId }),
  ]);
  const matchDiagnostics = await getCortexEditorialMatchDiagnosticsHistory({
    kind,
    tenantId,
    limit: 14,
  });

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">1D3X Cortex</p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight">SSI integrity</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Shadow-only control of respondent inputs, published snapshots and Telegram drafts. This view records findings; it does not change index values or delivery.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full bg-uga-mist px-3 py-1 text-uga-green">Shadow only</span>
              <StatusBadge status={report?.status ?? "clear"} hasReport={Boolean(report)} />
              <span className="rounded-full border border-black/15 px-3 py-1 text-black/65">14-day observation window</span>
            </div>
          </div>

          <form className="flex items-end gap-3" method="get">
            <label className="grid gap-2 text-sm font-semibold text-uga-dark">
              Trade date
              <input className="border border-black px-3 py-2 text-base" defaultValue={date} name="date" type="date" />
            </label>
            <button className="border border-black px-4 py-2 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green" type="submit">
              Load date
            </button>
          </form>
        </div>
      </div>

      <section className="border border-black bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold uppercase tracking-[0.12em]">Cortex match diagnostics</h2>
          <form className="flex items-end gap-2" method="get">
            <input name="date" type="hidden" defaultValue={date} />
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-black/60">
              Track
              <select className="border border-black px-2 py-2 text-sm" defaultValue={kind} name="kind">
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </label>
            <button className="rounded-full border border-black px-3 py-2 text-xs font-semibold hover:border-uga-green hover:text-uga-green" type="submit">
              Filter
            </button>
          </form>
        </div>
        <div className="grid gap-2">
          {matchDiagnostics.length ? (
            <MatchDiagnosticsPanel points={matchDiagnostics} />
          ) : (
            <p className="text-sm text-black/70">No editorials diagnostics yet for {kind} surface. Run daily backfill/cron to start collecting.</p>
          )}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Critical" value={report?.summary.critical ?? 0} tone="critical" />
        <Metric label="Warnings" value={report?.summary.warning ?? 0} tone="warning" />
        <Metric label="Info" value={report?.summary.info ?? 0} tone="info" />
        <Metric label="Observed runs" value={statistics.observationCount} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="border border-black bg-white">
          <div className="border-b border-black px-5 py-4">
            <h2 className="font-bold uppercase tracking-[0.12em]">Daily findings</h2>
          </div>
          {report?.findings.length ? (
            <div className="divide-y divide-black/10">
              {report.findings.map((finding, index) => (
                <div className="grid gap-2 px-5 py-4 md:grid-cols-[auto_1fr_auto] md:items-start" key={`${finding.code}:${finding.positionKey ?? "global"}:${index}`}>
                  <SeverityMark severity={finding.severity} />
                  <div>
                    <p className="font-semibold text-black">{finding.message}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-black/45">
                      {finding.code}{finding.positionKey ? ` · ${finding.positionKey}` : ""}{finding.respondentId ? ` · ${finding.respondentId}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-black/55">{finding.severity}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState date={date} />
          )}
        </div>

        <aside className="grid content-start gap-6">
          <RankedList title="Finding types" items={statistics.byType.map((item) => ({ label: item.code, value: item.count }))} />
          <RankedList title="Respondents" items={statistics.byRespondent.map((item) => ({ label: item.respondentId, value: item.count }))} />
          <RankedList title="Market positions" items={statistics.byPosition.map((item) => ({ label: item.positionKey, value: item.count }))} />
        </aside>
      </div>
    </section>
  );
}

type ReasonKey = CortexEditorialMatchDiagnosticsHistoryPoint["reasons"][number]["reason"];

const reasonCardsConfig: Array<{ label: string; reason: ReasonKey }> = [
  { label: "Unknown reason", reason: "unknown_reason" },
  { label: "Ambiguous competing posts", reason: "ambiguous_competing_posts" },
  { label: "Low lexical overlap", reason: "low_lexical_overlap" },
  { label: "Low-overlap single candidate", reason: "low_overlap_single_candidate" },
  { label: "Awaiting editorial", reason: "awaiting_editorial" },
];

function MatchDiagnosticsPanel({ points }: { points: CortexEditorialMatchDiagnosticsHistoryPoint[] }) {
  const latest = points[0];
  const previous = points[1] ?? null;
  const matchedDelta = (latest?.matchedPairs ?? 0) - (previous?.matchedPairs ?? 0);

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 text-sm md:grid-cols-4">
        <SummaryPill label="Latest coverage" value={latest.coverageRate === null ? "n/a" : `${Math.round(latest.coverageRate * 100)}%`} />
        <SummaryPill label="Latest matchedPairs" value={`${latest.matchedPairs}/${latest.reportsWithCandidatePair}`} />
        <SummaryPill
          label="MatchedPairs Δ"
          value={formatSignedDelta(matchedDelta)}
        />
        <SummaryPill label="Latest scanned reports" value={latest.scannedReports} />
      </div>
      <div className="grid gap-2 text-sm md:grid-cols-3">
        {reasonCardsConfig.map((item) => (
          <ReasonCard key={item.reason} current={latest} previous={previous} reason={item.reason} label={item.label} />
        ))}
      </div>
      <div className="overflow-hidden rounded-[1rem] border border-black/10">
        <table className="w-full table-auto text-sm">
          <thead className="bg-[#f4f4f1] text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Matched</th>
              <th className="px-3 py-2 font-semibold">Coverage</th>
              <th className="px-3 py-2 font-semibold">Scanned / Pair</th>
              <th className="px-3 py-2 font-semibold">Reason split</th>
            </tr>
          </thead>
          <tbody>
            {points.map((item) => {
              const rowUnknown = item.reasons.find((reason) => reason.reason === "unknown_reason")?.count ?? 0;
              const rowLowLexical = item.reasons.find((reason) => reason.reason === "low_lexical_overlap")?.count ?? 0;
              const rowSingle = item.reasons.find((reason) => reason.reason === "low_overlap_single_candidate")?.count ?? 0;
              const rowAmbiguous = item.reasons.find((reason) => reason.reason === "ambiguous_competing_posts")?.count ?? 0;
              const rowAwaiting = item.reasons.find((reason) => reason.reason === "awaiting_editorial")?.count ?? 0;
              return (
                <tr className="border-t border-black/10" key={`${item.generatedAt}:${item.kind}`}>
                  <td className="px-3 py-2">{new Date(item.generatedAt).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{item.matchedPairs}</td>
                  <td className="px-3 py-2">{item.coverageRate === null ? "n/a" : `${Math.round(item.coverageRate * 100)}%`}</td>
                  <td className="px-3 py-2">{item.scannedReports} / {item.reportsWithCandidatePair}</td>
                  <td className="px-3 py-2 text-xs leading-6">
                    A:{rowAwaiting} · AM:{rowAmbiguous} · U:{rowUnknown} · LO:{rowLowLexical + rowSingle}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-black/10 bg-[#f8f8f8] px-4 py-3 text-xs text-black/65">
        {previous === null
          ? "No previous row for matchedPairs delta yet."
          : `Latest matchedPairs ${matchedDelta >= 0 ? "improved" : "worsened"} by ${Math.abs(matchedDelta)} compared to previous run.`}
      </div>
    </div>
  );
}

function ReasonCard({
  current,
  label,
  previous,
  reason,
}: {
  current: CortexEditorialMatchDiagnosticsHistoryPoint;
  label: string;
  previous: CortexEditorialMatchDiagnosticsHistoryPoint | null;
  reason: ReasonKey;
}) {
  const currentCount = current.reasons.find((item) => item.reason === reason)?.count ?? 0;
  const previousCount = previous ? previous.reasons.find((item) => item.reason === reason)?.count ?? 0 : null;
  return (
    <div className="border border-black/15 bg-uga-mist px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/55">{label}</p>
      <p className="mt-1 text-xl font-black text-black">{currentCount}</p>
      <p className="mt-1 text-xs text-black/60">{previousCount === null ? "No history yet" : `Δ ${formatSignedDelta(currentCount - previousCount)}`}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-black/15 bg-uga-mist px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/55">{label}</p>
      <p className="mt-1 text-lg font-black text-black">{value}</p>
    </div>
  );
}

function formatSignedDelta(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}`;
}

function Metric({ label, tone, value }: { label: string; tone: "critical" | "warning" | "info" | "neutral"; value: number }) {
  const toneClass = tone === "critical" ? "border-red-500 bg-red-50 text-red-700" : tone === "warning" ? "border-amber-400 bg-amber-50 text-amber-800" : tone === "info" ? "border-uga-green/30 bg-uga-mist text-uga-green" : "border-black/15 bg-white text-black";
  return <div className={`border p-4 ${toneClass}`}><p className="text-xs font-bold uppercase tracking-[0.12em]">{label}</p><p className="mt-2 text-3xl font-black leading-none">{value}</p></div>;
}

function StatusBadge({ hasReport, status }: { hasReport: boolean; status: "clear" | "warning" | "critical" }) {
  if (!hasReport) return <span className="rounded-full border border-black/15 px-3 py-1 text-black/55">Awaiting observation</span>;
  const tone = status === "critical" ? "bg-red-600 text-white" : status === "warning" ? "bg-amber-400 text-black" : "bg-uga-lime text-black";
  return <span className={`rounded-full px-3 py-1 ${tone}`}>{status}</span>;
}

function SeverityMark({ severity }: { severity: "info" | "warning" | "critical" }) {
  const tone = severity === "critical" ? "bg-red-600" : severity === "warning" ? "bg-amber-400" : "bg-uga-green";
  return <span aria-label={severity} className={`mt-1 h-3 w-3 ${tone}`} />;
}

function RankedList({ items, title }: { items: Array<{ label: string; value: number }>; title: string }) {
  return (
    <section className="border border-black bg-white">
      <h2 className="border-b border-black px-4 py-3 text-xs font-bold uppercase tracking-[0.12em]">{title}</h2>
      {items.length ? <ol className="divide-y divide-black/10">{items.slice(0, 8).map((item) => <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={item.label}><span className="min-w-0 break-words font-medium">{item.label}</span><span className="shrink-0 font-black">{item.value}</span></li>)}</ol> : <p className="px-4 py-5 text-sm text-black/55">No findings in this window.</p>}
    </section>
  );
}

function EmptyState({ date }: { date: string }) {
  return <div className="px-5 py-10 text-sm leading-6 text-black/60">No Cortex integrity observation exists for {date}. It will appear after an index snapshot or daily Telegram draft passes through the shadow gate.<div className="mt-4"><Link className="font-semibold text-uga-green underline" href={`/admin/daily-inputs?date=${encodeURIComponent(date)}`}>Open daily inputs</Link></div></div>;
}
