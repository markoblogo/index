import { redirect } from "next/navigation";
import { WeeklyReportView } from "@/components/reports/weekly-report-view";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addWeeklySource,
  approveWeeklyReport,
  autoPrepareWeeklyReportDraft,
  buildWeeklySourceManifest,
  ensureWeeklyReport,
  generateWeeklyReportDraft,
  getWeeklyReportById,
  listWeeklyReports,
  listWeeklySources,
  publishWeeklyReport,
  saveWeeklyReportAdminInputs,
  scheduleWeeklyReportTelegram,
  sendWeeklyReportTelegramNow,
  setWeeklySourceEnabled,
  type WeeklyReportRecord,
} from "@/lib/weekly-ai-report";

type WeeklyReportPageProps = {
  searchParams: Promise<{
    notice?: string;
    reportId?: string;
    week?: string;
  }>;
};

const noticeMap: Record<string, string> = {
  approved: "Weekly report approved.",
  generated: "Weekly AI draft generated.",
  manifest: "Source/fallback block rebuilt.",
  notes_saved: "Admin notes and structured data pack saved.",
  published: "Weekly report published to the website archive.",
  report_ready: "Weekly report record created or loaded.",
  scheduled: "Telegram send scheduled for Saturday 14:00 Kyiv.",
  sent: "Weekly report sent to Telegram.",
  source_added: "Weekly source added.",
  source_toggled: "Source availability updated.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WeeklyReportAdminPage({
  searchParams,
}: WeeklyReportPageProps) {
  const currentUser = await requireDemoRole("admin");
  const params = await searchParams;
  const selectedWeek = params.week ?? getDefaultWeekEnd();
  const selectedReport =
    params.reportId && params.reportId.length > 0
      ? await getWeeklyReportById(params.reportId)
      : null;
  const [reports, report, sources] = await Promise.all([
    listWeeklyReports(),
    selectedReport ?? ensureWeeklyReport(selectedWeek, "uk"),
    selectedReport ? listWeeklySources(selectedReport.id) : Promise.resolve([]),
  ]);
  const activeReport = selectedReport ?? report;
  const activeSources = activeReport
    ? selectedReport
      ? sources
      : await listWeeklySources(activeReport.id)
    : [];
  const publicReadiness = activeReport
    ? assessWeeklyReportPublicReadiness(activeReport)
    : null;

  async function ensureReportAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    const report = await ensureWeeklyReport(week, "uk");
    redirect(
      `/admin/weekly-report?reportId=${report?.id ?? ""}&week=${week}&notice=report_ready`,
    );
  }

  async function rebuildManifestAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await buildWeeklySourceManifest(reportId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=manifest`,
    );
  }

  async function saveNotesAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await saveWeeklyReportAdminInputs(reportId, {
      manualNotes: String(formData.get("manualNotes") ?? ""),
      structuredDataPack: String(formData.get("structuredDataPack") ?? ""),
    });
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=notes_saved`,
    );
  }

  async function addSourceAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await addWeeklySource({
      language: String(formData.get("language") ?? "uk"),
      notes: String(formData.get("notes") ?? ""),
      reportId: reportId || null,
      scope: String(formData.get("scope") ?? "permanent") as
        | "permanent"
        | "one_off",
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "other") as never,
      url: String(formData.get("url") ?? ""),
    });
    const report = reportId ? await getWeeklyReportById(reportId) : null;
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=source_added`,
    );
  }

  async function toggleSourceAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    const enabled = String(formData.get("enabled") ?? "0") === "1";
    await setWeeklySourceEnabled(
      String(formData.get("sourceId") ?? ""),
      enabled,
    );
    const report = reportId ? await getWeeklyReportById(reportId) : null;
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=source_toggled`,
    );
  }

  async function generateAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await generateWeeklyReportDraft(reportId, currentUser.userId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=generated`,
    );
  }

  async function approveAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await approveWeeklyReport(reportId, currentUser.userId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=approved`,
    );
  }

  async function publishAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await publishWeeklyReport(reportId, currentUser.userId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=published`,
    );
  }

  async function scheduleTelegramAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await scheduleWeeklyReportTelegram(reportId, currentUser.userId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=scheduled`,
    );
  }

  async function sendTelegramNowAction(formData: FormData) {
    "use server";

    const reportId = String(formData.get("reportId") ?? "");
    await sendWeeklyReportTelegramNow(reportId, currentUser.userId);
    const report = await getWeeklyReportById(reportId);
    redirect(
      `/admin/weekly-report?reportId=${reportId}&week=${report?.weekEndDate ?? getDefaultWeekEnd()}&notice=sent`,
    );
  }

  async function autoPrepareAction(formData: FormData) {
    "use server";

    const week = String(formData.get("week") ?? getDefaultWeekEnd());
    await autoPrepareWeeklyReportDraft(week);
    const report = await ensureWeeklyReport(week, "uk");
    redirect(
      `/admin/weekly-report?reportId=${report?.id ?? ""}&week=${week}&notice=generated`,
    );
  }

  return (
    <section className="grid gap-6">
      <div className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Weekly market intelligence
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Weekly Report
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Build, validate, approve and publish the weekly AI-assisted
              commodity and logistics report, then prepare the three-message
              Telegram pack for Saturday distribution.
            </p>
          </div>

          <form
            className="flex flex-wrap items-end gap-3"
            action={ensureReportAction}
          >
            <label className="grid gap-2 text-sm font-semibold text-uga-dark">
              Week ending
              <input
                className="rounded-xl border-black/15 px-4 py-3 text-base"
                defaultValue={selectedWeek}
                name="week"
                type="date"
              />
            </label>
            <button
              className="rounded-full border border-black/15 px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Load week
            </button>
            <button
              className="rounded-full bg-uga-dark px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-green"
              formAction={autoPrepareAction}
              type="submit"
            >
              Auto-prepare draft
            </button>
          </form>
        </div>

        {params.notice ? (
          <div className="mt-5 rounded-2xl border border-uga-green/20 bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {noticeMap[params.notice] ?? "Action completed."}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Weekly reports
          </h2>
          <div className="mt-4 grid gap-3">
            {reports.length > 0 ? (
              reports.map((item) => (
                <a
                  className={`rounded-[1rem] border p-4 text-sm transition hover:border-uga-green ${
                    activeReport?.id === item.id
                      ? "border-uga-green bg-uga-mist"
                      : "border-black/10 bg-white"
                  }`}
                  href={`/admin/weekly-report?reportId=${item.id}&week=${item.weekEndDate}`}
                  key={item.id}
                >
                  <p className="font-black text-black">{item.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/45">
                    {item.weekEndDate} · {item.status}
                  </p>
                </a>
              ))
            ) : (
              <p className="text-sm text-black/55">
                No weekly reports stored yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Report workflow
          </h2>
          {activeReport ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                <span className="rounded-full bg-uga-mist px-3 py-1 text-uga-green">
                  Status: {activeReport.status}
                </span>
                <span className="rounded-full bg-black px-3 py-1 text-white">
                  Confidence: {activeReport.dataConfidence}
                </span>
                <span className="rounded-full border border-black/10 px-3 py-1 text-black/65">
                  Week ending {activeReport.weekEndDate}
                </span>
                <span className="rounded-full border border-black/10 px-3 py-1 text-black/65">
                  Version {activeReport.version}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <form action={rebuildManifestAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                    type="submit"
                  >
                    Auto-build source block
                  </button>
                </form>
                <form action={generateAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                    type="submit"
                  >
                    Generate AI draft
                  </button>
                </form>
                <form action={approveAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                    type="submit"
                  >
                    Approve report
                  </button>
                </form>
                <form action={publishAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-black/10 disabled:text-black/30"
                    disabled={!publicReadiness?.canPublish}
                    type="submit"
                  >
                    Publish to website
                  </button>
                </form>
                <form action={scheduleTelegramAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:border-black/10 disabled:text-black/30"
                    disabled={!publicReadiness?.canScheduleTelegram}
                    type="submit"
                  >
                    Schedule Telegram send
                  </button>
                </form>
                <form action={sendTelegramNowAction}>
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <button
                    className="rounded-full bg-uga-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-uga-green disabled:cursor-not-allowed disabled:bg-black/20"
                    disabled={!publicReadiness?.canSendTelegram}
                    type="submit"
                  >
                    Send to Telegram now
                  </button>
                </form>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <form
                  action={saveNotesAction}
                  className="grid gap-3 rounded-[1rem] border border-black/10 p-4"
                >
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <h3 className="text-base font-semibold">
                    Admin notes & structured data pack
                  </h3>
                  <label className="grid gap-2 text-sm font-semibold text-black/70">
                    Manual notes
                    <textarea
                      className="min-h-32 rounded-xl border-black/15 text-sm"
                      defaultValue={
                        activeReport.adminEditedContent?.manualNotes ?? ""
                      }
                      name="manualNotes"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-black/70">
                    Structured weekly data pack (JSON or text)
                    <textarea
                      className="min-h-32 rounded-xl border-black/15 text-sm"
                      defaultValue={
                        activeReport.adminEditedContent?.structuredDataPack ??
                        ""
                      }
                      name="structuredDataPack"
                    />
                  </label>
                  <button
                    className="w-fit rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                    type="submit"
                  >
                    Save inputs
                  </button>
                </form>

                <form
                  action={addSourceAction}
                  className="grid gap-3 rounded-[1rem] border border-black/10 p-4"
                >
                  <input
                    name="reportId"
                    type="hidden"
                    value={activeReport.id}
                  />
                  <h3 className="text-base font-semibold">Add source</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-black/70">
                      Scope
                      <select
                        className="rounded-xl border-black/15"
                        defaultValue="one_off"
                        name="scope"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="one_off">One-off</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-semibold text-black/70">
                      Type
                      <select
                        className="rounded-xl border-black/15"
                        defaultValue="logistics"
                        name="type"
                      >
                        {[
                          "index_data",
                          "logistics",
                          "export_data",
                          "futures",
                          "weather",
                          "policy",
                          "market_news",
                          "admin_note",
                          "other",
                        ].map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm font-semibold text-black/70">
                    Title
                    <input
                      className="rounded-xl border-black/15"
                      name="title"
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-black/70">
                    URL
                    <input className="rounded-xl border-black/15" name="url" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-black/70">
                    Notes
                    <textarea
                      className="min-h-24 rounded-xl border-black/15 text-sm"
                      name="notes"
                    />
                  </label>
                  <button
                    className="w-fit rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                    type="submit"
                  >
                    Add source
                  </button>
                </form>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1rem] border border-black/10 p-4">
                  <h3 className="text-base font-semibold">Sources</h3>
                  <div className="mt-3 grid gap-3">
                    {activeSources.length > 0 ? (
                      activeSources.map((source) => (
                        <div
                          className="rounded-[0.9rem] border border-black/10 p-3"
                          key={source.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-black text-black">
                                {source.title}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-black/45">
                                {source.scope} · {source.type} ·{" "}
                                {source.enabled ? "enabled" : "disabled"}
                              </p>
                            </div>
                            <form action={toggleSourceAction}>
                              <input
                                name="reportId"
                                type="hidden"
                                value={activeReport.id}
                              />
                              <input
                                name="sourceId"
                                type="hidden"
                                value={source.id}
                              />
                              <input
                                name="enabled"
                                type="hidden"
                                value={source.enabled ? "0" : "1"}
                              />
                              <button
                                className="rounded-full border border-black/15 px-3 py-1 text-xs font-semibold text-black transition hover:border-uga-green hover:text-uga-green"
                                type="submit"
                              >
                                {source.enabled ? "Disable" : "Enable"}
                              </button>
                            </form>
                          </div>
                          {source.url ? (
                            <a
                              className="mt-2 block text-sm text-uga-green underline-offset-4 hover:underline"
                              href={source.url}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              {source.url}
                            </a>
                          ) : null}
                          {source.notes ? (
                            <p className="mt-2 text-sm leading-6 text-black/60">
                              {source.notes}
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-black/55">
                        No sources attached yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1rem] border border-black/10 p-4">
                  <h3 className="text-base font-semibold">
                    Metadata & warnings
                  </h3>
                  <div className="mt-3 grid gap-3 text-sm text-black/65">
                    <p>
                      <span className="font-black text-black">AI model:</span>{" "}
                      {activeReport.aiModel ?? "not generated"}
                    </p>
                    <p>
                      <span className="font-black text-black">
                        AI generated at:
                      </span>{" "}
                      {activeReport.aiGeneratedAt ?? "n/a"}
                    </p>
                    <p>
                      <span className="font-black text-black">
                        Telegram send at:
                      </span>{" "}
                      {activeReport.telegramSendAt ?? "n/a"}
                    </p>
                    <p>
                      <span className="font-black text-black">
                        Telegram message IDs:
                      </span>{" "}
                      {activeReport.telegramMessageIds.length > 0
                        ? activeReport.telegramMessageIds.join(", ")
                        : "n/a"}
                    </p>
                    <div>
                      <p className="font-black text-black">Missing inputs</p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-black/60">
                        {(activeReport.missingInputs.length > 0
                          ? activeReport.missingInputs
                          : ["No missing-input warnings."]
                        ).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-black text-black">AI warnings</p>
                      <ul className="mt-2 list-disc pl-5 text-sm text-black/60">
                        {(activeReport.aiWarnings.length > 0
                          ? activeReport.aiWarnings
                          : ["No AI warnings."]
                          ).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                      </ul>
                    </div>
                    {publicReadiness ? (
                      <div className="rounded-[0.9rem] border border-black/10 bg-black/[0.02] p-4">
                        <p className="font-black text-black">Public readiness</p>
                        <ul className="mt-2 grid gap-2 text-sm text-black/65">
                          {publicReadiness.checklist.map((item) => (
                            <li className="flex items-start gap-2" key={item.label}>
                              <span
                                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-black ${
                                  item.ok
                                    ? "bg-uga-green text-white"
                                    : "bg-red-500 text-white"
                                }`}
                              >
                                {item.ok ? "✓" : "!"}
                              </span>
                              <span>
                                <span className="font-semibold text-black">
                                  {item.label}
                                </span>
                                <span className="block text-black/55">
                                  {item.detail}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        {publicReadiness.warnings.length > 0 ? (
                          <div className="mt-4 rounded-[0.8rem] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            <p className="font-black">Quality warnings</p>
                            <ul className="mt-2 list-disc pl-5">
                              {publicReadiness.warnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-black/55">
              Select a week to start.
            </p>
          )}
        </section>
      </div>

      {activeReport?.content ? (
        <>
          <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              Website preview
            </h2>
            <div className="mt-5 rounded-[1.35rem] border border-black/10 bg-[#050505] p-5">
              <WeeklyReportView report={activeReport} />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">
              Telegram preview
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {activeReport.content.telegramMessages.map((message, index) => (
                <article
                  className="rounded-[1rem] border border-black/10 p-4"
                  key={index}
                >
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-black/45">
                    Message {index + 1}
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-black/75">
                    {message}
                  </pre>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function getDefaultWeekEnd() {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diff = utcDay >= 6 ? utcDay - 6 : utcDay + 1;
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() - diff);
  return target.toISOString().slice(0, 10);
}

function assessWeeklyReportPublicReadiness(report: WeeklyReportRecord) {
  const content = report.content;
  const approvedForWebsite = report.status === "approved";
  const approvedForTelegram =
    report.status === "approved" ||
    report.status === "published" ||
    report.status === "telegram_scheduled" ||
    report.status === "telegram_sent";
  const textChunks = [
    report.title,
    content?.methodology ?? "",
    content?.disclaimer ?? "",
    ...(content?.executiveSummary ?? []),
    ...(content?.parts.flatMap((part) =>
      [part.title, ...part.sections.map((section) => `${section.title} ${section.body}`)],
    ) ?? []),
    ...(content?.telegramMessages ?? []),
  ];
  const text = textChunks.join(" ");
  const bannedPhrases = [
    "source-grounded",
    "datapack",
    "admin inputs",
    "framework",
    "black-box",
    "synthetic",
    "n/a",
    "tokens",
    "cost",
    "debug",
    "missing data",
  ];
  const hasBannedPhrase = bannedPhrases.some((phrase) =>
    text.toLowerCase().includes(phrase),
  );
  const mixedHeader = (content?.parts ?? []).some((part) => {
    const header = part.title;
    return /[A-Za-z]/.test(header) && /[А-ЯІЇЄҐа-яіїєґ]/.test(header);
  });
  const hasThreeParts = (content?.parts.length ?? 0) === 3;
  const hasDisclaimer = Boolean(content?.disclaimer?.trim());
  const hasSourceManifest = Boolean(report.sourceManifest);
  const hasNoNA = !(content?.telegramMessages ?? []).some((message) =>
    /n\/a/i.test(message),
  );

  return {
    canPublish:
      approvedForWebsite &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    canScheduleTelegram:
      approvedForTelegram &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    canSendTelegram:
      approvedForTelegram &&
      hasThreeParts &&
      hasDisclaimer &&
      hasSourceManifest &&
      hasNoNA &&
      !hasBannedPhrase &&
      !mixedHeader,
    checklist: [
      {
        detail: approvedForWebsite
          ? "Report is approved for website publication."
          : "Report is not approved for website publication yet.",
        label: "Approved for website",
        ok: approvedForWebsite,
      },
      {
        detail: approvedForTelegram
          ? "Report is approved for Telegram distribution."
          : "Report is not approved for Telegram distribution yet.",
        label: "Approved for Telegram",
        ok: approvedForTelegram,
      },
      {
        detail: hasSourceManifest
          ? "Source manifest is attached."
          : "Source manifest is missing.",
        label: "Has source manifest",
        ok: hasSourceManifest,
      },
      {
        detail: hasThreeParts
          ? "Three report parts are present."
          : "Expected three report parts.",
        label: "Has three parts",
        ok: hasThreeParts,
      },
      {
        detail: hasDisclaimer
          ? "Disclaimer is present."
          : "Disclaimer is missing.",
        label: "Has disclaimer",
        ok: hasDisclaimer,
      },
      {
        detail: hasNoNA
          ? "Telegram content has no n/a values."
          : "Telegram content contains n/a.",
        label: "No n/a in Telegram",
        ok: hasNoNA,
      },
      {
        detail: !hasBannedPhrase
          ? "No banned public phrases detected."
          : "Banned public phrases detected.",
        label: "No banned phrases",
        ok: !hasBannedPhrase,
      },
      {
        detail: !mixedHeader
          ? "Section headers are consistent."
          : "Mixed English/Ukrainian detected in headers.",
        label: "No mixed headers",
        ok: !mixedHeader,
      },
    ],
    warnings: [
      ...(hasBannedPhrase
        ? ["Banned public phrases detected in weekly report content."]
        : []),
      ...(hasNoNA ? [] : ["Telegram message contains n/a."]),
      ...(mixedHeader
        ? ["Mixed Ukrainian/English detected in section headers."]
        : []),
      ...(hasSourceManifest
        ? []
        : ["Source manifest is missing from the weekly report."]),
    ],
  };
}
