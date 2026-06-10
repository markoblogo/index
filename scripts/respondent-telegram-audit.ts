import { db, hasDatabaseUrl } from "@/lib/db";

type AuditScriptOptions = {
  date: string;
  ids: string[];
};

type SubmissionSummary = {
  status: string;
  updatedAt: Date;
  submittedAt: Date | null;
  commodityId: string;
  deliveryBasisId: string;
};

type DeliverySummary = {
  trigger: string;
  sentAt: Date;
  status: string;
  error: string | null;
  subject: string;
};

function parseArgs(argv: string[]): AuditScriptOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(
      "Usage: npm run audit:respondent -- [respondentId ...] [--date YYYY-MM-DD]\n" +
        "Example: npm run audit:respondent -- fop-solovey agriprime --date 2026-06-08",
    );
    process.exit(0);
  }

  const dateFromArg = pickArgValue(argv, "--date");
  const ids = argv.filter((value) => !value.startsWith("--") && !value.includes("="));
  const date = dateFromArg ?? toKyivDateString(new Date());

  return {
    date,
    ids,
  };
}

function pickArgValue(argv: string[], key: string) {
  const valueAsPair = argv.find((value) => value.startsWith(`${key}=`));
  if (valueAsPair) {
    return valueAsPair.substring(key.length + 1);
  }

  const index = argv.findIndex((value) => value === key);
  if (index >= 0 && argv[index + 1] && !argv[index + 1].startsWith("--")) {
    return argv[index + 1];
  }

  return undefined;
}

function isValidRespondentId(value: string) {
  return /^[a-z0-9_-]{2,}$/i.test(value);
}

function validateOptions(options: AuditScriptOptions) {
  if (options.ids.length === 0) {
    throw new Error(
      "Pass at least one respondentId. Example: npm run audit:respondent -- fop-solovey agroprime",
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error(`Invalid date: ${options.date}. Use YYYY-MM-DD.`);
  }

  const invalidIds = options.ids.filter((id) => !isValidRespondentId(id));
  if (invalidIds.length > 0) {
    throw new Error(`Invalid respondentId(s): ${invalidIds.join(", ")}`);
  }
}

function toKyivDateString(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  }).format(date);
}

function dateToUtcDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function toKyivBounds(date: Date) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Kyiv",
  }).format(date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    start: zonedDateTimeToUtc(dateKey, "Europe/Kyiv"),
    end: zonedDateTimeToUtc(
      `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDay.getUTCDate()).padStart(2, "0")}`,
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

function formatKyiv(value?: Date | null) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(value);
}

function summarizeStatuses(submissions: SubmissionSummary[]) {
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const key = submission.status;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, count]) => `${status}(${count})`)
    .join(", ");
}

async function auditRespondentWorkflow(options: AuditScriptOptions) {
  validateOptions(options);

  if (!hasDatabaseUrl()) {
    throw new Error(
      "DATABASE_URL is not set for this environment. Point to production/local DB first.",
    );
  }

  const date = options.date;
  const tradeDate = dateToUtcDate(date);
  const bounds = toKyivBounds(tradeDate);

  const respondents = await db.respondent.findMany({
    where: { id: { in: options.ids } },
    include: {
      contacts: {
        where: { active: true },
        orderBy: { primary: "desc" },
      },
      authAccount: true,
    },
  });

  const existingIds = new Set(respondents.map((respondent) => respondent.id));
  const missingIds = options.ids.filter((id) => !existingIds.has(id));

  const [submissions, deliveries] = await Promise.all([
    db.priceSubmission.findMany({
      where: {
        respondentId: { in: options.ids },
        source: "respondent",
        tradeDate,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        respondentId: true,
        status: true,
        updatedAt: true,
        submittedAt: true,
        commodityId: true,
        deliveryBasisId: true,
      },
    }),
    db.respondentEmailDelivery.findMany({
      where: {
        respondentId: { in: options.ids },
        trigger: { startsWith: "telegram_" },
        sentAt: { gte: bounds.start, lt: bounds.end },
      },
      orderBy: { sentAt: "desc" },
      select: {
        respondentId: true,
        trigger: true,
        sentAt: true,
        status: true,
        error: true,
        subject: true,
      },
    }),
  ]);

  const submissionsByRespondent = new Map<string, SubmissionSummary[]>();
  for (const submission of submissions) {
    const list = submissionsByRespondent.get(submission.respondentId) ?? [];
    list.push(submission);
    submissionsByRespondent.set(submission.respondentId, list);
  }

  const deliveriesByRespondent = new Map<string, DeliverySummary[]>();
  for (const delivery of deliveries) {
    const list = deliveriesByRespondent.get(delivery.respondentId) ?? [];
    list.push(delivery);
    deliveriesByRespondent.set(delivery.respondentId, list);
  }

  for (const respondent of respondents) {
    const contactInfo = respondent.contacts.map((contact) => ({
      name: contact.name,
      telegramChatId: contact.telegramChatId ?? "n/a",
      telegramUsername: contact.telegramUsername ?? "n/a",
      preferredLocale: contact.preferredLocale,
      primary: contact.primary,
    }));
    const contactLine = contactInfo
      .map((contact) => `${contact.name}[chat:${contact.telegramChatId}, @${contact.telegramUsername}]`)
      .join(" | ");

    const respondentSubmissions = submissionsByRespondent.get(
      respondent.id,
    ) as SubmissionSummary[] | undefined;
    const respondentDeliveries = deliveriesByRespondent.get(
      respondent.id,
    ) as DeliverySummary[] | undefined;

    const latestSubmission = respondentSubmissions?.[0];
    const botStart = respondentDeliveries?.find(
      (delivery) => delivery.trigger === "telegram_bot_start",
    );
    const latestFailed = respondentDeliveries?.find((delivery) => delivery.status === "failed");
    const hasAnySubmission = Boolean(respondentSubmissions?.length);
    const hasStarted = Boolean(botStart);
    const totalContacts = contactInfo.length;

    console.log(`\n=== ${respondent.id} (${respondent.legalName}) ===`);
    console.log(`status: ${respondent.status}`);
    console.log(`collectionMode: ${respondent.collectionMode}`);
    console.log(`contacts(${totalContacts}): ${contactLine}`);
    console.log(`password status: ${respondent.authAccount?.passwordSetupStatus ?? "temporary"}`);
    console.log(`telegram contact active: ${contactInfo.some((contact) => Boolean(contact.telegramChatId))}`);
    console.log(`today submission: ${hasAnySubmission ? "YES" : "NO"}`);
    console.log(
      `submission statuses today: ${
        respondentSubmissions ? summarizeStatuses(respondentSubmissions) : "none"
      }`,
    );
    console.log(
      `last submission touch: ${
        latestSubmission
          ? `${formatKyiv(latestSubmission.updatedAt)} (submittedAt ${formatKyiv(latestSubmission.submittedAt)})`
          : "n/a"
      }`,
    );
    console.log(`/start done: ${hasStarted ? "YES" : "NO"}${hasStarted ? ` (${formatKyiv(botStart?.sentAt)})` : ""}`);
    if (latestFailed) {
      console.log(`last tg failure: ${latestFailed.trigger} @ ${formatKyiv(latestFailed.sentAt)} | ${latestFailed.error ?? "no details"} | ${latestFailed.subject}`);
    }

    if (respondentDeliveries && respondentDeliveries.length > 0) {
      console.log("today telegram deliveries:");
      for (const delivery of respondentDeliveries) {
        const statusText = `${delivery.status.toUpperCase()} ${delivery.trigger} ${formatKyiv(delivery.sentAt)}`
          + (delivery.error ? ` | ${delivery.error}` : "");
        console.log(`  - ${statusText}`);
      }
    } else {
      console.log("today telegram deliveries: none");
    }
  }

  if (missingIds.length > 0) {
    console.log("\nMissing in DB:", missingIds.join(", "));
  }
}

auditRespondentWorkflow(parseArgs(process.argv.slice(2)))
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
    console.error(`\nAudit failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    db.$disconnect().catch(() => undefined);
  });
