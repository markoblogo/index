import { readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

type CleanRow = {
  source: string;
  reportDate: string;
  rawCommodity: string;
  rawBasis: string;
  rawDeliveryPeriod: string;
  priceMid: string;
  normalizedCommodityId: string;
  normalizedCommodityLabel: string;
  normalizedBasisId: string;
  normalizedBasisLabel: string;
  normalizedDate: string;
  normalizedValueUsd: string;
  confidence: string;
  rawContext: string;
  [key: string]: string;
};

type WideRow = {
  reportDate: string;
  commodity: string;
  basis: string;
  deliveryPeriod: string;
  Spike_priceMid: number | "";
  kernelprices_priceMid: number | "";
  soufflet_negoce_priceMid: number | "";
  Zaria_priceMid: number | "";
  minPrice: number | "";
  maxPrice: number | "";
  spread: number | "";
  sourceCount: number;
  reviewNote: string;
};

const PREVIEW_ROOT = path.join(process.cwd(), "data", "spike-historical", "preview");
const INPUT_CSV = path.join(PREVIEW_ROOT, "archive_cleaned_candidates.csv");
const OUTPUT_XLSX = path.join(PREVIEW_ROOT, "ssi_historical_broker_daily_audit.xlsx");

const SOURCE_COLUMNS: Array<{ source: string; column: keyof WideRow }> = [
  { source: "spike_brokers", column: "Spike_priceMid" },
  { source: "kernelprices", column: "kernelprices_priceMid" },
  { source: "soufflet_negoce", column: "soufflet_negoce_priceMid" },
  { source: "SoftComTrading", column: "Zaria_priceMid" },
];

const COMMODITY_ORDER = [
  "corn",
  "wheat_11_5pro",
  "wheat_feed",
  "sunflower",
  "rapeseed_non_gmo",
  "soybean_gmo",
  "soybean_non_gmo",
];

async function main() {
  const rows = parseCsv(await readFile(INPUT_CSV, "utf8"));
  const workbook = XLSX.utils.book_new();
  const summary = buildSummary(rows);
  appendSheet(workbook, "summary", summary);

  for (const commodityId of COMMODITY_ORDER) {
    const commodityRows = rows.filter((row) => row.normalizedCommodityId === commodityId);
    if (!commodityRows.length) continue;
    const wideRows = buildWideRows(commodityRows);
    appendSheet(workbook, sheetName(commodityId), wideRows);
  }

  appendSheet(workbook, "all_daily_wide", buildWideRows(rows));
  XLSX.writeFile(workbook, OUTPUT_XLSX, { compression: true });
  console.log("[broker-workbook] xlsx:", OUTPUT_XLSX);
}

function buildWideRows(rows: CleanRow[]): WideRow[] {
  const grouped = new Map<string, CleanRow[]>();
  for (const row of rows) {
    const key = [
      row.normalizedDate || row.reportDate,
      row.normalizedCommodityId || row.rawCommodity,
      row.normalizedBasisId || row.rawBasis,
      normalizeDelivery(row.rawDeliveryPeriod),
    ].join("::");
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((group) => {
      const first = group[0];
      const output: WideRow = {
        reportDate: first.normalizedDate || first.reportDate,
        commodity: first.normalizedCommodityId || first.rawCommodity,
        basis: first.normalizedBasisLabel || first.rawBasis,
        deliveryPeriod: normalizeDelivery(first.rawDeliveryPeriod),
        Spike_priceMid: "",
        kernelprices_priceMid: "",
        soufflet_negoce_priceMid: "",
        Zaria_priceMid: "",
        minPrice: "",
        maxPrice: "",
        spread: "",
        sourceCount: 0,
        reviewNote: "",
      };
      for (const sourceColumn of SOURCE_COLUMNS) {
        const sourceRows = group.filter((row) => row.source === sourceColumn.source);
        const values = sourceRows
          .map((row) => Number(row.normalizedValueUsd || row.priceMid))
          .filter((value) => Number.isFinite(value));
        if (values.length) {
          setSourcePrice(output, sourceColumn.column, round(average(values)));
        }
      }
      const sourceValues = SOURCE_COLUMNS.map((sourceColumn) => output[sourceColumn.column])
        .filter((value): value is number => typeof value === "number");
      output.sourceCount = sourceValues.length;
      if (sourceValues.length) {
        output.minPrice = Math.min(...sourceValues);
        output.maxPrice = Math.max(...sourceValues);
        output.spread = round(output.maxPrice - output.minPrice);
      }
      output.reviewNote = buildReviewNote(output);
      return output;
    })
    .sort((a, b) => `${a.reportDate}${a.commodity}${a.basis}`.localeCompare(`${b.reportDate}${b.commodity}${b.basis}`));
}

function setSourcePrice(row: WideRow, column: keyof WideRow, value: number) {
  if (
    column === "Spike_priceMid" ||
    column === "kernelprices_priceMid" ||
    column === "soufflet_negoce_priceMid" ||
    column === "Zaria_priceMid"
  ) {
    row[column] = value;
  }
}

function buildSummary(rows: CleanRow[]) {
  const summary = COMMODITY_ORDER.map((commodityId) => {
    const commodityRows = rows.filter((row) => row.normalizedCommodityId === commodityId);
    const dates = new Set(commodityRows.map((row) => row.normalizedDate || row.reportDate));
    const sources = new Set(commodityRows.map((row) => row.source));
    const values = commodityRows
      .map((row) => Number(row.normalizedValueUsd || row.priceMid))
      .filter((value) => Number.isFinite(value));
    return {
      commodity: commodityId,
      rows: commodityRows.length,
      dates: dates.size,
      sources: [...sources].sort().join(", "),
      minPrice: values.length ? Math.min(...values) : "",
      maxPrice: values.length ? Math.max(...values) : "",
    };
  });
  return [
    {
      commodity: "Workbook note",
      rows: "One sheet per commodity. Columns are daily priceMid by source/company. This is reconstructed historical price archive, not official SSI index.",
      dates: "",
      sources: "",
      minPrice: "",
      maxPrice: "",
    },
    ...summary,
  ];
}

function buildReviewNote(row: WideRow) {
  if (row.sourceCount <= 1) return "single source";
  if (typeof row.spread === "number" && row.spread >= 15) return "check spread";
  return "ok";
}

function normalizeDelivery(value: string) {
  const normalized = value.trim();
  return normalized || "spot/front month";
}

function sheetName(value: string) {
  return value.replace(/[^a-z0-9_]/gi, "_").slice(0, 31);
}

function appendSheet(workbook: XLSX.WorkBook, name: string, data: unknown[]) {
  const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ note: "No rows" }]);
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 24 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function parseCsv(input: string): CleanRow[] {
  const lines = input.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as CleanRow;
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

main().catch((error) => {
  console.error("[broker-workbook] failed:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
