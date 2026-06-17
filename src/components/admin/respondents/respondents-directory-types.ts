"use client";

import type {
  RespondentCollectionMode,
  RespondentDirectoryEntry,
} from "@/lib/respondent-directory-lazy";

export type RespondentDirectoryActions = {
  addRespondentAction: (formData: FormData) => Promise<void>;
  addContactAction: (formData: FormData) => Promise<void>;
  deleteContactAction: (formData: FormData) => Promise<void>;
  deleteRespondentAction: (formData: FormData) => Promise<void>;
  regeneratePasswordAction: (formData: FormData) => Promise<void>;
  updateAuthAction: (formData: FormData) => Promise<void>;
  updateContactAction: (formData: FormData) => Promise<void>;
  updateRespondentAction: (formData: FormData) => Promise<void>;
};

export type RespondentDirectoryProps = {
  respondents: RespondentDirectoryEntry[];
  actions: RespondentDirectoryActions;
};

export type {
  RespondentCollectionMode,
  RespondentDirectoryEntry,
};

export function getCollectionModeLabel(mode: RespondentCollectionMode) {
  if (mode === "telegram_request") {
    return "telegram";
  }

  if (mode === "manual_outreach") {
    return "manual";
  }

  return "site form";
}

export function getTelegramDeliveryTitle(
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

export function formatDateForAdmin(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}

export function formatAuthDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
