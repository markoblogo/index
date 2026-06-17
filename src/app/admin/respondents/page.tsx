import { revalidatePath } from "next/cache";
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
    loading: () => (
      <div className="rounded border border-black bg-white p-4 text-sm text-black/65">
        Loading respondents directory...
      </div>
    ),
  },
);

const SurveyNotificationSettingsAsync = dynamic(
  () =>
    import(
      "@/components/admin/respondents/respondents-notification-settings"
    ).then((module) => module.SurveyNotificationSettings),
  {
    loading: () => (
      <div className="rounded border border-black bg-white p-4 text-sm text-black/65">
        Loading survey notification settings...
      </div>
    ),
  },
);

const TelegramNotificationSettingsAsync = dynamic(
  () =>
    import(
      "@/components/admin/respondents/respondents-telegram-settings"
    ).then((module) => module.TelegramNotificationSettings),
  {
    loading: () => (
      <div className="rounded border border-black bg-white p-4 text-sm text-black/65">
        Loading Telegram settings...
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

      <TelegramNotificationSettingsAsync
        sendTelegramSurveyNowAction={sendTelegramSurveyNowAction}
      />
      {!isSpike ? (
        <SurveyNotificationSettingsAsync
          sendSurveyEmailsNowAction={sendSurveyEmailsNowAction}
          schedule={emailSchedule}
          updateEmailScheduleAction={updateEmailScheduleAction}
        />
      ) : null}
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
