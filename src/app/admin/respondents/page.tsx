import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addRespondentContact,
  addRespondentDirectoryEntry,
  deleteRespondentContact,
  deleteRespondentDirectoryEntry,
  getActiveRespondentCount,
  getRespondentDirectory,
  respondentEmailSchedule,
  updateRespondentContact,
  updateRespondentDirectoryEntry,
  type RespondentCollectionMode,
  type RespondentDirectoryEntry,
  type RespondentStatus,
} from "@/lib/respondent-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRespondentsPage() {
  await requireDemoRole("admin");
  const respondents = getRespondentDirectory();
  const activeCount = getActiveRespondentCount();
  const selfServiceCount = respondents.filter(
    (respondent) => respondent.collectionMode === "self_service",
  ).length;

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Respondent management
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal">
              Respondents
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Maintain respondent companies, contact people and collection mode
              for daily UGA Index price submissions.
            </p>
          </div>
          <div className="grid grid-cols-3 border border-black text-sm font-semibold">
            <Metric label="Active" value={activeCount} />
            <Metric label="Directory" value={respondents.length} />
            <Metric label="Site form" value={selfServiceCount} last />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <AddRespondentPanel />
        {respondents.map((respondent) => (
          <RespondentPanel key={respondent.id} respondent={respondent} />
        ))}
      </div>

      <SurveyNotificationSettings />
    </section>
  );
}

function Metric({
  label,
  last = false,
  value,
}: {
  label: string;
  last?: boolean;
  value: number;
}) {
  return (
    <div className={`${last ? "" : "border-r"} border-black px-4 py-3`}>
      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-black/45">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function SurveyNotificationSettings() {
  return (
    <aside className="border border-black bg-white p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            Daily email
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight">
            Survey notification settings
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
            Automatic workday email with a secure survey link for each
            self-service respondent. Manual-outreach companies remain visible
            for phone or email follow-up.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1.15fr]">
          <dl className="grid gap-3 text-sm">
            <SettingRow
              label="Status"
              value={respondentEmailSchedule.enabled ? "enabled" : "disabled"}
            />
            <SettingRow label="Workdays" value="Monday-Friday" />
            <SettingRow
              label="Send time"
              value={`${respondentEmailSchedule.sendTime} ${respondentEmailSchedule.timezone}`}
            />
            <SettingRow label="Sender" value={respondentEmailSchedule.sender} />
            <SettingRow
              label="Survey link"
              value={respondentEmailSchedule.surveyUrl}
            />
          </dl>

          <div className="border border-black bg-uga-mist p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">
              Email template
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">
              Please submit today&apos;s CPT UA Black Sea price indicatives for
              UGA Index. Open your daily survey form using the personal link in
              this email.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AddRespondentPanel() {
  return (
    <form action={addRespondentAction} className="border border-black bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.7fr_0.9fr]">
        <Field label="Company">
          <input
            className="admin-field"
            name="companyName"
            placeholder="ТОВ «Новий респондент»"
            required
          />
        </Field>
        <Field label="Status">
          <select className="admin-field" name="status" defaultValue="active">
            <option value="active">active</option>
            <option value="pending">pending</option>
          </select>
        </Field>
        <Field label="Collection">
          <select
            className="admin-field"
            name="collectionMode"
            defaultValue="self_service"
          >
            <option value="self_service">fills site form</option>
            <option value="manual_outreach">email/call required</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Field label="Contact person">
          <input className="admin-field" name="contactName" required />
        </Field>
        <Field label="Role">
          <input
            className="admin-field"
            name="contactRole"
            placeholder="Primary contact"
          />
        </Field>
        <Field label="Phone">
          <input className="admin-field" name="contactPhone" />
        </Field>
        <Field label="Notification email">
          <input className="admin-field" name="contactEmail" type="email" />
        </Field>
      </div>
      <button className="mt-4 border border-black bg-uga-dark px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white">
        Add respondent
      </button>
    </form>
  );
}

function RespondentPanel({ respondent }: { respondent: RespondentDirectoryEntry }) {
  return (
    <article className="border border-black bg-white">
      <div className="border-b border-black bg-uga-dark px-4 py-3 text-white">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-lg font-black leading-6">
              {respondent.companyName}
            </h2>
            <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/55">
              {respondent.id}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={respondent.status === "active" ? "active" : "muted"}>
              {respondent.status}
            </StatusPill>
            <StatusPill
              tone={
                respondent.collectionMode === "self_service"
                  ? "active"
                  : "warning"
              }
            >
              {respondent.collectionMode === "self_service"
                ? "fills site form"
                : "email/call required"}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-4 xl:grid-cols-[22rem_1fr]">
        <div>
          <form action={updateRespondentAction} className="grid gap-3">
            <input name="id" type="hidden" value={respondent.id} />
            <Field label="Company name">
              <input
                className="admin-field"
                defaultValue={respondent.companyName}
                name="companyName"
                required
              />
            </Field>
            <Field label="Status">
              <select
                className="admin-field"
                defaultValue={respondent.status}
                name="status"
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
              </select>
            </Field>
            <Field label="Collection mode">
              <select
                className="admin-field"
                defaultValue={respondent.collectionMode}
                name="collectionMode"
              >
                <option value="self_service">fills site form</option>
                <option value="manual_outreach">email/call required</option>
              </select>
            </Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <button className="border border-black bg-uga-green px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                Save company
              </button>
            </div>
          </form>
          <form action={deleteRespondentAction} className="mt-2">
            <input name="id" type="hidden" value={respondent.id} />
            <button className="border border-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700">
              Delete respondent
            </button>
          </form>
        </div>

        <div className="grid gap-3">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
            Contact people
          </p>
          {respondent.contacts.map((contact) => (
            <div
              className="grid gap-3 border border-black/15 p-3 lg:grid-cols-[1fr_1fr_auto]"
              key={contact.id}
            >
              <form
                action={updateContactAction}
                className="contents"
                id={`contact-${contact.id}`}
              >
                <input name="respondentId" type="hidden" value={respondent.id} />
                <input name="contactId" type="hidden" value={contact.id} />
                <Field label="Name / role">
                  <input
                    className="admin-field"
                    defaultValue={contact.name}
                    name="name"
                    required
                  />
                  <input
                    className="admin-field mt-2"
                    defaultValue={contact.role}
                    name="role"
                  />
                </Field>
                <Field label="Phone / email">
                  <input
                    className="admin-field"
                    defaultValue={contact.phone}
                    name="phone"
                  />
                  <input
                    className="admin-field mt-2"
                    defaultValue={contact.email}
                    name="email"
                    type="email"
                  />
                </Field>
                <div className="flex flex-col items-start gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
                    <input
                      className="h-4 w-4 accent-uga-green"
                      defaultChecked={contact.primary}
                      name="primary"
                      type="checkbox"
                      value="true"
                    />
                    primary
                  </label>
                  <button className="border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black">
                    Save
                  </button>
                </div>
              </form>
              <form action={deleteContactAction} className="lg:col-span-3">
                <input name="respondentId" type="hidden" value={respondent.id} />
                <input name="contactId" type="hidden" value={contact.id} />
                <button
                  className="text-xs font-black uppercase tracking-[0.12em] text-red-700"
                  disabled={respondent.contacts.length <= 1}
                >
                  Delete contact
                </button>
              </form>
            </div>
          ))}

          <form action={addContactAction} className="border border-black/25 p-3">
            <input name="respondentId" type="hidden" value={respondent.id} />
            <div className="grid gap-3 lg:grid-cols-4">
              <Field label="New contact">
                <input className="admin-field" name="name" required />
              </Field>
              <Field label="Role">
                <input className="admin-field" name="role" />
              </Field>
              <Field label="Phone">
                <input className="admin-field" name="phone" />
              </Field>
              <Field label="Email">
                <input className="admin-field" name="email" type="email" />
              </Field>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
              <input
                className="h-4 w-4 accent-uga-green"
                name="primary"
                type="checkbox"
                value="true"
              />
              make primary contact
            </label>
            <button className="ml-3 border border-black bg-uga-dark px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
              Add contact
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-black/50">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "active" | "muted" | "warning";
}) {
  const className =
    tone === "active"
      ? "admin-contrast-pill bg-uga-lime text-black"
      : tone === "warning"
        ? "admin-contrast-pill bg-white text-black"
        : "border border-white/35 text-white/70";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-black/10 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold leading-5">{value}</dd>
    </div>
  );
}

async function addRespondentAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  addRespondentDirectoryEntry({
    collectionMode: parseCollectionMode(formData.get("collectionMode")),
    companyName: readFormString(formData, "companyName"),
    contactEmail: readFormString(formData, "contactEmail"),
    contactName: readFormString(formData, "contactName"),
    contactPhone: readFormString(formData, "contactPhone"),
    contactRole: readFormString(formData, "contactRole"),
    status: parseStatus(formData.get("status")),
  });
  revalidateRespondentPages();
}

async function updateRespondentAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  updateRespondentDirectoryEntry({
    collectionMode: parseCollectionMode(formData.get("collectionMode")),
    companyName: readFormString(formData, "companyName"),
    id: readFormString(formData, "id"),
    status: parseStatus(formData.get("status")),
  });
  revalidateRespondentPages();
}

async function deleteRespondentAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  deleteRespondentDirectoryEntry(readFormString(formData, "id"));
  revalidateRespondentPages();
}

async function addContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  addRespondentContact({
    email: readFormString(formData, "email"),
    name: readFormString(formData, "name"),
    phone: readFormString(formData, "phone"),
    primary: formData.get("primary") === "true",
    respondentId: readFormString(formData, "respondentId"),
    role: readFormString(formData, "role"),
  });
  revalidateRespondentPages();
}

async function updateContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  updateRespondentContact({
    contactId: readFormString(formData, "contactId"),
    email: readFormString(formData, "email"),
    name: readFormString(formData, "name"),
    phone: readFormString(formData, "phone"),
    primary: formData.get("primary") === "true",
    respondentId: readFormString(formData, "respondentId"),
    role: readFormString(formData, "role"),
  });
  revalidateRespondentPages();
}

async function deleteContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  deleteRespondentContact({
    contactId: readFormString(formData, "contactId"),
    respondentId: readFormString(formData, "respondentId"),
  });
  revalidateRespondentPages();
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseStatus(value: FormDataEntryValue | null): RespondentStatus {
  return value === "pending" ? "pending" : "active";
}

function parseCollectionMode(
  value: FormDataEntryValue | null,
): RespondentCollectionMode {
  return value === "manual_outreach" ? "manual_outreach" : "self_service";
}

function revalidateRespondentPages() {
  revalidatePath("/admin/respondents");
  revalidatePath("/uk");
  revalidatePath("/en");
  revalidatePath("/uk/analytics");
  revalidatePath("/en/analytics");
  revalidatePath("/api/public/latest");
  revalidatePath("/api/public/history");
}
