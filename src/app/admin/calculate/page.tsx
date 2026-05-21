import { requireDemoRole } from "@/lib/demo-auth";
import {
  getAdminCalculationData,
  publishAdminIndices,
  recalculateAdminIndices,
  todayInputDate,
  type AdminCalculationCommodity,
} from "@/lib/admin-calculate";
import { SITE_CONFIG } from "@/lib/constants";
import type { IndexCalculationStatus } from "@/lib/index-calculation";

type CalculatePageProps = {
  searchParams: Promise<{
    date?: string;
    notice?: string;
  }>;
};

const statusLabels: Record<IndexCalculationStatus, string> = {
  publishable: "publishable",
  insufficient_data: "insufficient data",
  no_data: "no data",
};

const statusClasses: Record<IndexCalculationStatus, string> = {
  publishable: "admin-contrast-pill bg-uga-green text-white ring-uga-green",
  insufficient_data:
    "admin-warning-pill bg-amber-50 text-amber-800 ring-amber-200",
  no_data: "admin-warning-pill bg-red-50 text-red-700 ring-red-200",
};

const noticeText: Record<string, string> = {
  recalculated_mock:
    "Recalculation completed for the current session. Configure DATABASE_URL to persist calculation rows.",
  recalculated_database: "Calculations saved with new version numbers.",
  published_mock:
    "Publish action completed. Published values are locked in the current dev session.",
  published_database:
    "Publish action completed. PublishedIndex rows, changes, locks, and audit logs were created.",
  locked:
    "Published UGA Index values for this trade date are locked and cannot be recalculated or republished.",
};

export default async function AdminCalculatePage({
  searchParams,
}: CalculatePageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const date = params.date ?? todayInputDate();
  const data = await getAdminCalculationData(date);
  const publishableCount = data.commodities.filter(
    (commodity) =>
      commodity.status === "publishable" &&
      !commodity.published?.locked &&
      !data.lockedForPublication,
  ).length;

  async function recalculate(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await recalculateAdminIndices(formData, currentUser);
  }

  async function publish(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await publishAdminIndices(formData, currentUser);
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Admin publication workflow
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Publish UGA Index
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Review grouped index calculations for all commodities and publish
              all eligible UGA Index values in one locked publication action.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full bg-uga-mist px-3 py-1 text-uga-green">
                Source: {data.source}
              </span>
              <span className="admin-dark-pill rounded-full bg-black px-3 py-1 text-white">
                {data.basisLabel}
              </span>
              <span className="admin-dark-pill rounded-full bg-black px-3 py-1 text-white">
                Delivery {SITE_CONFIG.defaultDeliveryPeriod}
              </span>
              <span
                className={
                  data.publicationStatus === "published_locked"
                    ? "rounded-full bg-uga-lime px-3 py-1 text-black"
                    : "rounded-full border border-black/15 bg-white px-3 py-1 text-black/65"
                }
              >
                {data.publicationStatus === "published_locked"
                  ? "Published indices locked"
                  : "Indices not published"}
              </span>
            </div>
          </div>

          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="grid gap-2 text-sm font-semibold text-uga-dark">
              Trade date
              <input
                className="rounded-xl border-black/15 px-4 py-3 text-base"
                defaultValue={date}
                name="date"
                type="date"
              />
            </label>
            <button
              className="rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Load date
            </button>
          </form>
        </div>

        {params.notice ? (
          <div className="mt-5 rounded-2xl border border-uga-green/20 bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {noticeText[params.notice] ?? "Action completed."}
          </div>
        ) : null}
        {data.lockedForPublication ? (
          <div className="mt-5 border border-black bg-uga-mist px-4 py-3 text-sm font-semibold text-black/70">
            {data.lockReason}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <div className="grid gap-2 text-sm leading-6 text-black/60">
          <p>
            Benchmark is shown only as an external reference. Insufficient
            baskets are not published automatically.
          </p>
          <p className="font-semibold text-uga-dark">
            Final publication is performed for all eligible commodities in one
            action. Published dates are locked for historical review.
          </p>
        </div>
        <form action={recalculate}>
          <input name="date" type="hidden" value={date} />
          <button
            className="w-full rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:opacity-45 lg:w-auto"
            disabled={data.lockedForPublication}
            type="submit"
          >
            Recalculate
          </button>
        </form>
        <form action={publish}>
          <input name="date" type="hidden" value={date} />
          <button
            className="admin-contrast-pill w-full rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-uga-dark disabled:cursor-not-allowed disabled:bg-black/20 lg:w-auto"
            disabled={publishableCount === 0}
            type="submit"
          >
            Publish UGA Index
          </button>
        </form>
      </div>

      <div className="grid gap-5">
        {data.commodities.map((commodity) => (
          <CalculationPanel commodity={commodity} key={commodity.id} />
        ))}
      </div>
    </section>
  );
}

function CalculationPanel({
  commodity,
}: {
  commodity: AdminCalculationCommodity;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">
              {commodity.name}
            </h2>
            <span className="admin-dark-pill rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {commodity.code}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ${statusClasses[commodity.status]}`}
            >
              {statusLabels[commodity.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-black/55">
            Calculation version {commodity.version}
          </p>
        </div>

        {commodity.published?.locked ? (
          <span className="rounded-full bg-uga-lime px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black">
            published locked
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Basket respondents" value={commodity.basketRespondentCount} />
        <Metric label="Included respondents" value={commodity.usedCount} />
        <Metric label="Median" value={formatUsd(commodity.median)} />
        <Metric label="UGA Index value" value={formatUsd(commodity.value)} strong />
        <Metric
          label="Benchmark"
          value={formatUsd(commodity.spikeIndicative)}
        />
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-black/45">
            Published lock
          </h3>
          {commodity.published ? (
            <dl className="mt-3 grid gap-2 text-sm">
              <Row label="Published value" value={formatUsd(commodity.published.value)} />
              <Row
                label="Change"
                value={`${formatSignedUsd(commodity.published.changeAbs)} · ${formatSignedPercent(commodity.published.changePct)}`}
              />
              <Row label="Locked" value={commodity.published.locked ? "yes" : "no"} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-black/55">Not published for this date.</p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/10 px-4 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-black/45">
            Excluded outliers
          </h3>
        </div>
        {commodity.excluded.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-uga-dark text-xs uppercase tracking-[0.14em] text-white/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Respondent</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Deviation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {commodity.excluded.map((item) => (
                  <tr key={item.respondentId}>
                    <td className="px-4 py-3 font-semibold text-uga-dark">
                      {item.respondentName}
                    </td>
                    <td className="px-4 py-3 text-black/60">
                      {formatUsd(item.price)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-700">
                      {item.deviationPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-black/55">
            No outliers excluded by the +/-2% median rule.
          </p>
        )}
      </div>
    </article>
  );
}

function Metric({
  label,
  strong,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </p>
      <p
        className={
          strong
            ? "mt-2 text-2xl font-semibold tracking-tight text-uga-green"
            : "mt-2 text-xl font-semibold tracking-tight text-uga-dark"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-black/55">{label}</dt>
      <dd className="font-semibold text-uga-dark">{value}</dd>
    </div>
  );
}

function formatUsd(value: number | null) {
  return value === null ? "n/a" : `$${value.toFixed(1)} USD/t`;
}

function formatSignedUsd(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)} USD/t`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}
