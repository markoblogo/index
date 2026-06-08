export function getSpikePublicVisibleTradeDate(now = new Date()) {
  const parts = getKyivDateParts(now);

  if (parts.hour >= 19) {
    return parts.date;
  }

  return shiftIsoDate(parts.date, -1);
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
