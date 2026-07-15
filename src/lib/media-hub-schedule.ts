export type MediaHubScheduleKind = "daily" | "weekly" | "monthly" | "none";

const DEFAULT_MEDIA_HUB_TIMEZONE = "Europe/Kyiv";
const DEFAULT_SPIKE_MEDIA_HUB_DAILY_REPORT_TIME = "19:10";
const DEFAULT_PLATFORM_MEDIA_HUB_DAILY_REPORT_TIME = "19:15";
const DEFAULT_MEDIA_HUB_WEEKLY_REPORT_TIME = "15:00";

export function getMediaHubTimezone() {
  const configured = process.env.MEDIA_HUB_SCHEDULE_TIMEZONE?.trim();
  return configured || DEFAULT_MEDIA_HUB_TIMEZONE;
}

export function getMediaHubReportTime(kind: MediaHubScheduleKind, platformSite: boolean) {
  const configured =
    kind === "daily"
      ? (
        platformSite
          ? process.env.ID3X_MEDIA_HUB_DAILY_REPORT_TIME?.trim()
          : process.env.SPIKE_MEDIA_HUB_DAILY_REPORT_TIME?.trim()
      ) ?? process.env.MEDIA_HUB_DAILY_REPORT_TIME?.trim()
      : process.env.MEDIA_HUB_WEEKLY_REPORT_TIME?.trim();
  const fallback =
    kind === "daily"
      ? platformSite
        ? DEFAULT_PLATFORM_MEDIA_HUB_DAILY_REPORT_TIME
        : DEFAULT_SPIKE_MEDIA_HUB_DAILY_REPORT_TIME
      : DEFAULT_MEDIA_HUB_WEEKLY_REPORT_TIME;
  return configured && /^\d{2}:\d{2}$/.test(configured)
    ? configured
    : fallback;
}

export function getMediaHubLocalDate(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function getMediaHubLocalTimeParts(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}

export function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function getSaturdayOrdinalInMonth(date: string) {
  const current = new Date(`${date}T00:00:00.000Z`);
  let ordinal = 0;

  for (let day = 1; day <= current.getUTCDate(); day += 1) {
    const candidate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), day));
    if (candidate.getUTCDay() === 6) {
      ordinal += 1;
    }
  }

  return ordinal;
}

export function shiftIsoDate(date: string, days: number) {
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}
