"use client";

import { Field } from "@/components/admin/respondents/respondent-ui";

export function AddRespondentPanel({
  addRespondentAction,
}: {
  addRespondentAction: (formData: FormData) => Promise<void>;
}) {
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
              <option value="telegram_request">request via Telegram</option>
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
            <input
              className="admin-field"
              name="telegramUsername"
              placeholder="@username"
            />
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
