export function getSpikePublicVisibleTradeDate(now = new Date()) {
  const parts = getKyivDateParts(now);
  const weekday = getIsoWeekday(parts.date);

  if (weekday >= 6) {
    return getPreviousBusinessDate(parts.date);
  }

  if (parts.hour >= 19) {
    return parts.date;
  }

  return getPreviousBusinessDate(parts.date);
}

function getKyivDateParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Kyiv",
    year: "numeric",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour ?? "0"),
  };
}

function shiftIsoDate(date: string, days: number) {
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function getPreviousBusinessDate(date: string) {
  let current = shiftIsoDate(date, -1);

  while (getIsoWeekday(current) >= 6) {
    current = shiftIsoDate(current, -1);
  }

  return current;
}

function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}
