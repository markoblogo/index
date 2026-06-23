import { requireDemoRole } from "@/lib/demo-auth";
import {
  getDailyInputData,
  saveDailyInputs,
  todayInputDate,
  type DailyInputCell,
} from "@/lib/admin-daily-inputs";
import { unlockTodayPublishedIndices } from "@/lib/admin-publication-lock";
import { SITE_CONFIG } from "@/lib/constants";

type DailyInputsPageProps = {
  searchParams: Promise<{
    date?: string;
    saved?: string;
    view?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DailyInputsPage({
  searchParams,
}: DailyInputsPageProps) {
  await requireDemoRole("admin");
  const params = await searchParams;
  const date = params.date ?? todayInputDate();
  const viewMode = params.view === "detailed" ? "detailed" : "compact";
  const isCompactView = viewMode === "compact";
  const data = await getDailyInputData(date);
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const respondentKindLabel = isSpike ? "partner" : "respondent";
  const showSpikeComparison = !isSpike;
  const commodityGroups = [
    {
      key: "all-seasons",
      label: "Grains Export",
      description: "Core indices shown by default on the public site.",
      commodities: data.commodities.filter(
        (commodity) => commodity.category === "all-seasons",
      ),
      defaultOpen: true,
    },
    {
      key: "processors",
      label: "Oilseeds crush",
      description: "Domestic processing-market positions with VAT-inclusive logic.",
      commodities: data.commodities.filter(
        (commodity) => commodity.category === "processors",
      ),
      defaultOpen: true,
    },
    {
      key: "seasonal-export",
      label: "Oilseeds Export",
      description: "Seasonal export positions that expand the matrix during active trade periods.",
      commodities: data.commodities.filter(
        (commodity) => commodity.category === "seasonal-export",
      ),
      defaultOpen: false,
    },
  ].filter((group) => group.commodities.length > 0);
  const cellByKey = new Map(
    data.cells.map((cell) => [
      `${cell.commodityId}:${cell.respondentId}`,
      cell,
    ]),
  );

  async function save(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await saveDailyInputs(formData, currentUser);
  }

  async function unlockPublication(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("admin");
    await unlockTodayPublishedIndices(formData, currentUser);
  }

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Admin data entry
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal">
              Daily input matrix
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              {isSpike
                ? "Review partner submissions and enter missing values before calculation."
                : "Review respondent submissions, enter missing values and compare them with benchmark indicatives before calculation."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full bg-uga-mist px-3 py-1 text-uga-green">
                Source: {data.source}
              </span>
              <span className="admin-dark-pill rounded-full bg-black px-3 py-1 text-white">
                No publish action
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
                  ? "Published index locked"
                  : data.publicationStatus === "published_unlocked"
                    ? "Published index unlocked"
                  : "Index not published"}
              </span>
              {data.canUnlockPublication ? (
                <form action={unlockPublication}>
                  <input name="date" type="hidden" value={date} />
                  <input name="view" type="hidden" value={viewMode} />
                  <input name="returnTo" type="hidden" value="/admin/daily-inputs" />
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
                className="border border-black px-3 py-2 text-base"
                defaultValue={date}
                name="date"
                type="date"
              />
            </label>
            <input name="view" type="hidden" value={viewMode} />
            <button
              className="border border-black px-4 py-2 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Load date
            </button>
          </form>
        </div>

        {params.saved ? (
          <div className="mt-5 rounded-2xl border border-uga-green/20 bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {params.saved === "database"
              ? "Changes saved to the database and audit log entries were created."
              : params.saved === "mock"
                ? "Changes saved for the current session. Configure DATABASE_URL to persist changes and audit logs."
                : params.saved === "locked"
                  ? "This published trade date is locked. Price inputs can only be corrected on the same trade date until midnight."
                : params.saved === "unlocked"
                  ? "Published values for this trade date were unlocked. You can edit inputs and republish before midnight."
                : params.saved === "unlocked_empty"
                  ? "There were no locked published values for this trade date."
                : params.saved === "unlock_unavailable"
                  ? "Manual unlock is available only for the current Kyiv trade date."
                : "No valid prices were submitted."}
          </div>
        ) : null}
        {data.lockedForEditing ? (
          <div className="mt-5 border border-black bg-uga-mist px-4 py-3 text-sm font-semibold text-black/70">
            {data.lockReason}
          </div>
        ) : null}
      </div>

      <form action={save} className="grid gap-5">
        <input name="date" type="hidden" value={date} />
        <input name="view" type="hidden" value={viewMode} />
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {commodityGroups.map((group) => (
                <a
                  className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/65 transition hover:border-uga-green hover:text-uga-green"
                  href={`#${group.key}`}
                  key={group.key}
                >
                  {group.label} · {group.commodities.length}
                </a>
              ))}
            </div>
            <div className="inline-flex overflow-hidden rounded-full border border-black/15 bg-white p-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em]">
              <a
                className={
                  isCompactView
                    ? "rounded-full bg-uga-green px-3 py-1.5 text-white"
                    : "rounded-full px-3 py-1.5 text-black/55 transition hover:text-uga-green"
                }
                href={`/admin/daily-inputs?date=${encodeURIComponent(date)}&view=compact`}
              >
                Compact
              </a>
              <a
                className={
                  !isCompactView
                    ? "rounded-full bg-uga-dark px-3 py-1.5 text-white"
                    : "rounded-full px-3 py-1.5 text-black/55 transition hover:text-uga-green"
                }
                href={`/admin/daily-inputs?date=${encodeURIComponent(date)}&view=detailed`}
              >
                Detailed
              </a>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-black/60">
            {isCompactView
              ? "Compact view trims badge density and keeps actions in a quieter footer row."
              : "Detailed view keeps every status signal visible for audits and manual review."}
          </div>

          {commodityGroups.map((group) => (
            <details
              className="overflow-hidden border border-black bg-white"
              id={group.key}
              key={group.key}
              open={group.defaultOpen}
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-4 marker:hidden">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-uga-mist px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-uga-green">
                      {group.label}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">
                      {group.commodities.length} fields
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-black/60">{group.description}</p>
                </div>
                <span className="rounded-full border border-black/15 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-black/55">
                  Open / collapse
                </span>
              </summary>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="sticky top-0 z-20 bg-uga-dark text-white shadow-[0_10px_24px_rgba(0,0,0,0.22)]">
                    <tr>
                      <th className="sticky left-0 z-30 min-w-[17rem] border-r border-white/10 bg-uga-dark px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                        Respondent
                      </th>
                      {group.commodities.map((commodity) => (
                        <th
                          className={`${isCompactView ? "min-w-[13rem]" : "min-w-[15rem]"} border-l border-white/10 px-3 py-4 align-bottom text-xs font-semibold uppercase tracking-[0.12em] text-white/70`}
                          key={commodity.id}
                        >
                          <span className="mb-2 block text-[0.58rem] uppercase tracking-[0.18em] text-uga-lime">
                            {formatCategoryBadge(commodity.category)}
                          </span>
                          <span className="block text-sm font-semibold normal-case tracking-normal text-white">
                            {commodity.name}
                          </span>
                          <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.14em] text-white/50">
                            {commodity.code}
                          </span>
                          <span className="mt-1 block text-[0.72rem] normal-case tracking-normal text-white/42">
                            {commodity.basisLabel}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.respondents.map((respondent) => (
                      <tr className="border-t border-black/10" key={respondent.id}>
                        <th className="sticky left-0 z-10 min-w-[17rem] border-r border-black/10 bg-white px-4 py-4 align-top">
                          <p className="text-base font-semibold text-uga-dark">
                            {respondent.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                            {respondentKindLabel}
                          </p>
                        </th>
                        {group.commodities.map((commodity) => {
                          const cell = cellByKey.get(
                            `${commodity.id}:${respondent.id}`,
                          );

                          if (!cell) {
                            return (
                              <td
                                className={`${isCompactView ? "min-w-[13rem]" : "min-w-[15rem]"} border-l border-black/10 px-3 py-3`}
                                key={commodity.id}
                              />
                            );
                          }

                          return (
                            <MatrixCell
                              cell={cell}
                              compact={isCompactView}
                              key={commodity.id}
                              locked={data.lockedForEditing}
                              showSpikeComparison={showSpikeComparison}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>

        <div className="flex flex-col gap-3 border border-black bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-black/60">
            Saving updates source values and audit entries only. Publication is
            handled from a separate workflow.
          </p>
          <button
            className="rounded-[3px] bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-dark disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/45"
            disabled={data.lockedForEditing}
            type="submit"
          >
            {data.lockedForEditing ? "Locked published day" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function formatCategoryBadge(category: string) {
  if (category === "processors") {
    return "Oilseeds crush";
  }

  if (category === "seasonal-export") {
    return "Oilseeds Export";
  }

  return "Grains Export";
}

function MatrixCell({
  cell,
  compact,
  locked,
  showSpikeComparison,
}: {
  cell: DailyInputCell;
  compact: boolean;
  locked: boolean;
  showSpikeComparison: boolean;
}) {
  return (
    <td
      className={
        cell.warning && showSpikeComparison
          ? `${compact ? "min-w-[13rem]" : "min-w-[15rem]"} admin-warning-cell border-l border-black/10 bg-red-50 px-2.5 py-2.5 align-top`
          : `${compact ? "min-w-[13rem]" : "min-w-[15rem]"} border-l border-black/10 px-2.5 py-2.5 align-top`
      }
    >
      <div className={`${compact ? "grid gap-1.5" : "grid gap-2"}`}>
        <input
          aria-label={`${cell.commodityId} ${cell.respondentId} price`}
          className={
            cell.warning && showSpikeComparison
              ? `${compact ? "px-2.5 py-1.5 text-[0.95rem]" : "px-3 py-2 text-sm"} w-full border border-red-300 bg-white font-semibold text-uga-dark focus:border-red-500 focus:ring-red-500`
              : `${compact ? "px-2.5 py-1.5 text-[0.95rem]" : "px-3 py-2 text-sm"} w-full border border-black/20 bg-white font-semibold text-uga-dark focus:border-uga-green focus:ring-uga-green`
          }
          defaultValue={cell.price ?? ""}
          disabled={locked}
          inputMode="decimal"
          min="0"
          name={`price:${cell.commodityId}:${cell.respondentId}`}
          placeholder="missing"
          step="0.01"
          type="number"
        />
        <input
          name={`originalPrice:${cell.commodityId}:${cell.respondentId}`}
          type="hidden"
          value={cell.price ?? ""}
        />
        <input
          name={`originalStatus:${cell.commodityId}:${cell.respondentId}`}
          type="hidden"
          value={cell.status}
        />
        {!compact && showSpikeComparison && cell.spikeIndicative !== null ? (
          <dl className="grid gap-1 text-xs text-black/55">
            <div className="flex justify-between gap-2">
              <dt>Benchmark</dt>
              <dd className="font-semibold text-uga-dark">
                ${cell.spikeIndicative.toFixed(2)}
              </dd>
            </div>
          </dl>
        ) : null}
        <div className={`${compact ? "gap-1 pt-1.5" : "gap-1.5 pt-2"} flex flex-wrap border-t border-black/10`}>
          <SourceBadge active={cell.enteredByRespondent} label="Link" />
          <SourceBadge
            active={cell.enteredByAdmin && !cell.adminChanged}
            label="Admin"
          />
          <SourceBadge active={cell.adminChanged} label="Changed" />
          {!compact && cell.status === "missing" ? (
            <SourceBadge active={false} label="Missing" />
          ) : null}
          {cell.excluded ? <SourceBadge active label="Excluded" tone="warning" /> : null}
        </div>
        <div className="rounded-[0.9rem] border border-black/8 bg-black/[0.03] px-2.5 py-2">
          <label className="flex items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-black/50">
            <input
              className="h-4 w-4 border-black text-uga-green focus:ring-uga-green"
              defaultChecked={cell.excluded}
              disabled={locked}
              name={`exclude:${cell.commodityId}:${cell.respondentId}`}
              type="checkbox"
            />
            Exclude from index
          </label>
        </div>
        {cell.warning && showSpikeComparison ? (
          <p className="text-xs font-semibold text-red-700">
            Large deviation vs benchmark
          </p>
        ) : null}
      </div>
    </td>
  );
}

function SourceBadge({
  active,
  label,
  tone = "default",
}: {
  active: boolean;
  label: string;
  tone?: "default" | "warning";
}) {
  const activeClass =
    tone === "warning"
      ? "border-red-700 bg-red-50 text-red-700"
      : "border-uga-green bg-uga-green text-white";

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-[0.28rem] text-[0.58rem] font-black uppercase tracking-[0.12em] ${
        active ? activeClass : "border-black/15 bg-white text-black/35"
      }`}
    >
      {label}
    </span>
  );
}
