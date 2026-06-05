import { redirect } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import { requireDemoRole } from "@/lib/demo-auth";
import { listUnifiedMediaHubRegistry } from "@/lib/media-hub-monitoring";
import {
  addReportWorkspaceResource,
  deleteReportWorkspaceResource,
  setReportWorkspaceResourceEnabled,
} from "@/lib/report-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMediaHubSourcesPage() {
  await requireDemoRole("admin");

  if (SITE_CONFIG.tenantId !== "spike-ua") {
    redirect("/admin/daily-inputs");
  }

  const registry = await listUnifiedMediaHubRegistry();

  async function addSourceAction(formData: FormData) {
    "use server";

    const windows = formData.getAll("windows").map(String);
    const role = String(formData.get("role") ?? "analysis_source") as
      | "analysis_source"
      | "format_reference"
      | "both";
    const common = {
      language: String(formData.get("language") ?? "uk"),
      notes: String(formData.get("notes") ?? ""),
      role,
      scope: String(formData.get("scope") ?? "permanent") as "permanent" | "one_off",
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") ?? "telegram_channel") as never,
      url: String(formData.get("url") ?? ""),
    };

    if (windows.includes("day")) {
      await addReportWorkspaceResource({
        ...common,
        reportId: null,
        reportKind: "daily",
      });
    }
    if (windows.includes("week")) {
      await addReportWorkspaceResource({
        ...common,
        reportId: null,
        reportKind: "weekly",
      });
    }

    redirect("/admin/media-hub/sources");
  }

  async function toggleAction(formData: FormData) {
    "use server";

    await setReportWorkspaceResourceEnabled(
      String(formData.get("resourceId") ?? ""),
      String(formData.get("enabled") ?? "0") === "1",
    );
    redirect("/admin/media-hub/sources");
  }

  async function deleteAction(formData: FormData) {
    "use server";

    await deleteReportWorkspaceResource(String(formData.get("resourceId") ?? ""));
    redirect("/admin/media-hub/sources");
  }

  return (
    <section className="grid gap-6">
      <header className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-6 shadow-2xl shadow-black/20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
          1D3X Media Hub
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Unified Source Registry
        </h1>
        <p className="mt-3 max-w-5xl text-sm leading-6 text-white/68">
          One registry across the day and 7-day windows, ready to become the same
          registry for the 30-day layer. This is the operational place to add,
          remove and classify informational and format-reference sources.
        </p>
      </header>

      <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
        <h2 className="text-lg font-semibold text-white">Add source</h2>
        <form action={addSourceAction} className="mt-4 grid gap-4 xl:grid-cols-2">
          <label className="grid gap-2 text-sm text-white/72">
            <span>Title</span>
            <input
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="title"
              placeholder="@source_handle or source title"
              required
              type="text"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            <span>URL / handle</span>
            <input
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="url"
              placeholder="https://... or @channel"
              type="text"
            />
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            <span>Type</span>
            <select
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="type"
            >
              <option value="telegram_channel">Telegram channel</option>
              <option value="website">Website</option>
              <option value="blog">Blog</option>
              <option value="file">File</option>
              <option value="note">Text note</option>
              <option value="prompt">Prompt</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            <span>Role</span>
            <select
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="role"
            >
              <option value="analysis_source">Informational</option>
              <option value="format_reference">Format reference</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            <span>Language</span>
            <select
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="language"
            >
              <option value="uk">Ukrainian</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72">
            <span>Scope</span>
            <select
              className="rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="scope"
            >
              <option value="permanent">Permanent</option>
              <option value="one_off">One-off</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-white/72 xl:col-span-2">
            <span>Notes</span>
            <textarea
              className="min-h-24 rounded-[0.9rem] border border-white/12 bg-black/30 px-4 py-3 text-white outline-none"
              name="notes"
              placeholder="Peer ID, parser notes, editorial context..."
            />
          </label>
          <fieldset className="grid gap-2 text-sm text-white/72 xl:col-span-2">
            <legend>Windows</legend>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2">
                <input defaultChecked name="windows" type="checkbox" value="day" />
                <span>Day</span>
              </label>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2">
                <input defaultChecked name="windows" type="checkbox" value="week" />
                <span>7 Days</span>
              </label>
            </div>
          </fieldset>
          <div className="xl:col-span-2">
            <button
              className="rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]"
              type="submit"
            >
              Add source
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[1.5rem] border border-white/12 bg-[#050505] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Registry entries</h2>
          <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/54">
            {registry.length} grouped entries
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {registry.map((resource) => (
            <article
              className="rounded-[1rem] border border-white/10 bg-black/20 p-4"
              key={`${resource.id}-${resource.title}-${resource.url}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{resource.title}</h3>
                    <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-white/66">
                      {resource.type}
                    </span>
                    <span className="rounded-full bg-uga-green/15 px-2.5 py-1 text-xs font-semibold text-uga-green">
                      {resource.role === "analysis_source" ? "informational" : "format"}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/54">
                      {resource.windows.join(" + ")}
                    </span>
                  </div>
                  {resource.url ? (
                    <p className="mt-2 text-sm leading-6 text-white/62">{resource.url}</p>
                  ) : null}
                  {resource.notes ? (
                    <p className="mt-2 text-sm leading-6 text-white/54">{resource.notes}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={toggleAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <input name="enabled" type="hidden" value="0" />
                    <button
                      className="rounded-full border border-white/14 px-3 py-1.5 text-xs font-semibold text-white/72 transition hover:border-amber-300 hover:text-amber-100"
                      type="submit"
                    >
                      Disable row
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <button
                      className="rounded-full border border-rose-400/30 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:border-rose-300"
                      type="submit"
                    >
                      Delete row
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
