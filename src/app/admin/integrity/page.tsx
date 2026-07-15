import Link from "next/link";
import { requireDemoRole } from "@/lib/demo-auth";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import {
  getCortexSsiIntegrityDailyReport,
  getCortexSsiIntegrityStatistics,
} from "@/lib/cortex-ssi-integrity";
import { getActiveIndexConfig } from "@/lib/index-platform";

type IntegrityPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function IntegrityPage({ searchParams }: IntegrityPageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const date = params.date ?? todayInputDate();
  const tenantId = getActiveIndexConfig().id;
  const [report, statistics] = await Promise.all([
    getCortexSsiIntegrityDailyReport({ date, tenantId }),
    getCortexSsiIntegrityStatistics({ endDate: date, tenantId }),
  ]);

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
