"use client";

import type { ReactNode } from "react";
import {
  type RespondentCollectionMode,
  type RespondentDirectoryEntry,
  type RespondentPasswordStatus,
  type RespondentStatus,
} from "@/lib/respondent-directory-lazy";

type RespondentDirectoryActions = {
  addRespondentAction: (formData: FormData) => Promise<void>;
  addContactAction: (formData: FormData) => Promise<void>;
  deleteContactAction: (formData: FormData) => Promise<void>;
  deleteRespondentAction: (formData: FormData) => Promise<void>;
  regeneratePasswordAction: (formData: FormData) => Promise<void>;
  updateAuthAction: (formData: FormData) => Promise<void>;
  updateContactAction: (formData: FormData) => Promise<void>;
  updateRespondentAction: (formData: FormData) => Promise<void>;
};

type Props = {
  respondents: RespondentDirectoryEntry[];
  actions: RespondentDirectoryActions;
};

export function RespondentsDirectory({ respondents, actions }: Props) {
  return (
    <div className="grid gap-4">
      <AddRespondentPanel addRespondentAction={actions.addRespondentAction} />
      <section className="border border-black bg-white">
        <div className="hidden border-b border-black bg-uga-dark px-4 py-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/70 lg:grid lg:grid-cols-[minmax(22rem,1.35fr)_minmax(16rem,0.85fr)_minmax(20rem,1fr)_auto]">
          <span>Company</span>
          <span>Primary contact</span>
          <span>Login</span>
          <span className="text-right">Status / action</span>
        </div>
        {respondents.map((respondent) => (
          <RespondentPanel
            actions={actions}
            key={respondent.id}
            respondent={respondent}
          />
        ))}
      </section>
    </div>
  );
}

function AddRespondentPanel({
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

function RespondentPanel({
  actions,
  respondent,
}: {
  actions: RespondentDirectoryActions;
  respondent: RespondentDirectoryEntry;
}) {
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
            <TelegramDeliveryPill respondent={respondent} />
            <StatusPill tone={respondent.status === "active" ? "active" : "muted"}>
              {respondent.status}
            </StatusPill>
            <StatusPill
              tone={
                respondent.collectionMode === "manual_outreach" ? "warning" : "active"
              }
            >
              {getCollectionModeLabel(respondent.collectionMode)}
            </StatusPill>
          </div>
        </div>
      </div>
      <div className="border-t border-black/20 bg-uga-mist/35 px-4 py-2">
        <TelegramStatusQuickFacts respondent={respondent} />
      </div>

      <div className="hidden border-t border-black bg-uga-mist/45 p-4 peer-checked:block">
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

          <RespondentAuthPanel
            respondent={respondent}
            regeneratePasswordAction={actions.regeneratePasswordAction}
            updateAuthAction={actions.updateAuthAction}
          />
        </div>
      </div>
    </div>
  );
}

function TelegramDeliveryPill({
  respondent,
}: {
  respondent: RespondentDirectoryEntry;
}) {
  const delivery = respondent.telegramDelivery;
  const title = getTelegramDeliveryTitle(delivery);

  if (delivery.status === "not_linked") {
    return (
      <StatusPill tone="muted" title={title}>
        TG not linked
      </StatusPill>
    );
  }

  if (delivery.status === "sent") {
    return (
      <StatusPill tone="active" title={title}>
        TG sent
      </StatusPill>
    );
  }

  if (delivery.status === "failed") {
    return (
      <StatusPill tone="danger" title={title}>
        TG failed
      </StatusPill>
    );
  }

  return (
    <StatusPill tone="warning" title={title}>
      TG not sent
    </StatusPill>
  );
}

function TelegramStatusQuickFacts({
  respondent,
}: {
  respondent: RespondentDirectoryEntry;
}) {
  const { auth, telegramDelivery, telegramActivity, onboardingDelivery } =
    respondent;
  const onboardingStatus =
    onboardingDelivery.status === "sent"
      ? "sent"
      : onboardingDelivery.status === "failed"
        ? "failed"
        : "not sent";
  const surveyStatus =
    telegramDelivery.status === "not_linked"
      ? "not linked"
      : telegramDelivery.status === "sent"
        ? "sent"
        : telegramDelivery.status === "failed"
          ? "failed"
          : telegramDelivery.status === "not_sent"
            ? "not sent"
            : telegramDelivery.status;

  return (
    <p className="overflow-x-auto whitespace-nowrap text-left text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/65">
      Email:{onboardingStatus === "sent" ? " onboard sent" : ` onboarding ${onboardingStatus}`}
      · TG chat: <strong>{telegramActivity.hasActiveTelegramChat ? "yes" : "no"}</strong>
      · /start: <strong>{telegramActivity.hasStartedWithBot ? "yes" : "no"}</strong>
      · Today sub: <strong>{telegramActivity.hasSubmissionToday ? "yes" : "no"}</strong>
      · Password:{" "}
      <strong>
        {auth.passwordSetupStatus === "active"
          ? "set"
          : "temporary"}
      </strong>
      · TG request: <strong>{surveyStatus}</strong>
    </p>
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
  title,
}: {
  children: ReactNode;
  title?: string;
  tone: "active" | "danger" | "muted" | "warning";
}) {
  const className =
    tone === "active"
      ? "admin-contrast-pill bg-uga-lime text-black"
      : tone === "danger"
        ? "admin-contrast-pill bg-red-500 text-black"
        : tone === "warning"
          ? "admin-warning-pill text-black"
          : "border border-white/35 text-white/70";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.12em] ${className}`}
      title={title}
    >
      {children}
    </span>
  );
}

function getTelegramDeliveryTitle(
  delivery: RespondentDirectoryEntry["telegramDelivery"],
) {
  if (delivery.status === "not_linked") {
    return "No active contact has a Telegram chat / peer id or Telegram username.";
  }

  if (delivery.status === "not_sent") {
    return "No Telegram delivery log for the current Kyiv trade date.";
  }

  const sentAt = delivery.sentAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Kyiv",
      }).format(new Date(delivery.sentAt))
    : "unknown time";
  const base = `${delivery.status === "sent" ? "Sent" : "Failed"} at ${sentAt}. Trigger: ${delivery.trigger || "unknown"}.`;

  return delivery.error ? `${base} Error: ${delivery.error}` : base;
}

function getCollectionModeLabel(mode: RespondentCollectionMode) {
  if (mode === "telegram_request") {
    return "telegram";
  }

  if (mode === "manual_outreach") {
    return "manual";
  }

  return "site form";
}

function formatDateForAdmin(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

function formatAuthDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
