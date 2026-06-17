"use client";

import { Field } from "@/components/admin/respondents/respondent-ui";
import {
  type RespondentDirectoryActions,
  type RespondentDirectoryEntry,
  formatAuthDate,
  formatDateForAdmin,
} from "@/components/admin/respondents/respondents-directory-types";

export function RespondentExpandedPanel({
  actions,
  respondent,
}: {
  actions: RespondentDirectoryActions;
  respondent: RespondentDirectoryEntry;
}) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(24rem,0.8fr)_minmax(38rem,1.35fr)_minmax(24rem,0.85fr)]">
      <section className="border border-black/20 bg-white p-4">
        <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
          Company settings
        </p>
        <form action={actions.updateRespondentAction} className="grid gap-3">
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
                <option value="telegram_request">request via Telegram</option>
                <option value="manual_outreach">email/call required</option>
              </select>
            </Field>
          </div>
          <button className="border border-black bg-uga-green px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white">
            Save company
          </button>
        </form>
        <form action={actions.deleteRespondentAction} className="mt-2">
          <input name="id" type="hidden" value={respondent.id} />
          <button className="border border-red-700 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700">
            Delete respondent
          </button>
        </form>
      </section>

      <div className="grid gap-4">
        <TelegramActivityPanel respondent={respondent} />

        <section className="border border-black/20 bg-white p-4">
          <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
            Contact people
          </p>
          <div className="grid gap-2">
            {respondent.contacts.map((contact) => (
              <ContactEditor
                action={actions.updateContactAction}
                contact={contact}
                contactCount={respondent.contacts.length}
                deleteAction={actions.deleteContactAction}
                key={contact.id}
                respondentId={respondent.id}
              />
            ))}
          </div>
          <AddContactForm
            addContactAction={actions.addContactAction}
            respondentId={respondent.id}
          />
        </section>
      </div>

      <RespondentAuthPanel
        regeneratePasswordAction={actions.regeneratePasswordAction}
        respondent={respondent}
        updateAuthAction={actions.updateAuthAction}
      />
    </div>
  );
}

function TelegramActivityPanel({
  respondent,
}: {
  respondent: RespondentDirectoryEntry;
}) {
  const { auth, onboardingDelivery, telegramDelivery, telegramActivity } = respondent;
  const passwordStatus =
    auth.passwordSetupStatus === "active"
      ? auth.passwordSetAt
        ? `set ${formatDateForAdmin(auth.passwordSetAt)}`
        : "set"
      : "temporary";
  const deliveryError = telegramDelivery.error?.trim();
  const onboardingError = onboardingDelivery.error?.trim();
  const hasOnboardingEmail = onboardingDelivery.status === "sent";
  const onboardingLabel =
    onboardingDelivery.status === "not_sent"
      ? "not sent"
      : onboardingDelivery.status === "failed"
        ? "failed"
        : "sent";

  return (
    <section className="border border-black/20 bg-white p-4">
      <p className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-black/45">
        Telegram activity
      </p>
      <div className="grid gap-2 text-sm text-black/85">
        <p>
          Telegram chat linked: <strong>{telegramActivity.hasActiveTelegramChat ? "yes" : "no"}</strong>
        </p>
        <p>
          /start done: <strong>{telegramActivity.hasStartedWithBot ? "yes" : "no"}</strong>
          {telegramActivity.lastBotStartAt
            ? ` · ${formatDateForAdmin(telegramActivity.lastBotStartAt)}`
            : ""}
        </p>
        <p>
          Today submission: <strong>{telegramActivity.hasSubmissionToday ? "yes" : "no"}</strong>
          {telegramActivity.lastSubmissionAt
            ? ` · ${formatDateForAdmin(telegramActivity.lastSubmissionAt)}`
            : ""}
        </p>
        <p>
          Password status: <strong>{passwordStatus}</strong>
        </p>
        <p>
          Onboarding email: <strong>{onboardingLabel}</strong>
          {onboardingDelivery.sentAt
            ? ` · ${formatDateForAdmin(onboardingDelivery.sentAt)}`
            : ""}
        </p>
        {deliveryError ? (
          <p>
            Last Telegram error: <strong>{deliveryError}</strong>
          </p>
        ) : null}
        {onboardingError ? (
          <p>
            Last onboarding email error: <strong>{onboardingError}</strong>
          </p>
        ) : null}
        {hasOnboardingEmail ? (
          <p className="text-xs text-black/70">
            Onboarding trigger: {onboardingDelivery.trigger || "n/a"} · Provider:{" "}
            {onboardingDelivery.providerId || "n/a"}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ContactEditor({
  action,
  contact,
  contactCount,
  deleteAction,
  respondentId,
}: {
  action: (formData: FormData) => Promise<void>;
  contact: RespondentDirectoryEntry["contacts"][number];
  contactCount: number;
  deleteAction: (formData: FormData) => Promise<void>;
  respondentId: string;
}) {
  return (
    <div className="border border-black/15 p-3">
      <form
        action={action}
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
          <input className="admin-field" defaultValue={contact.phone} name="phone" />
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
      <form action={deleteAction} className="mt-2">
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

function AddContactForm({
  addContactAction,
  respondentId,
}: {
  addContactAction: (formData: FormData) => Promise<void>;
  respondentId: string;
}) {
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
  regeneratePasswordAction,
  respondent,
  updateAuthAction,
}: {
  regeneratePasswordAction: (formData: FormData) => Promise<void>;
  respondent: RespondentDirectoryEntry;
  updateAuthAction: (formData: FormData) => Promise<void>;
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
