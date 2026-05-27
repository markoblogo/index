import { requireDemoRole } from "@/lib/demo-auth";
import {
  getAdminCalculationData,
  publishAdminIndices,
  recalculateAdminIndices,
  todayInputDate,
  type AdminCalculationCommodity,
} from "@/lib/admin-calculate";
import { unlockTodayPublishedIndices } from "@/lib/admin-publication-lock";
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
  locked: `Published ${SITE_CONFIG.name} values for this trade date are locked and cannot be recalculated or republished.`,
  unlocked:
    "Published values for this trade date were unlocked. You can correct inputs and republish before midnight.",
  unlocked_empty: "There were no locked published values for this trade date.",
  unlock_unavailable: "Manual unlock is available only for the current Kyiv trade date.",
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
      isPublishableForTenant(commodity) &&
      !commodity.published?.locked &&
      !data.lockedForPublication,
  ).length;
  const showBenchmark = SITE_CONFIG.features.externalIndicative;

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

  async function unlockPublication(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await unlockTodayPublishedIndices(formData, currentUser);
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
              Publish {SITE_CONFIG.name}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Review grouped index calculations for all commodities and publish
              all eligible {SITE_CONFIG.name} values in one locked publication action.
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
                    : data.publicationStatus === "published_unlocked"
                      ? "rounded-full border border-uga-lime px-3 py-1 text-uga-lime"
                    : "rounded-full border border-black/15 bg-white px-3 py-1 text-black/65"
                }
              >
                {data.publicationStatus === "published_locked"
                  ? "Published indices locked"
                  : data.publicationStatus === "published_unlocked"
                    ? "Published indices unlocked"
                  : "Indices not published"}
              </span>
              {data.canUnlockPublication ? (
                <form action={unlockPublication}>
                  <input name="date" type="hidden" value={date} />
                  <input name="returnTo" type="hidden" value="/admin/calculate" />
                  <button
                    className="rounded-full border border-uga-lime bg-transparent px-3 py-1 text-uga-lime transition hover:bg-uga-lime hover:text-black"
                    type="submit"
                  >
                    Unlock today
                  </button>
                </form>
              ) : null}
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

      <div className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid gap-2 text-sm leading-6 text-black/60">
          <p>
            {showBenchmark
              ? "Benchmark is shown only as an external reference. Insufficient baskets are not published automatically."
              : "This tenant publishes only calculated respondent-based index values. Insufficient baskets are not published automatically."}
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
      </div>

      <form
        action={publish}
        className="rounded-[1.5rem] border border-black/10 bg-white shadow-sm"
      >
        <input name="date" type="hidden" value={date} />
        <div className="grid gap-4 border-b border-black/10 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-uga-green">
              Publication board
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              All commodity indices
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-black/60">
              Each row shows the respondent basket, included sample, median,
              calculated {SITE_CONFIG.name} value
              {showBenchmark
                ? " and benchmark reference. Optional benchmark blend averages the calculation with benchmark before publication."
                : " and publication lock status."}
            </p>
          </div>
          <button
            className="admin-contrast-pill w-full rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-uga-dark disabled:cursor-not-allowed disabled:bg-black/20 lg:w-auto"
            disabled={publishableCount === 0}
            type="submit"
          >
            Publish {SITE_CONFIG.name}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="bg-uga-dark text-xs uppercase tracking-[0.14em] text-white/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Commodity</th>
                <th className="px-4 py-3 font-semibold">Basket</th>
                <th className="px-4 py-3 font-semibold">Included</th>
                <th className="px-4 py-3 font-semibold">Median</th>
                <th className="px-4 py-3 font-semibold">{SITE_CONFIG.name}</th>
                {showBenchmark ? (
                  <>
                    <th className="px-4 py-3 font-semibold">Benchmark</th>
                    <th className="px-4 py-3 font-semibold">Blend</th>
                  </>
                ) : null}
                <th className="px-4 py-3 font-semibold">Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {data.commodities.map((commodity) => (
                <CalculationRow
                  commodity={commodity}
                  key={commodity.id}
                  showBenchmark={showBenchmark}
                />
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </section>
  );
}

function isPublishableForTenant(commodity: AdminCalculationCommodity) {
  if (commodity.value === null) {
    return false;
  }

  if (commodity.status === "publishable") {
    return true;
  }

  return (
    SITE_CONFIG.tenantId === "spike-ua" &&
    commodity.status === "insufficient_data"
  );
}

function CalculationRow({
  commodity,
  showBenchmark,
}: {
  commodity: AdminCalculationCommodity;
  showBenchmark: boolean;
}) {
  const canBlend =
    showBenchmark &&
    commodity.status === "publishable" &&
    commodity.value !== null &&
    commodity.spikeIndicative !== null &&
    !commodity.published?.locked;

  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-uga-dark">
              {commodity.name}
            </p>
            <span className="admin-dark-pill rounded-full bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              {commodity.code}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ${statusClasses[commodity.status]}`}
            >
              {statusLabels[commodity.status]}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
            Calculation version {commodity.version}
          </p>
        </td>
        <td className="px-4 py-4">
          <Metric label="Respondents" value={commodity.basketRespondentCount} />
        </td>
        <td className="px-4 py-4">
          <Metric label="Used" value={commodity.usedCount} />
        </td>
        <td className="px-4 py-4">
          <Metric label="Median" value={formatUsd(commodity.median)} />
        </td>
        <td className="px-4 py-4">
          <Metric label="Calculated" value={formatUsd(commodity.value)} strong />
        </td>
        {showBenchmark ? (
          <>
            <td className="px-4 py-4">
              <Metric label="Reference" value={formatUsd(commodity.spikeIndicative)} />
            </td>
            <td className="px-4 py-4">
              <label className="grid max-w-[14rem] gap-2 text-sm">
                <span className="flex items-center gap-2 font-semibold text-uga-dark">
                  <input
                    className="size-4 rounded-none border-black/20 text-uga-green"
                    disabled={!canBlend}
                    name="benchmarkBlendCommodityIds"
                    type="checkbox"
                    value={commodity.id}
                  />
                  Use benchmark blend
                </span>
                <span className="text-xs leading-5 text-black/55">
                  {commodity.benchmarkBlendedValue === null
                    ? "Unavailable"
                    : `Publish value if on: ${formatUsd(commodity.benchmarkBlendedValue)}`}
                </span>
              </label>
            </td>
          </>
        ) : null}
        <td className="px-4 py-4">
          {commodity.published?.locked ? (
            <div className="grid gap-2">
              <span className="w-fit rounded-full bg-uga-lime px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black">
                published locked
              </span>
              <span className="text-xs text-black/55">
                {formatUsd(commodity.published.value)}
              </span>
            </div>
          ) : (
            <span className="text-sm text-black/55">Not published</span>
          )}
        </td>
      </tr>
      {commodity.excluded.length > 0 ? (
        <tr>
          <td className="px-4 pb-4 pt-0" colSpan={showBenchmark ? 8 : 6}>
            <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              Excluded outliers:{" "}
              {commodity.excluded
                .map(
                  (item) =>
                    `${item.respondentName} ${formatUsd(item.price)} (${item.deviationPct.toFixed(2)}%)`,
                )
                .join("; ")}
            </div>
          </td>
        </tr>
      ) : null}
    </>
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
    <div className="min-w-[8rem]">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </p>
      <p
        className={
          strong
            ? "mt-1 text-lg font-semibold tracking-tight text-uga-green"
            : "mt-1 text-base font-semibold tracking-tight text-uga-dark"
        }
      >
        {value}
      </p>
    </div>
  );
}

function formatUsd(value: number | null) {
  return value === null ? "n/a" : `$${value.toFixed(1)} USD/t`;
}
