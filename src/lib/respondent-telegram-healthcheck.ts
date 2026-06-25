import { db, hasDatabaseUrl } from "@/lib/db";

type HealthResultRow = {
  respondentId: string;
  legalName: string;
  displayName: string;
  activeTelegramContacts: string;
  latestDeliveryAt: Date | null;
  latestDeliveryStatus: string | null;
  latestDeliveryTrigger: string | null;
  latestDeliveryError: string | null;
  hasContact: boolean;
  noDeliveryToday: boolean;
};

export type HealthOptions = {
  date?: string;
  includeNoDeliveryOnly?: boolean;
};

export type RespondentTelegramHealth = {
  date: string;
  inspectedAt: string;
  totalActiveTelegramRespondents: number;
  totalWithTelegramContacts: number;
  totalWithNoTelegramContact: number;
  failedOrMissingLatest: HealthResultRow[];
};

export async function getRespondentTelegramDeliveryHealth(options: HealthOptions = {}): Promise<RespondentTelegramHealth> {
  if (options.date && !isValidDateString(options.date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  const date = options.date ?? getKyivDateString(new Date());
  const bounds = getKyivDateBounds(date);

  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set for this environment.");
  }

  const respondents = await db.respondent.findMany({
    where: {
      active: true,
      status: "active",
      collectionMode: {
        in: ["self_service", "telegram_request"],
      },
    },
    include: {
      contacts: {
        where: {
          active: true,
          telegramChatId: { not: null },
        },
      },
    },
    orderBy: { legalName: "asc" },
  });

  const respondentIds = respondents.map((respondent) => respondent.id);
  const deliveries = respondentIds.length
    ? await db.respondentEmailDelivery.findMany({
        where: {
          respondentId: { in: respondentIds },
          sentAt: {
            gte: bounds.start,
            lt: bounds.end,
          },
          trigger: { startsWith: "telegram_scheduled_" },
        },
        orderBy: { sentAt: "desc" },
      })
    : [];

  const latestByRespondent = new Map<string, (typeof deliveries)[number]>();
  for (const delivery of deliveries) {
    if (!latestByRespondent.has(delivery.respondentId)) {
      latestByRespondent.set(delivery.respondentId, delivery);
    }
  }

  const rows: HealthResultRow[] = respondents.map((respondent) => {
    const chatIds = respondent.contacts
      .map((contact) => contact.telegramChatId)
      .filter(Boolean)
      .join(", ");
    const latest = latestByRespondent.get(respondent.id);
    const hasContact = respondent.contacts.length > 0;

    return {
      respondentId: respondent.id,
      legalName: respondent.legalName,
      displayName: respondent.displayName,
      activeTelegramContacts: chatIds || "none",
      latestDeliveryAt: latest?.sentAt ?? null,
      latestDeliveryStatus: latest?.status ?? null,
      latestDeliveryTrigger: latest?.trigger ?? null,
      latestDeliveryError: latest?.error ?? null,
      hasContact,
      noDeliveryToday: !latest,
    };
  });

  const candidates = rows.filter((row) => row.hasContact && (row.noDeliveryToday || row.latestDeliveryStatus !== "sent"));

  return {
    date,
    inspectedAt: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Kyiv",
      year: "numeric",
    }).format(new Date()),
    totalActiveTelegramRespondents: rows.length,
    totalWithTelegramContacts: rows.filter((row) => row.hasContact).length,
    totalWithNoTelegramContact: rows.filter((row) => !row.hasContact).length,
    failedOrMissingLatest: options.includeNoDeliveryOnly === false ? rows : candidates,
  };
}

export function formatHealthText(report: RespondentTelegramHealth) {
  const lines = [
    `Respondent Telegram delivery health for ${report.date} (${report.inspectedAt} Kyiv):`,
    `Active respondents with telegram: ${report.totalWithTelegramContacts}`,
    `Rows with missing/failed latest delivery: ${report.failedOrMissingLatest.length}`,
  ];

  if (report.failedOrMissingLatest.length === 0) {
    return `${lines.join("\n")}\nOK`;
  }

  const list = report.failedOrMissingLatest
    .map(
      (row) =>
        `${row.respondentId} ${row.legalName} | status=${row.latestDeliveryStatus ?? "none"} ` +
        `trigger=${row.latestDeliveryTrigger ?? "none"} time=${row.latestDeliveryAt ? formatKyiv(row.latestDeliveryAt) : "n/a"} ` +
        `contacts=[${row.activeTelegramContacts}]` +
        (row.latestDeliveryError ? ` error=${row.latestDeliveryError}` : ""),
    )
    .join("\n");

  return `${lines.join("\n")}\n${list}`;
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getKyivDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
}

function getKyivDateBounds(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    start: zonedDateTimeToUtc(date, "Europe/Kyiv"),
    end: zonedDateTimeToUtc(
      `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(
        nextDay.getUTCDate(),
      ).padStart(2, "0")}`,
      "Europe/Kyiv",
    ),
  };
}

function zonedDateTimeToUtc(dateKey: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const candidate = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(candidate, timeZone);

  return new Date(utcGuess.getTime() - correctedOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour === 24 ? 0 : values.hour,
      values.minute,
      values.second,
    ) - date.getTime()
  );
}

function formatKyiv(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(value);
}
