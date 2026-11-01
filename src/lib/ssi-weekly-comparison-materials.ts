import { materialFilenameDate } from "./media-hub-material-window";

type ComparisonMaterial = { id: string; receivedFrom: string; originalFilename: string | null };
const families = [
  /agro[_ ]ex[_ ]im.*\.xlsx?$/i,
  /check[ _]points.*\.xlsx?$/i,
  /оперативн.*вагон.*\.pdf$/iu,
  /(?:статистичн.*дан|статистик.*уз).*\.pdf$/iu,
  /(?:evening|closing|market.*review|tbc).*\.pdf$/i,
];
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function ssiWeeklyComparisonWindowStart(end: string) {
  const date = new Date(`${end}T00:00:00Z`);
  return iso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
}

/** File dates select candidates only; contents must establish the actual comparison period. */
export function selectSsiWeeklyComparisonMaterials<T extends ComparisonMaterial>(
  rows: T[], current: T[], start: string, end: string,
): T[] {
  const selected = new Map<string, T>();
  const earliest = ssiWeeklyComparisonWindowStart(end);
  for (const [index, family] of families.entries()) {
    const currentDate = current.filter(row => family.test(row.originalFilename ?? ""))
      .map(row => materialFilenameDate(row.originalFilename ?? ""))
      .filter((date): date is string => Boolean(date && date >= start && date <= end)).sort().pop();
    // An archive cannot replace an absent current source family.
    if (!currentDate) continue;
    const candidates = rows.filter(row => row.receivedFrom === "google-drive" && family.test(row.originalFilename ?? ""))
      .map(row => ({ row, date: materialFilenameDate(row.originalFilename ?? "") }))
      .filter((item): item is { row: T; date: string } => Boolean(item.date && item.date >= earliest && item.date < start))
      .sort((a, b) => b.date.localeCompare(a.date));
    const cutoff = new Date(`${currentDate}T00:00:00Z`);
    const targets = [iso(new Date(cutoff.getTime() - 7 * 86400000))];
    if (index < 2) {
      targets.push(iso(new Date(cutoff.getTime() - 14 * 86400000)));
      const previousMonth = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() - 1, cutoff.getUTCDate()));
      if (previousMonth.getUTCDate() === cutoff.getUTCDate()) targets.push(iso(previousMonth));
    }
    for (const target of targets) {
      const match = candidates.find(item => item.date === target);
      if (match) selected.set(match.row.id, match.row);
    }
  }
  return [...selected.values()].slice(0, 12);
}
