"use client";

import dynamic from "next/dynamic";
import { StatusPill } from "@/components/admin/respondents/respondent-ui";
import {
  type RespondentDirectoryActions,
  type RespondentDirectoryEntry,
  getCollectionModeLabel,
  getTelegramDeliveryTitle,
} from "@/components/admin/respondents/respondents-directory-types";

const RespondentExpandedPanelAsync = dynamic(
  () =>
    import("@/components/admin/respondents/respondent-expanded-panel").then(
      (module) => module.RespondentExpandedPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded border border-black/15 bg-white p-4 text-sm text-black/55">
        Loading respondent editor...
      </div>
    ),
  },
);

export function RespondentRow({
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
        <RespondentExpandedPanelAsync actions={actions} respondent={respondent} />
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
