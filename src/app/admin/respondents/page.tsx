import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { SITE_CONFIG } from "@/lib/constants";
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
  type RespondentEmailScheduleSettings,
  type RespondentPasswordStatus,
  type RespondentStatus,
} from "@/lib/respondent-directory-lazy";
import { sendRespondentSurveyEmails } from "@/lib/respondent-email";
import { sendRespondentTelegramNotifications } from "@/lib/respondent-telegram";

const RespondentsDirectoryAsync = dynamic(
  () =>
    import("@/components/admin/respondents/respondents-directory").then(
      (module) => module.RespondentsDirectory,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded border border-black bg-white p-4 text-sm text-black/65">
        Loading respondents directory...
      </div>
    ),
  },
);

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageActions = {
  addContactAction: (formData: FormData) => Promise<void>;
  addRespondentAction: (formData: FormData) => Promise<void>;
  deleteContactAction: (formData: FormData) => Promise<void>;
  deleteRespondentAction: (formData: FormData) => Promise<void>;
  regeneratePasswordAction: (formData: FormData) => Promise<void>;
  updateAuthAction: (formData: FormData) => Promise<void>;
  updateContactAction: (formData: FormData) => Promise<void>;
  updateRespondentAction: (formData: FormData) => Promise<void>;
};

export default async function AdminRespondentsPage() {
  await requireDemoRole("admin");
  const [respondents, activeCount, emailSchedule] = await Promise.all([
    getRespondentDirectoryData(),
    getActiveRespondentCountData(),
    getRespondentEmailScheduleData(),
  ]);
  const digitalCount = respondents.filter(
    (respondent) =>
      respondent.collectionMode === "self_service" ||
      respondent.collectionMode === "telegram_request",
  ).length;
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";

  const actions: PageActions = {
    addContactAction,
    addRespondentAction,
    deleteContactAction,
    deleteRespondentAction,
    regeneratePasswordAction,
    updateAuthAction,
    updateContactAction,
    updateRespondentAction,
  };

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
            <Metric label="Digital" value={digitalCount} last />
          </div>
        </div>
      </div>

      <RespondentsDirectoryAsync actions={actions} respondents={respondents} />

      <TelegramNotificationSettings />
      {!isSpike ? <SurveyNotificationSettings schedule={emailSchedule} /> : null}
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
                placeholder={
                  SITE_CONFIG.tenantId === "spike-ua"
                    ? "info@spike.broker"
                    : "admin@uga.ua"
                }
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

function TelegramNotificationSettings() {
  const isSpike = SITE_CONFIG.tenantId === "spike-ua";
  const botLabel = isSpike ? "@spike_spot_bot" : "@uga_index_bot";
  const telegramTemplate = [
    `Будь ласка, внесіть сьогоднішні ціни для ${SITE_CONFIG.name} ({{companyName}}).`,
    "Кнопка відкриває персональну форму респондента у Telegram WebApp.",
    "Фінальне нагадування о 18:00: якщо дані не внесені зараз, вони можуть не потрапити до сьогоднішнього розрахунку індексу.",
  ].join("\n\n");

  return (
    <aside className="border border-black bg-white p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
            Daily Telegram
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase leading-tight">
            Telegram respondent workflow
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
            {SITE_CONFIG.name} uses Telegram as the main daily respondent
            channel. The bot sends a Ukrainian request with a secure personal
            WebApp form; the site form remains available as a reserve input route.
          </p>
          <form action={sendTelegramSurveyNowAction} className="mt-4">
            <button className="border border-black bg-uga-dark px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
              Send Telegram now
            </button>
          </form>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-[0.55fr_0.7fr_0.75fr_1fr]">
            <ReadOnlyField label="Status" value="enabled" />
            <ReadOnlyField label="Workdays" value="Monday-Friday" />
            <ReadOnlyField label="Initial request" value="16:00" />
            <ReadOnlyField label="Timezone" value="Europe/Kyiv" />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <ReadOnlyField label="Bot" value={botLabel} />
            <ReadOnlyField label="Reminder 1" value="17:00" />
            <ReadOnlyField label="Final reminder" value="18:00" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr]">
            <ReadOnlyField label="Project" value={SITE_CONFIG.name} />
            <ReadOnlyField label="WebApp / fallback" value="/respondent" />
          </div>
          <Field label="Telegram template · Ukrainian">
            <textarea
              className="admin-field min-h-36"
              readOnly
              value={telegramTemplate}
            />
          </Field>
          <p className="text-xs font-semibold leading-5 text-black/55">
            Template variables: {"{{companyName}}"}, {"{{surveyUrl}}"},{" "}
            {"{{date}}"}. Contacts should have either Telegram username or chat
            / peer id configured in the respondent directory. Automatic weekday
            delivery is handled by the Telegram cron endpoint after the contact
            links the bot with /start.
          </p>
        </div>
      </div>
    </aside>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-black/50">
        {label}
      </p>
      <div className="admin-field">{value}</div>
    </div>
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
    passwordSetupStatus: parsePasswordStatus(formData.get("passwordSetupStatus")),
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

async function sendTelegramSurveyNowAction() {
  "use server";
  await requireDemoRole("admin");
  await sendRespondentTelegramNotifications({
    reminderLevel: "initial",
    trigger: "manual",
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
  const normalized =
    typeof value === "string"
      ? value.trim().toLowerCase().replace(/\s+/g, "_")
      : "";

  if (normalized === "manual_outreach") {
    return "manual_outreach";
  }

  if (
    normalized === "telegram_request" ||
    normalized === "request_via_telegram" ||
    normalized === "telegram"
  ) {
    return "telegram_request";
  }

  return "self_service";
}

function parsePasswordStatus(
  value: FormDataEntryValue | null,
): RespondentPasswordStatus {
  return value === "active" ? "active" : "temporary";
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
