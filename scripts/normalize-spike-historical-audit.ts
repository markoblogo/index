import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

type PreviewRow = {
  source: string;
  sourceKind: string;
  sourceMessageId: string;
  sourceDate: string;
  reportDate: string;
  extractionMethod: string;
  rawCommodity: string;
  rawBasis: string;
  rawDeliveryPeriod: string;
  rawPriceText: string;
  priceLow: string;
  priceHigh: string;
  priceMid: string;
  currency: string;
  vatIncluded: string;
  mappedCommodityId: string;
  mappedBasisId: string;
  mappingStatus: string;
  confidence: string;
  mediaPath: string;
  rawContext: string;
  [key: string]: string | number;
};

type NormalizedRow = PreviewRow & {
  normalizedCommodityId: string;
  normalizedCommodityLabel: string;
  normalizedBasisId: string;
  normalizedBasisLabel: string;
  normalizedDate: string;
  normalizedValueUsd: number | "";
  priceStatus: "observed";
  auditStatus: "mapped_candidate" | "manual_review" | "excluded";
  auditReason: string;
  importReadiness: "ready_after_audit" | "needs_manual_check" | "do_not_import";
};

const PREVIEW_ROOT = path.join(process.cwd(), "data", "spike-historical", "preview");
const INPUT_CSV = path.join(PREVIEW_ROOT, "archive_preview.csv");
const CLEAN_CSV = path.join(PREVIEW_ROOT, "archive_cleaned_candidates.csv");
const CLEAN_XLSX = path.join(PREVIEW_ROOT, "ssi_historical_price_audit_cleaned.xlsx");

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

async function main() {
  const rows = parseCsv(await readFile(INPUT_CSV, "utf8"));
  const normalized = rows.map(normalizeRow).filter(Boolean) as NormalizedRow[];
  const cleanCandidates = normalized.filter((row) => row.auditStatus === "mapped_candidate");
  const manualReview = normalized.filter((row) => row.auditStatus === "manual_review");
  const excluded = normalized.filter((row) => row.auditStatus === "excluded");
  const dailyObserved = cleanCandidates.map(toDailyObservedRow);
  const coverage = buildCoverageRows(normalized);

  await writeCsv(CLEAN_CSV, cleanCandidates);
  writeWorkbook({
    cleanCandidates,
    dailyObserved,
    manualReview,
    excluded,
    coverage,
    mappingRules: buildMappingRules(),
  });

  console.table([
    { sheet: "clean_candidates", rows: cleanCandidates.length },
    { sheet: "daily_observed", rows: dailyObserved.length },
    { sheet: "manual_review", rows: manualReview.length },
    { sheet: "excluded", rows: excluded.length },
    { sheet: "source_coverage", rows: coverage.length },
  ]);
  console.log("[normalize] csv:", CLEAN_CSV);
  console.log("[normalize] xlsx:", CLEAN_XLSX);
}

function normalizeRow(row: PreviewRow): NormalizedRow | null {
  const price = Number(row.priceMid);
  if (!Number.isFinite(price)) {
    return excluded(row, "invalid_price");
  }
  if (row.currency !== "USD") {
    return manual(row, "non_usd_price_kept_for_review");
  }

  const commodity = mapCommodity(row);
  if (!commodity.id) {
    return excluded(row, commodity.reason ?? "no_confirmed_commodity_mapping");
  }
  if (!passesPlausiblePriceRange(commodity.id, price)) {
    return excluded(row, "price_outside_plausible_range_for_commodity", commodity);
  }

  const basis = mapBasis(row);
  if (!basis.id) {
    return manual(row, basis.reason ?? "no_confirmed_basis_mapping", commodity);
  }

  if (!passesSpotMonthRule(row)) {
    return excluded(row, "delivery_month_is_not_publication_month_or_next_month", commodity, basis);
  }

  const confidence = Number(row.confidence);
  if (!Number.isFinite(confidence) || confidence < minimumConfidence(row.source)) {
    return manual(row, "low_ocr_or_extraction_confidence", commodity, basis);
  }

  return {
    ...row,
    normalizedCommodityId: commodity.id,
    normalizedCommodityLabel: commodity.label,
    normalizedBasisId: basis.id,
    normalizedBasisLabel: basis.label,
    normalizedDate: row.reportDate,
    normalizedValueUsd: round(price),
    priceStatus: "observed",
    auditStatus: "mapped_candidate",
    auditReason: "mapped_by_partner_rules_pending_broker_audit",
    importReadiness: "ready_after_audit",
  };
}

function passesPlausiblePriceRange(commodityId: string, price: number) {
  if (["corn", "wheat_11_5pro", "wheat_feed"].includes(commodityId)) {
    return price >= 100 && price <= 400;
  }
  if (["sunflower", "rapeseed_non_gmo", "soybean_gmo", "soybean_non_gmo"].includes(commodityId)) {
    return price >= 250 && price <= 1000;
  }
  return price >= 100 && price <= 1000;
}

function mapCommodity(row: PreviewRow) {
  const value = `${row.rawCommodity} ${row.rawContext}`.toLowerCase();
  if (/barley/.test(value)) {
    return { id: "", label: "", reason: "barley_raw_archive_only_partner_confirmed_not_needed_now" };
  }
  if (/wheat[_ ]?3|пшениця 3|wheat_11_5pro|11[,.]5/.test(value)) {
    return { id: "wheat_11_5pro", label: "Wheat 11.5pro SSI" };
  }
  if (/wheat[_ ]?4|пшениця 4|feed wheat|фураж|wheat_feed/.test(value)) {
    return { id: "wheat_feed", label: "Feed wheat SSI" };
  }
  if (/corn|кукурудза/.test(value)) {
    return { id: "corn", label: "Corn SSI" };
  }
  if (/sunflower|соняшник/.test(value)) {
    return { id: "sunflower", label: "Sunflower SSI" };
  }
  if (/rapeseed|ріпак/.test(value)) {
    return { id: "rapeseed_non_gmo", label: "Rapeseed NON-GMO SSI" };
  }
  if (/soybean_gmo|соя.*гмо|\(гмо\)|\bgmo\b/.test(value) && !/non|не-гмо|не гмо/.test(value)) {
    return { id: "soybean_gmo", label: "Soybean GMO SSI" };
  }
  if (/soybean_non_gmo|не-гмо|не гмо|non-gmo|non gmo/.test(value)) {
    return { id: "soybean_non_gmo", label: "Soybean NON-GMO SSI" };
  }
  return { id: "", label: "", reason: "no_confirmed_commodity_mapping" };
}

function mapBasis(row: PreviewRow) {
  const value = `${row.rawBasis} ${row.rawContext}`.toLowerCase();
  if (/одеса|odesa|півден|pivden|чорномор|chornomor|chernomor|port/.test(value)) {
    return {
      id: "cpt_port_historical_proxy",
      label: "Historical CPT Port proxy",
    };
  }
  if (/завод|plant|crush|перероб/.test(value)) {
    return {
      id: "oilseeds_crush_historical_proxy",
      label: "Historical oilseeds crush proxy",
    };
  }
  if (/tbt/.test(value)) {
    return {
      id: "raw_tbt_review",
      label: "DAP TBT raw basis review",
      reason: "DAP_TBT_not_yet_confirmed_as_CPT_Port_proxy",
    };
  }
  if (/кордон|chop|fca/.test(value)) {
    return {
      id: "border_raw_review",
      label: "Border/FCA raw review",
      reason: "border_basis_not_part_of_this_CPT_Port_mapping_pass",
    };
  }
  return { id: "", label: "", reason: "no_confirmed_basis_mapping" };
}

function passesSpotMonthRule(row: PreviewRow) {
  const period = row.rawDeliveryPeriod.trim().toLowerCase();
  if (!period || /unverified/.test(period)) {
    return true;
  }
  const monthIndex = MONTHS.findIndex((month) => period.includes(month));
  if (monthIndex < 0) {
    return true;
  }
  const reportDate = new Date(`${row.reportDate}T00:00:00.000Z`);
  if (Number.isNaN(reportDate.getTime())) {
    return false;
  }
  const current = reportDate.getUTCMonth();
  const next = (current + 1) % 12;
  return monthIndex === current || monthIndex === next;
}

function minimumConfidence(source: string) {
  if (source === "spike_brokers") return 0.8;
  if (source === "kernelprices") return 0.55;
  if (source === "SoftComTrading") return 0.4;
  if (source === "soufflet_negoce") return 0.3;
  return 0.6;
}

function manual(
  row: PreviewRow,
  reason: string,
  commodity = mapCommodity(row),
  basis = mapBasis(row),
): NormalizedRow {
  return {
    ...row,
    normalizedCommodityId: commodity.id,
    normalizedCommodityLabel: commodity.label,
    normalizedBasisId: basis.id,
    normalizedBasisLabel: basis.label,
    normalizedDate: row.reportDate,
    normalizedValueUsd: Number.isFinite(Number(row.priceMid)) ? round(Number(row.priceMid)) : "",
    priceStatus: "observed",
    auditStatus: "manual_review",
    auditReason: reason,
    importReadiness: "needs_manual_check",
  };
}

function excluded(
  row: PreviewRow,
  reason: string,
  commodity = mapCommodity(row),
  basis = mapBasis(row),
): NormalizedRow {
  return {
    ...row,
    normalizedCommodityId: commodity.id,
    normalizedCommodityLabel: commodity.label,
    normalizedBasisId: basis.id,
    normalizedBasisLabel: basis.label,
    normalizedDate: row.reportDate,
    normalizedValueUsd: Number.isFinite(Number(row.priceMid)) ? round(Number(row.priceMid)) : "",
    priceStatus: "observed",
    auditStatus: "excluded",
    auditReason: reason,
    importReadiness: "do_not_import",
  };
}

function toDailyObservedRow(row: NormalizedRow) {
  return {
    date: row.normalizedDate,
    commodityId: row.normalizedCommodityId,
    commodityLabel: row.normalizedCommodityLabel,
    basisId: row.normalizedBasisId,
    basisLabel: row.normalizedBasisLabel,
    valueUsd: row.normalizedValueUsd,
    priceStatus: row.priceStatus,
    source: row.source,
    sourceMessageId: row.sourceMessageId,
    sourceDate: row.sourceDate,
    rawCommodity: row.rawCommodity,
    rawBasis: row.rawBasis,
    rawDeliveryPeriod: row.rawDeliveryPeriod,
    confidence: row.confidence,
    auditStatus: row.auditStatus,
    auditReason: row.auditReason,
    note: "Observed reconstructed historical price archive row. Not official SPIKE index.",
  };
}

function buildCoverageRows(rows: NormalizedRow[]) {
  const grouped = new Map<string, {
    source: string;
    auditStatus: string;
    rows: number;
    dates: Set<string>;
    commodities: Set<string>;
    minDate: string;
    maxDate: string;
  }>();
  for (const row of rows) {
    const key = `${row.source}::${row.auditStatus}`;
    const current = grouped.get(key) ?? {
      source: row.source,
      auditStatus: row.auditStatus,
      rows: 0,
      dates: new Set<string>(),
      commodities: new Set<string>(),
      minDate: row.normalizedDate,
      maxDate: row.normalizedDate,
    };
    current.rows += 1;
    current.dates.add(row.normalizedDate);
    if (row.normalizedCommodityId) current.commodities.add(row.normalizedCommodityId);
    if (row.normalizedDate < current.minDate) current.minDate = row.normalizedDate;
    if (row.normalizedDate > current.maxDate) current.maxDate = row.normalizedDate;
    grouped.set(key, current);
  }
  return [...grouped.values()].map((row) => ({
    source: row.source,
    auditStatus: row.auditStatus,
    rows: row.rows,
    observedDates: row.dates.size,
    commodities: [...row.commodities].sort().join(", "),
    minDate: row.minDate,
    maxDate: row.maxDate,
  }));
}

function buildMappingRules() {
  return [
    {
      rule: "DAP Odesa / Pivdennyi / Chornomorsk",
      action: "Treat as historical proxy for current SSI CPT Port",
      status: "partner_confirmed",
    },
    {
      rule: "Wheat 3 / Пшениця 3 кл",
      action: "Map to SSI Wheat 11.5pro",
      status: "partner_confirmed",
    },
    {
      rule: "Wheat 4 / Пшениця 4 кл Б/Б / feed wheat",
      action: "Map to SSI Feed wheat",
      status: "partner_confirmed",
    },
    {
      rule: "Barley",
      action: "Keep in raw archive only; do not import into working SSI historical layer now",
      status: "partner_confirmed",
    },
    {
      rule: "Delivery month",
      action: "Use only spot/front month: publication month or next month",
      status: "partner_confirmed",
    },
    {
      rule: "Pre-Sep 2025 data",
      action: "Use as reconstructed historical price archive, not official SPIKE index",
      status: "partner_confirmed",
    },
  ];
}

function writeWorkbook(input: {
  cleanCandidates: NormalizedRow[];
  dailyObserved: ReturnType<typeof toDailyObservedRow>[];
  manualReview: NormalizedRow[];
  excluded: NormalizedRow[];
  coverage: ReturnType<typeof buildCoverageRows>;
  mappingRules: ReturnType<typeof buildMappingRules>;
}) {
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "clean_candidates", input.cleanCandidates);
  appendSheet(workbook, "daily_observed", input.dailyObserved);
  appendSheet(workbook, "manual_review", input.manualReview);
  appendSheet(workbook, "excluded", input.excluded);
  appendSheet(workbook, "source_coverage", input.coverage);
  appendSheet(workbook, "mapping_rules", input.mappingRules);
  XLSX.writeFile(workbook, CLEAN_XLSX, { compression: true });
}

function appendSheet(workbook: XLSX.WorkBook, name: string, data: unknown[]) {
  const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ note: "No rows" }]);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

async function writeCsv(filePath: string, rows: NormalizedRow[]) {
  if (!rows.length) {
    await writeFile(filePath, "", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const output = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(String(row[header] ?? ""))).join(",")),
  ].join("\n");
  await writeFile(filePath, `${output}\n`, "utf8");
}

function parseCsv(input: string) {
  const lines = input.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as PreviewRow;
  });
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

main().catch((error) => {
  console.error("[normalize] failed:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
