import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { requireDemoRole } from "@/lib/demo-auth";
import {
  addRespondentContactData,
  addRespondentDirectoryEntryData,
  deleteRespondentContactData,
  deleteRespondentDirectoryEntryData,
  getActiveRespondentCountData,
  getRespondentDirectoryData,
  getRespondentEmailScheduleData,
  regenerateRespondentTemporaryPasswordData,
  updateRespondentEmailScheduleData,
  updateRespondentContactData,
  updateRespondentAuthAccountData,
  updateRespondentDirectoryEntryData,
  type RespondentCollectionMode,
  type RespondentDirectoryEntry,
  type RespondentEmailScheduleSettings,
  type RespondentPasswordStatus,
  type RespondentStatus,
} from "@/lib/respondent-directory";
import { sendRespondentSurveyEmails } from "@/lib/respondent-email";
import { SITE_CONFIG } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminRespondentsPage() {
  await requireDemoRole("admin");
  const [respondents, activeCount, emailSchedule] = await Promise.all([
    getRespondentDirectoryData(),
    getActiveRespondentCountData(),
    getRespondentEmailScheduleData(),
  ]);
  const selfServiceCount = respondents.filter(
    (respondent) => respondent.collectionMode === "self_service",
  ).length;
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  return (
    <section className="grid gap-6">
      <div className="border border-black bg-white p-5">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              Respondent management
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal">
              {isSpike ? "Partner respondents" : "Respondents"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
              Maintain respondent companies, contact people and collection mode
              for daily {SITE_CONFIG.name} price submissions.
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
        <section className="border border-black bg-white">
          <div className="hidden border-b border-black bg-uga-dark px-4 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/70 lg:grid lg:grid-cols-[minmax(22rem,1.35fr)_minmax(16rem,0.85fr)_minmax(20rem,1fr)_auto]">
            <span>Company</span>
            <span>Primary contact</span>
            <span>Login</span>
            <span className="text-right">Status / action</span>
          </div>
          {respondents.map((respondent) => (
            <RespondentPanel key={respondent.id} respondent={respondent} />
          ))}
        </section>
      </div>

      <SurveyNotificationSettings schedule={emailSchedule} />
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

function SurveyNotificationSettings({
  schedule,
}: {
  schedule: RespondentEmailScheduleSettings;
}) {
  return (
    <aside className="border border-black bg-white p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
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
          <form action={sendSurveyEmailsNowAction} className="mt-4">
            <button className="border border-black bg-uga-dark px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
              Send now
            </button>
          </form>
        </div>

        <form action={updateEmailScheduleAction} className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[0.5fr_0.55fr_0.7fr_1fr]">
            <Field label="Status">
              <select
                className="admin-field"
                defaultValue={schedule.enabled ? "enabled" : "disabled"}
                name="enabled"
              >
                <option value="enabled">enabled</option>
                <option value="disabled">disabled</option>
              </select>
            </Field>
            <Field label="Workdays">
              <input
                className="admin-field"
                defaultValue={schedule.workdays}
                name="workdays"
              />
            </Field>
            <Field label="Send time">
              <input
                className="admin-field"
                defaultValue={schedule.sendTime}
                name="sendTime"
                type="time"
              />
            </Field>
            <Field label="Timezone">
              <input
                className="admin-field"
                defaultValue={schedule.timezone}
                name="timezone"
              />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Sender">
              <input
                className="admin-field"
                defaultValue={schedule.sender}
                name="sender"
              />
            </Field>
            <Field label="Reply-to admin email">
              <input
                className="admin-field"
                defaultValue={schedule.replyTo}
                name="replyTo"
                placeholder={SITE_CONFIG.tenantId === "spike-ua" ? "info@spike.broker" : "admin@uga.ua"}
                type="email"
              />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr]">
            <Field label="Subject">
              <input
                className="admin-field"
                defaultValue={schedule.subject}
                name="subject"
              />
            </Field>
            <Field label="Survey link">
              <input
                className="admin-field"
                defaultValue={schedule.surveyUrl}
                name="surveyUrl"
              />
            </Field>
          </div>
          <Field label="Email template">
            <textarea
              className="admin-field min-h-32"
              defaultValue={schedule.template}
              name="template"
            />
          </Field>
          <p className="text-xs font-semibold leading-5 text-black/55">
            Template variables: {"{{companyName}}"}, {"{{surveyUrl}}"},{" "}
            {"{{date}}"}. Scheduled delivery uses Monday-Friday workdays at the
            configured Kyiv time. Manual sending ignores the schedule status.
          </p>
          <button className="w-fit border border-black bg-uga-green px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
            Save email settings
          </button>
        </form>
      </div>
    </aside>
  );
}

function AddRespondentPanel() {
  return (
    <details className="group border border-black bg-white [&_summary::-webkit-details-marker]:hidden">
      <summary className="grid cursor-pointer gap-3 px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-uga-green">
            New respondent
          </p>
          <h2 className="mt-1 text-lg font-black uppercase leading-5">
            Add company to respondent directory
          </h2>
        </div>
        <span className="inline-flex border border-black bg-uga-dark px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
          <span className="group-open:hidden">Open form</span>
          <span className="hidden group-open:inline">Close form</span>
        </span>
      </summary>
      <form action={addRespondentAction} className="border-t border-black p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.7fr_0.95fr]">
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
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
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
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_0.55fr]">
          <Field label="Telegram username">
            <input className="admin-field" name="telegramUsername" placeholder="@username" />
          </Field>
          <Field label="Telegram chat / peer id">
            <input className="admin-field" name="telegramChatId" />
          </Field>
          <Field label="Language">
            <select className="admin-field" defaultValue="uk" name="preferredLocale">
              <option value="uk">uk</option>
              <option value="en">en</option>
            </select>
          </Field>
        </div>
        <button className="mt-3 border border-black bg-uga-dark px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-white">
          Add respondent
        </button>
      </form>
    </details>
  );
}

function RespondentPanel({ respondent }: { respondent: RespondentDirectoryEntry }) {
  const primaryContact =
    respondent.contacts.find((contact) => contact.primary) ??
    respondent.contacts[0];
  const editorId = `respondent-editor-${respondent.id}`;

  return (
    <div className="group border-b border-black bg-white last:border-b-0">
      <input className="peer sr-only" id={editorId} type="checkbox" />
      <div className="grid gap-3 px-4 py-4 transition hover:bg-uga-mist/70 peer-checked:bg-uga-mist/70 peer-checked:[&_.close-label]:inline peer-checked:[&_.edit-label]:hidden lg:grid-cols-[minmax(22rem,1.35fr)_minmax(16rem,0.85fr)_minmax(20rem,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 className="truncate text-base font-black leading-5">
            {respondent.companyName}
          </h2>
          <p className="mt-1 truncate text-[0.66rem] font-black uppercase tracking-[0.14em] text-black/45">
            {respondent.id}
          </p>
        </div>
        <div className="min-w-0 text-sm font-semibold">
          <p className="truncate">{primaryContact?.name ?? "No contact"}</p>
          <p className="mt-0.5 truncate text-xs text-black/55">
            {primaryContact?.phone || primaryContact?.email || "No contact data"}
          </p>
        </div>
        <div className="min-w-0 text-sm font-semibold">
          <p className="truncate">{respondent.auth.loginEmail}</p>
          <p className="mt-0.5 truncate text-xs text-black/55">
            {respondent.contacts.length} contact
            {respondent.contacts.length === 1 ? "" : "s"} ·{" "}
            {respondent.auth.passwordSetupStatus === "temporary"
              ? "temporary password"
              : "password set"}
          </p>
        </div>
        <div className="flex items-center gap-3 lg:justify-end">
          <label
            className="cursor-pointer border border-black px-3 py-2 text-[0.66rem] font-black uppercase tracking-[0.12em] text-black/60 transition hover:border-uga-green hover:text-uga-green"
            htmlFor={editorId}
          >
            <span className="edit-label">Edit</span>
            <span className="close-label hidden">Close</span>
          </label>
          <div className="grid justify-items-end gap-1">
            <StatusPill tone={respondent.status === "active" ? "active" : "muted"}>
              {respondent.status}
            </StatusPill>
            <StatusPill
              tone={
                respondent.collectionMode === "self_service" ? "active" : "warning"
              }
            >
              {respondent.collectionMode === "self_service" ? "site form" : "manual"}
            </StatusPill>
          </div>
        </div>
      </div>

      <div className="hidden border-t border-black bg-uga-mist/45 p-4 peer-checked:block">
        <div className="grid gap-4 2xl:grid-cols-[minmax(24rem,0.8fr)_minmax(38rem,1.35fr)_minmax(24rem,0.85fr)]">
          <section className="border border-black/20 bg-white p-4">
            <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
              Company settings
            </p>
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
              <div className="grid gap-3 md:grid-cols-2">
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
              </div>
              <button className="border border-black bg-uga-green px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
                Save company
              </button>
            </form>
            <form action={deleteRespondentAction} className="mt-2">
              <input name="id" type="hidden" value={respondent.id} />
              <button className="border border-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700">
                Delete respondent
              </button>
            </form>
          </section>

          <section className="border border-black/20 bg-white p-4">
            <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
              Contact people
            </p>
            <div className="grid gap-2">
              {respondent.contacts.map((contact) => (
                <ContactEditor
                  contact={contact}
                  contactCount={respondent.contacts.length}
                  key={contact.id}
                  respondentId={respondent.id}
                />
              ))}
            </div>
            <AddContactForm respondentId={respondent.id} />
          </section>

          <RespondentAuthPanel respondent={respondent} />
        </div>
      </div>
    </div>
  );
}

function ContactEditor({
  contact,
  contactCount,
  respondentId,
}: {
  contact: RespondentDirectoryEntry["contacts"][number];
  contactCount: number;
  respondentId: string;
}) {
  return (
    <div className="border border-black/15 p-3">
      <form
        action={updateContactAction}
        className="grid gap-3 xl:grid-cols-[minmax(9rem,1fr)_minmax(8rem,0.75fr)_minmax(9rem,0.85fr)_minmax(13rem,1.15fr)_minmax(9rem,0.75fr)_minmax(9rem,0.75fr)_minmax(5rem,0.45fr)_auto] xl:items-end"
      >
        <input name="respondentId" type="hidden" value={respondentId} />
        <input name="contactId" type="hidden" value={contact.id} />
        <Field label="Name">
          <input
            className="admin-field"
            defaultValue={contact.name}
            name="name"
            required
          />
        </Field>
        <Field label="Role">
          <input className="admin-field" defaultValue={contact.role} name="role" />
        </Field>
        <Field label="Phone">
          <input
            className="admin-field"
            defaultValue={contact.phone}
            name="phone"
          />
        </Field>
        <Field label="Email">
          <input
            className="admin-field"
            defaultValue={contact.email}
            name="email"
            type="email"
          />
        </Field>
        <Field label="Telegram">
          <input
            className="admin-field"
            defaultValue={contact.telegramUsername ? `@${contact.telegramUsername}` : ""}
            name="telegramUsername"
            placeholder="@username"
          />
        </Field>
        <Field label="Chat ID">
          <input
            className="admin-field"
            defaultValue={contact.telegramChatId}
            name="telegramChatId"
          />
        </Field>
        <Field label="Lang">
          <select
            className="admin-field"
            defaultValue={contact.preferredLocale}
            name="preferredLocale"
          >
            <option value="uk">uk</option>
            <option value="en">en</option>
          </select>
        </Field>
        <div className="flex flex-wrap items-end gap-2 xl:flex-col xl:items-start">
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
      <form action={deleteContactAction} className="mt-2">
        <input name="respondentId" type="hidden" value={respondentId} />
        <input name="contactId" type="hidden" value={contact.id} />
        <button
          className="text-xs font-black uppercase tracking-[0.12em] text-red-700 disabled:text-black/35"
          disabled={contactCount <= 1}
        >
          Delete contact
        </button>
      </form>
    </div>
  );
}

function AddContactForm({ respondentId }: { respondentId: string }) {
  return (
    <form action={addContactAction} className="mt-3 border border-black/25 p-3">
      <input name="respondentId" type="hidden" value={respondentId} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(9rem,1fr)_minmax(8rem,0.75fr)_minmax(9rem,0.85fr)_minmax(13rem,1.15fr)_minmax(9rem,0.75fr)_minmax(9rem,0.75fr)_minmax(5rem,0.45fr)]">
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
        <Field label="Telegram">
          <input className="admin-field" name="telegramUsername" placeholder="@username" />
        </Field>
        <Field label="Chat ID">
          <input className="admin-field" name="telegramChatId" />
        </Field>
        <Field label="Lang">
          <select className="admin-field" defaultValue="uk" name="preferredLocale">
            <option value="uk">uk</option>
            <option value="en">en</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
          <input
            className="h-4 w-4 accent-uga-green"
            name="primary"
            type="checkbox"
            value="true"
          />
          make primary
        </label>
        <button className="border border-black bg-uga-dark px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
          Add contact
        </button>
      </div>
    </form>
  );
}

function RespondentAuthPanel({
  respondent,
}: {
  respondent: RespondentDirectoryEntry;
}) {
  return (
    <section className="border border-black/20 bg-white p-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
        Respondent login
      </p>
      <form action={updateAuthAction} className="mt-3 grid gap-3">
        <input name="respondentId" type="hidden" value={respondent.id} />
        <Field label="Login email">
          <input
            className="admin-field"
            defaultValue={respondent.auth.loginEmail}
            name="loginEmail"
            type="email"
          />
        </Field>
        <Field label="Password status">
          <select
            className="admin-field"
            defaultValue={respondent.auth.passwordSetupStatus}
            name="passwordSetupStatus"
          >
            <option value="temporary">temporary password</option>
            <option value="active">permanent password set</option>
          </select>
        </Field>
        <button className="border border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-black">
          Save login
        </button>
      </form>

      <div className="mt-3 border border-black/15 bg-uga-mist p-3">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-black/45">
          Temporary password
        </p>
        <p className="mt-1 break-all text-sm font-black">
          {respondent.auth.temporaryPassword}
        </p>
        <p className="mt-1 text-xs font-semibold text-black/55">
          Generated: {formatAuthDate(respondent.auth.lastGeneratedAt)}
        </p>
        <form action={regeneratePasswordAction} className="mt-3">
          <input name="respondentId" type="hidden" value={respondent.id} />
          <button className="border border-black bg-uga-dark px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
            Regenerate temporary password
          </button>
        </form>
      </div>
    </section>
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

async function addRespondentAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await addRespondentDirectoryEntryData({
    collectionMode: parseCollectionMode(formData.get("collectionMode")),
    companyName: readFormString(formData, "companyName"),
    contactEmail: readFormString(formData, "contactEmail"),
    contactName: readFormString(formData, "contactName"),
    contactPhone: readFormString(formData, "contactPhone"),
    contactRole: readFormString(formData, "contactRole"),
    preferredLocale: readFormString(formData, "preferredLocale"),
    status: parseStatus(formData.get("status")),
    telegramChatId: readFormString(formData, "telegramChatId"),
    telegramUsername: readFormString(formData, "telegramUsername"),
  });
  revalidateRespondentPages();
}

async function updateRespondentAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await updateRespondentDirectoryEntryData({
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
  await deleteRespondentDirectoryEntryData(readFormString(formData, "id"));
  revalidateRespondentPages();
}

async function addContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await addRespondentContactData({
    email: readFormString(formData, "email"),
    name: readFormString(formData, "name"),
    phone: readFormString(formData, "phone"),
    preferredLocale: readFormString(formData, "preferredLocale"),
    primary: formData.get("primary") === "true",
    respondentId: readFormString(formData, "respondentId"),
    role: readFormString(formData, "role"),
    telegramChatId: readFormString(formData, "telegramChatId"),
    telegramUsername: readFormString(formData, "telegramUsername"),
  });
  revalidateRespondentPages();
}

async function updateContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await updateRespondentContactData({
    contactId: readFormString(formData, "contactId"),
    email: readFormString(formData, "email"),
    name: readFormString(formData, "name"),
    phone: readFormString(formData, "phone"),
    preferredLocale: readFormString(formData, "preferredLocale"),
    primary: formData.get("primary") === "true",
    respondentId: readFormString(formData, "respondentId"),
    role: readFormString(formData, "role"),
    telegramChatId: readFormString(formData, "telegramChatId"),
    telegramUsername: readFormString(formData, "telegramUsername"),
  });
  revalidateRespondentPages();
}

async function deleteContactAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await deleteRespondentContactData({
    contactId: readFormString(formData, "contactId"),
    respondentId: readFormString(formData, "respondentId"),
  });
  revalidateRespondentPages();
}

async function updateAuthAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await updateRespondentAuthAccountData({
    loginEmail: readFormString(formData, "loginEmail"),
    passwordSetupStatus: parsePasswordStatus(
      formData.get("passwordSetupStatus"),
    ),
    respondentId: readFormString(formData, "respondentId"),
  });
  revalidateRespondentPages();
}

async function regeneratePasswordAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await regenerateRespondentTemporaryPasswordData(
    readFormString(formData, "respondentId"),
  );
  revalidateRespondentPages();
}

async function updateEmailScheduleAction(formData: FormData) {
  "use server";
  await requireDemoRole("admin");
  await updateRespondentEmailScheduleData({
    enabled: formData.get("enabled") !== "disabled",
    replyTo: readFormString(formData, "replyTo"),
    sender: readFormString(formData, "sender"),
    sendTime: readFormString(formData, "sendTime"),
    subject: readFormString(formData, "subject"),
    surveyUrl: readFormString(formData, "surveyUrl"),
    template: readFormString(formData, "template"),
    timezone: readFormString(formData, "timezone"),
    workdays: readFormString(formData, "workdays"),
  });
  revalidateRespondentPages();
}

async function sendSurveyEmailsNowAction() {
  "use server";
  await requireDemoRole("admin");
  await sendRespondentSurveyEmails("manual");
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

function parsePasswordStatus(
  value: FormDataEntryValue | null,
): RespondentPasswordStatus {
  return value === "active" ? "active" : "temporary";
}

function formatAuthDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
