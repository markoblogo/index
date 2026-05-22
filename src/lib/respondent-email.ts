import { randomBytes } from "node:crypto";
import { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
import {
  getRespondentDirectoryData,
  getRespondentEmailScheduleData,
  type RespondentDirectoryEntry,
  type RespondentEmailScheduleSettings,
} from "@/lib/respondent-directory";

type SendTrigger = "manual" | "scheduled";

type DeliveryResult = {
  email: string;
  error?: string;
  providerId?: string;
  respondentId: string;
  status: "sent" | "skipped" | "failed";
};

type RespondentEmailRecipient = {
  companyName: string;
  contactId: string;
  email: string;
  respondentId: string;
};

export async function sendRespondentSurveyEmails(trigger: SendTrigger) {
  const schedule = await getRespondentEmailScheduleData();

  if (trigger === "scheduled") {
    if (!schedule.enabled) {
      return {
        delivered: [],
        skippedReason: "schedule_disabled",
      };
    }

    if (!isScheduledSendDue(schedule)) {
      return {
        delivered: [],
        skippedReason: "outside_schedule_window",
      };
    }

    if (await wasScheduledEmailAlreadySentToday(schedule)) {
      return {
        delivered: [],
        skippedReason: "already_sent_today",
      };
    }
  }

  const respondents = await getRespondentDirectoryData();
  const recipients = getSurveyEmailRecipients(respondents);
  const delivered = await Promise.all(
    recipients.map((recipient) =>
      sendRespondentEmail({
        recipient,
        schedule,
        trigger,
      }),
    ),
  );

  return {
    delivered,
    skippedReason: null,
  };
}

export function isScheduledSendDue(
  schedule: RespondentEmailScheduleSettings,
  now = new Date(),
) {
  const kyivDate = getZonedDateParts(now, schedule.timezone);
  const workday = kyivDate.weekday;

  if (!isWorkday(workday, schedule.workdays)) {
    return false;
  }

  return `${kyivDate.hour}:${kyivDate.minute}` >= schedule.sendTime;
}

function getSurveyEmailRecipients(respondents: RespondentDirectoryEntry[]) {
  return respondents
    .filter(
      (respondent) =>
        respondent.status === "active" &&
        respondent.collectionMode === "self_service",
    )
    .flatMap((respondent) =>
      respondent.contacts
        .filter((contact) => contact.email)
        .map((contact) => ({
          companyName: respondent.companyName,
          contactId: contact.id,
          email: contact.email,
          respondentId: respondent.id,
        })),
    );
}

async function sendRespondentEmail({
  recipient,
  schedule,
  trigger,
}: {
  recipient: RespondentEmailRecipient;
  schedule: RespondentEmailScheduleSettings;
  trigger: SendTrigger;
}): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    const result = {
      email: recipient.email,
      error: "RESEND_API_KEY is not configured",
      respondentId: recipient.respondentId,
      status: "skipped" as const,
    };
    await logEmailDelivery({ result, schedule, trigger, recipient });
    return result;
  }

  try {
    const surveyUrl = await getRecipientSurveyUrl(schedule, recipient);
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: schedule.sender,
        html: renderHtmlEmail(schedule, recipient, surveyUrl),
        reply_to: schedule.replyTo || undefined,
        subject: schedule.subject,
        text: renderTextEmail(schedule, recipient, surveyUrl),
        to: [recipient.email],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      const result = {
        email: recipient.email,
        error: payload.message ?? payload.name ?? response.statusText,
        respondentId: recipient.respondentId,
        status: "failed" as const,
      };
      await logEmailDelivery({ result, schedule, trigger, recipient });
      return result;
    }

    const result = {
      email: recipient.email,
      providerId: payload.id,
      respondentId: recipient.respondentId,
      status: "sent" as const,
    };
    await logEmailDelivery({ result, schedule, trigger, recipient });
    return result;
  } catch (error) {
    const result = {
      email: recipient.email,
      error: error instanceof Error ? error.message : "Unknown send error",
      respondentId: recipient.respondentId,
      status: "failed" as const,
    };
    await logEmailDelivery({ result, schedule, trigger, recipient });
    return result;
  }
}

async function logEmailDelivery({
  recipient,
  result,
  schedule,
  trigger,
}: {
  recipient: RespondentEmailRecipient;
  result: DeliveryResult;
  schedule: RespondentEmailScheduleSettings;
  trigger: SendTrigger;
}) {
  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    await db.respondentEmailDelivery.create({
      data: {
        contactId: recipient.contactId,
        email: result.email,
        error: result.error ?? null,
        providerId: result.providerId ?? null,
        respondentId: result.respondentId,
        status: result.status,
        subject: schedule.subject,
        trigger,
      },
    });
  } catch (error) {
    if (allowMockFallback()) {
      console.warn("Failed to log respondent email delivery.", error);
      return;
    }

    throw error;
  }
}

async function wasScheduledEmailAlreadySentToday(
  schedule: RespondentEmailScheduleSettings,
) {
  if (!hasDatabaseUrl()) {
    return false;
  }

  const dateKey = getZonedDateParts(new Date(), schedule.timezone).date;
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(`${dateKey}T23:59:59.999Z`);

  const count = await db.respondentEmailDelivery.count({
    where: {
      sentAt: {
        gte: start,
        lte: end,
      },
      status: "sent",
      trigger: "scheduled",
    },
  });

  return count > 0;
}

function renderTextEmail(
  schedule: RespondentEmailScheduleSettings,
  recipient: RespondentEmailRecipient,
  surveyUrl: string,
) {
  return interpolateTemplate(schedule.template, recipient, surveyUrl);
}

function renderHtmlEmail(
  schedule: RespondentEmailScheduleSettings,
  recipient: RespondentEmailRecipient,
  surveyUrl: string,
) {
  const text = renderTextEmail(schedule, recipient, surveyUrl)
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#06150d;line-height:1.5">
      ${text}
      <p>
        <a href="${escapeHtml(surveyUrl)}" style="color:#0b6b3a;font-weight:700">
          Open daily survey
        </a>
      </p>
    </div>
  `;
}

function interpolateTemplate(
  template: string,
  recipient: RespondentEmailRecipient,
  surveyUrl: string,
) {
  return template
    .replaceAll("{{companyName}}", recipient.companyName)
    .replaceAll("{{surveyUrl}}", surveyUrl)
    .replaceAll("{{date}}", new Date().toISOString().slice(0, 10));
}

async function getRecipientSurveyUrl(
  schedule: RespondentEmailScheduleSettings,
  recipient: RespondentEmailRecipient,
) {
  if (!hasDatabaseUrl()) {
    return absoluteUrl(schedule.surveyUrl);
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

  await db.respondentSurveyToken.create({
    data: {
      contactId: recipient.contactId,
      email: recipient.email,
      expiresAt,
      respondentId: recipient.respondentId,
      token,
    },
  });

  return absoluteUrl(`/respondent/access/${token}`);
}

function absoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${siteUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function getZonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: value("hour").padStart(2, "0"),
    minute: value("minute").padStart(2, "0"),
    weekday: value("weekday"),
  };
}

function isWorkday(weekday: string, workdays: string) {
  if (workdays.toLowerCase().includes("monday-friday")) {
    return !["Saturday", "Sunday"].includes(weekday);
  }

  return workdays
    .split(/[,\s]+/)
    .map((day) => day.trim().toLowerCase())
    .filter(Boolean)
    .includes(weekday.toLowerCase());
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
