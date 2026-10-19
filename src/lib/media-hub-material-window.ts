// Drive modification time is not the observation date of an archived document.
export function materialFilenameDate(filename: string): string | undefined {
  const name = filename.normalize("NFKC");
  let date: string | undefined;
  const yearFirst = name.match(/(?:^|\D)(20\d{2})[-_. ](\d{2})[-_. ](\d{2})(?!\d)/);
  const dayFirst = name.match(/(?:^|\D)(\d{2})[-_. ](\d{2})[-_. ](20\d{2})(?!\d)/);
  const shortYearFirst = name.match(/_(2\d)_(\d{2})_(\d{2})(?!\d)/);
  const shortDayFirst = name.match(/(?:^|\D)(\d{2})\.(\d{2})\.(2\d)(?!\d)/);
  if (yearFirst) date = `${yearFirst[1]}-${yearFirst[2]}-${yearFirst[3]}`;
  else if (dayFirst) date = `${dayFirst[3]}-${dayFirst[2]}-${dayFirst[1]}`;
  else if (shortYearFirst) date = `20${shortYearFirst[1]}-${shortYearFirst[2]}-${shortYearFirst[3]}`;
  else if (shortDayFirst) date = `20${shortDayFirst[3]}-${shortDayFirst[2]}-${shortDayFirst[1]}`;
  if (!date) return undefined;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : undefined;
}

type WindowMaterial = {
  receivedFrom: string;
  originalFilename: string | null;
  canonicalUrl: string | null;
  reportingDate: Date;
};

export function selectReportWindowMaterials<T extends WindowMaterial>(rows: T[], start: string, end: string, limit = 32, intakeEnd = end): T[] {
  const date = (row: T) => materialFilenameDate(row.originalFilename ?? "") ??
    row.canonicalUrl?.match(/[?&]driveVersion=(\d{4}-\d{2}-\d{2})T/)?.[1] ??
    row.reportingDate.toISOString().slice(0, 10);
  return rows.filter(row => {
    if (row.receivedFrom !== "google-drive") return true;
    const observationDate = materialFilenameDate(row.originalFilename ?? "");
    // An upload can arrive on Saturday; an explicit source date must still
    // belong to the trading week. Never rename the upload as an observation.
    return date(row) >= start && date(row) <= (observationDate ? end : intakeEnd);
  })
    .sort((a, b) => date(b).localeCompare(date(a)))
    .slice(0, limit);
}
