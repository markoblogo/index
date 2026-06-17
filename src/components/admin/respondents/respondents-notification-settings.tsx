"use client";

import type { RespondentEmailScheduleSettings } from "@/lib/respondent-directory-lazy";

type Props = {
  schedule: RespondentEmailScheduleSettings;
  sendSurveyEmailsNowAction: () => Promise<void>;
  updateEmailScheduleAction: (formData: FormData) => Promise<void>;
};

export function SurveyNotificationSettings({
  schedule,
  sendSurveyEmailsNowAction,
  updateEmailScheduleAction,
}: Props) {
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
              <input className="admin-field" defaultValue={schedule.workdays} name="workdays" />
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
              <input className="admin-field" defaultValue={schedule.sender} name="sender" />
            </Field>
            <Field label="Reply-to admin email">
              <input
                className="admin-field"
                defaultValue={schedule.replyTo}
                name="replyTo"
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
              <input className="admin-field" defaultValue={schedule.surveyUrl} name="surveyUrl" />
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

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block text-xs font-black uppercase tracking-[0.12em] text-black/50">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
