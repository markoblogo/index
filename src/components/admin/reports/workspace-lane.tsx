import type { ReactNode } from "react";
import type {
  ReportKind,
  ReportWorkspaceConfig,
  ReportWorkspaceResource,
} from "@/lib/report-workspace";

export function WorkspaceLane({
  addResourceAction,
  children,
  config,
  deleteResourceAction,
  reportId,
  resources,
  saveConfigAction,
  sectionId,
  title,
  toggleResourceAction,
}: {
  addResourceAction: (formData: FormData) => Promise<void>;
  children: ReactNode;
  config: ReportWorkspaceConfig;
  deleteResourceAction: (formData: FormData) => Promise<void>;
  reportId?: string | null;
  resources: ReportWorkspaceResource[];
  saveConfigAction: (formData: FormData) => Promise<void>;
  sectionId?: string;
  title: string;
  toggleResourceAction: (formData: FormData) => Promise<void>;
}) {
  const analysisSources = resources.filter((resource) => resource.role === "analysis_source");
  const formatReferences = resources.filter((resource) => resource.role === "format_reference");

  return (
    <section
      className="grid gap-4 rounded-[1.5rem] border border-white/12 bg-[#050505] p-5"
      id={sectionId}
    >
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">
          Configure timing, editor instructions and source pools used by the summary layer.
        </p>
      </div>

      <form
        action={saveConfigAction}
        className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4"
      >
        <input name="reportKind" type="hidden" value={config.reportKind} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Timezone" name="timezone" value={config.timezone} />
          <Field
            label="Review starts at"
            name="reviewStartsAt"
            value={config.reviewStartsAt}
          />
          <Field label="Publish at" name="publishAt" value={config.publishAt} />
        </div>
        <Area
          label="Collection window"
          name="collectionWindowLabel"
          value={config.collectionWindowLabel}
        />
        <Area
          label="Source processing notes"
          name="sourceProcessingNotes"
          value={config.sourceProcessingNotes}
        />
        <Area label="Editor prompt (UA)" name="adminPromptUk" value={config.adminPromptUk} />
        <Area label="Editor prompt (EN)" name="adminPromptEn" value={config.adminPromptEn} />
        <Area
          label="Telegram template (UA)"
          name="telegramTemplateUk"
          value={config.telegramTemplateUk}
        />
        <Area
          label="Telegram template (EN)"
          name="telegramTemplateEn"
          value={config.telegramTemplateEn}
        />
        <label className="flex items-center gap-2 text-sm text-white/78">
          <input
            className="h-4 w-4"
            defaultChecked={config.enabled}
            name="enabled"
            type="checkbox"
            value="1"
          />
          Workspace enabled
        </label>
        <button
          className="w-fit rounded-full bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#82ff4d]"
          type="submit"
        >
          Save settings
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResourceEditor
          addResourceAction={addResourceAction}
          reportId={reportId}
          reportKind={config.reportKind}
        />
        <div className="grid gap-4">
          <ResourceList
            deleteResourceAction={deleteResourceAction}
            resources={analysisSources}
            title="Analysis sources"
            toggleResourceAction={toggleResourceAction}
          />
          <ResourceList
            deleteResourceAction={deleteResourceAction}
            resources={formatReferences}
            title="Format references"
            toggleResourceAction={toggleResourceAction}
          />
        </div>
      </div>

      {children}
    </section>
  );
}

function ResourceEditor({
  addResourceAction,
  reportId,
  reportKind,
}: {
  addResourceAction: (formData: FormData) => Promise<void>;
  reportId?: string | null;
  reportKind: ReportKind;
}) {
  return (
    <form action={addResourceAction} className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <input name="reportId" type="hidden" value={reportId ?? ""} />
      <input name="reportKind" type="hidden" value={reportKind} />
      <h3 className="text-base font-semibold text-white">Add resource</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Role
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="analysis_source" name="role">
            <option value="analysis_source">Analysis source</option>
            <option value="format_reference">Format reference</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Scope
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue={reportKind === "daily" ? "permanent" : "one_off"} name="scope">
            <option value="permanent">Permanent</option>
            <option value="one_off">One-off</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Type
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="telegram_channel" name="type">
            <option value="telegram_channel">Telegram channel</option>
            <option value="website">Website</option>
            <option value="blog">Blog</option>
            <option value="file">File</option>
            <option value="note">Text note</option>
            <option value="prompt">Prompt / comment</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Language
          <select className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white" defaultValue="uk" name="language">
            <option value="uk">uk</option>
            <option value="en">en</option>
          </select>
        </label>
      </div>
      <Field label="Title" name="title" required />
      <Field label="URL / file path / identifier" name="url" />
      <Area label="Notes" name="notes" value="" />
      <button className="w-fit rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green" type="submit">
        Add resource
      </button>
    </form>
  );
}

function ResourceList({
  deleteResourceAction,
  resources,
  title,
  toggleResourceAction,
}: {
  deleteResourceAction: (formData: FormData) => Promise<void>;
  resources: ReportWorkspaceResource[];
  title: string;
  toggleResourceAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <div className="mt-3 grid gap-3">
        {resources.length > 0 ? (
          resources.map((resource) => (
            <div className="rounded-[1rem] border border-white/10 p-3" key={resource.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{resource.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                    {resource.type} · {resource.scope} · {resource.enabled ? "enabled" : "disabled"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={toggleResourceAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <input name="enabled" type="hidden" value={resource.enabled ? "0" : "1"} />
                    <button className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:border-uga-green hover:text-uga-green" type="submit">
                      {resource.enabled ? "Disable" : "Enable"}
                    </button>
                  </form>
                  <form action={deleteResourceAction}>
                    <input name="resourceId" type="hidden" value={resource.id} />
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-300 hover:text-red-100" type="submit">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
              {resource.url ? <p className="mt-2 break-all text-sm text-uga-green">{resource.url}</p> : null}
              {resource.notes ? <p className="mt-2 text-sm leading-6 text-white/62">{resource.notes}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-white/65">No resources configured yet.</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  value = "",
}: {
  label: string;
  name: string;
  required?: boolean;
  value?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-white/78">
      {label}
      <input
        className="rounded-xl border border-white/12 bg-black px-3 py-2 text-white"
        defaultValue={value}
        name={name}
        required={required}
      />
    </label>
  );
}

function Area({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-white/78">
      {label}
      <textarea
        className="min-h-24 rounded-xl border border-white/12 bg-black px-3 py-2 text-sm text-white"
        defaultValue={value}
        name={name}
      />
    </label>
  );
}
