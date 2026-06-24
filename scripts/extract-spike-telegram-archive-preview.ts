import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type RawMessage = {
  source: { handle: string; kind: string };
  telegram: { id: number; date: string };
  text: string;
  hasMedia: boolean;
  mediaPath?: string | null;
};

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
};

const RAW_ROOT = path.join(process.cwd(), "data", "spike-historical", "raw", "telegram");
const PREVIEW_ROOT = path.join(process.cwd(), "data", "spike-historical", "preview");
const PREVIEW_CSV = path.join(PREVIEW_ROOT, "archive_preview.csv");
const OCR_ROOT = path.join(PREVIEW_ROOT, "ocr");

const SPIKE_COMMODITY_MAP: Record<string, string> = {
  КУКУРУДЗА: "corn",
  ПШЕНИЦЯ: "wheat",
  СОНЯШНИК: "sunflower",
  РІПАК: "rapeseed",
  СОЯ: "soybean",
};

const SOFT_ROWS = [
  "Пшениця 2 кл",
  "Пшениця 3 кл",
  "Пшениця 4 кл Б/Б",
  "Кукурудза",
];

const KERNEL_COLUMNS = ["Wheat 2", "Wheat 3", "Wheat 4", "Barley", "Corn"];
const MONTHS =
  "(january|february|march|april|may|june|july|august|september|october|november|december)";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    source: get("--source"),
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    skipOcr: args.includes("--skip-ocr"),
  };
}

async function readJsonl(filePath: string): Promise<RawMessage[]> {
  const text = await readFile(filePath, "utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RawMessage);
}

function parseDateFromText(text: string, fallbackIso: string) {
  const match = text.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  if (!match) {
    return fallbackIso.slice(0, 10);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function extractSpikeTextRows(message: RawMessage): PreviewRow[] {
  if (!/Weekly Commodity Market/i.test(message.text)) {
    return [];
  }
  const reportDate = parseDateFromText(message.text, message.telegram.date);
  const rows: PreviewRow[] = [];
  let section = "";

  for (const rawLine of message.text.split("\n")) {
    const line = rawLine.trim();
    const detectedSection = detectSpikeSection(line);
    if (detectedSection) {
      section = detectedSection;
    }
    if (!line.startsWith("•")) {
      continue;
    }
    if (!section || !line.match(/[~≈]?\s*\d{2,4}/)) {
      continue;
    }
    const parsed = parsePriceText(line);
    if (!parsed) {
      continue;
    }
    const normalizedCommodity = refineSpikeCommodity(section, line);
    rows.push({
      source: message.source.handle,
      sourceKind: "telegram_text_weekly",
      sourceMessageId: String(message.telegram.id),
      sourceDate: message.telegram.date,
      reportDate,
      extractionMethod: "regex_text",
      rawCommodity: normalizedCommodity,
      rawBasis: extractBasis(line),
      rawDeliveryPeriod: extractDeliveryPeriod(line),
      rawPriceText: parsed.raw,
      priceLow: parsed.low.toString(),
      priceHigh: parsed.high.toString(),
      priceMid: parsed.mid.toString(),
      currency: parsed.currency,
      vatIncluded: /ПДВ|VAT/i.test(line) ? "true" : "false",
      mappedCommodityId: "",
      mappedBasisId: "",
      mappingStatus: isSafeSpikeMapping(section, line) ? "auto_candidate" : "raw_only",
      confidence: "0.86",
      mediaPath: "",
      rawContext: line,
    });
  }
  return rows;
}

function detectSpikeSection(line: string) {
  const upper = line.toUpperCase();
  for (const section of Object.keys(SPIKE_COMMODITY_MAP)) {
    if (upper.includes(section)) {
      return section;
    }
  }
  return "";
}

function refineSpikeCommodity(section: string, line: string) {
  const base = SPIKE_COMMODITY_MAP[section] ?? section.toLowerCase();
  if (section === "ПШЕНИЦЯ") {
    if (/12\.5pro/i.test(line)) return "wheat_12_5pro";
    if (/11\.5pro/i.test(line)) return "wheat_11_5pro";
    if (/фураж/i.test(line)) return "wheat_feed";
  }
  if (section === "СОЯ") {
    if (/НЕ-?ГМО|НЕ ГМО|NON-?GMO/i.test(line)) return "soybean_non_gmo";
    if (/ГМО|GMO/i.test(line)) return "soybean_gmo";
  }
  if (section === "РІПАК") {
    if (/НЕ-?ГМО|НЕ ГМО|NON-?GMO/i.test(line)) return "rapeseed_non_gmo";
  }
  return base;
}

function isSafeSpikeMapping(section: string, line: string) {
  if (!/DAP Україна/i.test(line)) return false;
  if (/Італія|Німеччина|Нідерланди/i.test(line)) return false;
  return ["КУКУРУДЗА", "ПШЕНИЦЯ", "СОНЯШНИК", "РІПАК", "СОЯ"].includes(section);
}

function extractBasis(line: string) {
  const match = line.match(/(DAP|FCA|CPT)\s+([^~≈$€]+)/i);
  return match ? `${match[1]} ${match[2]}`.replace(/\s+/g, " ").trim() : "";
}

function extractDeliveryPeriod(line: string) {
  const match = line.match(/(?:поставка|врожай)\s+([^:;,.]+)/i);
  return match?.[1]?.trim() ?? "";
}

function parsePriceText(line: string) {
  const normalized = line.replace(/\s+/g, " ");
  const patterns = [
    /[~≈]?\s*(\d{2,4}(?:[.,]\d+)?)\s*[-–]\s*(\d{2,4}(?:[.,]\d+)?)\s*([$€])/,
    /([$€])\s*(\d{2,4}(?:[.,]\d+)?)\s*[-–]\s*(\d{2,4}(?:[.,]\d+)?)/,
    /[~≈]?\s*(\d{2,4}(?:[.,]\d+)?)\s*([$€])/,
    /([$€])\s*(\d{2,4}(?:[.,]\d+)?)/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    if (match.length === 4 && /^[\d.,]+$/.test(match[1])) {
      const low = toNumber(match[1]);
      const high = toNumber(match[2]);
      return priceResult(match[0], low, high, match[3]);
    }
    if (match.length === 4) {
      const low = toNumber(match[2]);
      const high = toNumber(match[3]);
      return priceResult(match[0], low, high, match[1]);
    }
    if (match.length === 3 && /^[\d.,]+$/.test(match[1])) {
      const value = toNumber(match[1]);
      return priceResult(match[0], value, value, match[2]);
    }
    if (match.length === 3) {
      const value = toNumber(match[2]);
      return priceResult(match[0], value, value, match[1]);
    }
  }
  return null;
}

function priceResult(raw: string, low: number, high: number, currencySymbol: string) {
  return {
    raw,
    low,
    high,
    mid: round((low + high) / 2),
    currency: currencySymbol === "€" ? "EUR" : "USD",
  };
}

function toNumber(value: string) {
  return Number(value.replace(",", "."));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

async function runTesseract(mediaPath: string) {
  const absolutePath = path.join(process.cwd(), mediaPath);
  const { stdout } = await execFileAsync("tesseract", [absolutePath, "stdout", "-l", "eng", "--psm", "6"], {
    maxBuffer: 1024 * 1024 * 10,
  });
  return stdout;
}

async function getOcrText(message: RawMessage, skipOcr: boolean) {
  if (!message.mediaPath) return "";
  const sourceDir = path.join(OCR_ROOT, message.source.handle);
  await mkdir(sourceDir, { recursive: true });
  const sidecar = path.join(sourceDir, `${message.telegram.date.slice(0, 10)}_${message.telegram.id}.txt`);
  if (existsSync(sidecar)) {
    return readFile(sidecar, "utf8");
  }
  if (skipOcr) {
    return "";
  }
  const text = await runTesseract(message.mediaPath);
  await writeFile(sidecar, text, "utf8");
  return text;
}

async function extractImageRows(message: RawMessage, options: { skipOcr: boolean }): Promise<PreviewRow[]> {
  if (!message.mediaPath) return [];
  const ocr = await getOcrText(message, options.skipOcr);
  if (!ocr.trim()) {
    return [];
  }
  if (message.source.handle === "kernelprices") {
    return extractKernelRows(message, ocr);
  }
  if (message.source.handle === "SoftComTrading") {
    return extractSoftRows(message, ocr);
  }
  return [];
}

function extractKernelRows(message: RawMessage, ocr: string): PreviewRow[] {
  const reportDate = extractEnglishDate(ocr) ?? message.telegram.date.slice(0, 10);
  const rows: PreviewRow[] = [];
  const monthLineRe = new RegExp(`^\\W*${MONTHS}\\b(.+)`, "i");
  for (const rawLine of ocr.split("\n")) {
    const line = rawLine.replace(/\|/g, " ").replace(/\[/g, " ").trim();
    const match = line.match(monthLineRe);
    if (!match) continue;
    const deliveryMonth = match[1];
    const numbers = [...line.matchAll(/\d{2,4}(?:\/\d{2,4})?\*?/g)].map((item) => item[0]);
    if (numbers.length < 2) continue;
    const priceTokens = numbers.slice(0, KERNEL_COLUMNS.length);
    KERNEL_COLUMNS.forEach((commodity, index) => {
      const token = priceTokens[index];
      if (!token || token.includes("-")) return;
      const parsed = parseSlashPrice(token);
      if (!parsed) return;
      rows.push(baseImageRow(message, {
        reportDate,
        rawCommodity: commodity,
        rawBasis: "DAP TBT",
        rawDeliveryPeriod: deliveryMonth.toLowerCase(),
        rawPriceText: token,
        priceLow: parsed.low,
        priceHigh: parsed.high,
        priceMid: parsed.mid,
        currency: "USD",
        confidence: "0.58",
        rawContext: rawLine.trim(),
      }));
    });
  }
  return rows;
}

function extractSoftRows(message: RawMessage, ocr: string): PreviewRow[] {
  const reportDate = message.telegram.date.slice(0, 10);
  const rows: PreviewRow[] = [];
  const lines = ocr.split("\n").map((line) => line.trim()).filter(Boolean);
  const tableLines = lines.filter((line) => /\d{3}\s*\/\s*\d{4,5}/.test(line));
  let rowIndex = 0;
  for (const rawLine of tableLines) {
    if (rowIndex >= SOFT_ROWS.length) break;
    const tokens = [...rawLine.matchAll(/\d{3}\s*\/\s*\d{4,5}/g)].map((match) => match[0]);
    if (tokens.length === 0) continue;
    const commodity = SOFT_ROWS[rowIndex] ?? `softcom_row_${rowIndex + 1}`;
    tokens.slice(0, 2).forEach((token, index) => {
      const parsed = parseSlashPrice(token);
      if (!parsed) return;
      rows.push(baseImageRow(message, {
        reportDate,
        rawCommodity: commodity,
        rawBasis: index === 0 ? "Південний port" : "Чорноморськ port",
        rawDeliveryPeriod: "",
        rawPriceText: token,
        priceLow: parsed.low,
        priceHigh: parsed.high,
        priceMid: parsed.mid,
        currency: "USD",
        confidence: "0.42",
        rawContext: rawLine,
      }));
    });
    rowIndex += 1;
  }
  return rows;
}

function baseImageRow(
  message: RawMessage,
  input: {
    reportDate: string;
    rawCommodity: string;
    rawBasis: string;
    rawDeliveryPeriod: string;
    rawPriceText: string;
    priceLow: number;
    priceHigh: number;
    priceMid: number;
    currency: string;
    confidence: string;
    rawContext: string;
  },
): PreviewRow {
  return {
    source: message.source.handle,
    sourceKind: "telegram_image_ocr",
    sourceMessageId: String(message.telegram.id),
    sourceDate: message.telegram.date,
    reportDate: input.reportDate,
    extractionMethod: "tesseract_ocr_heuristic",
    rawCommodity: input.rawCommodity,
    rawBasis: input.rawBasis,
    rawDeliveryPeriod: input.rawDeliveryPeriod,
    rawPriceText: input.rawPriceText,
    priceLow: String(input.priceLow),
    priceHigh: String(input.priceHigh),
    priceMid: String(input.priceMid),
    currency: input.currency,
    vatIncluded: "false",
    mappedCommodityId: "",
    mappedBasisId: "",
    mappingStatus: "raw_only",
    confidence: input.confidence,
    mediaPath: message.mediaPath ?? "",
    rawContext: input.rawContext,
  };
}

function parseSlashPrice(token: string) {
  const cleaned = token.replace("*", "");
  const parts = cleaned.split("/");
  const first = Number(parts[0]);
  if (!Number.isFinite(first)) return null;
  return { low: first, high: first, mid: first };
}

function extractEnglishDate(text: string) {
  const match = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i,
  );
  if (!match) return null;
  const date = new Date(`${match[1]} ${match[2]}, ${match[3]} UTC`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function extractNumericImageDate(text: string) {
  const match = text.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function writeCsv(rows: PreviewRow[]) {
  const headers = [
    "source",
    "sourceKind",
    "sourceMessageId",
    "sourceDate",
    "reportDate",
    "extractionMethod",
    "rawCommodity",
    "rawBasis",
    "rawDeliveryPeriod",
    "rawPriceText",
    "priceLow",
    "priceHigh",
    "priceMid",
    "currency",
    "vatIncluded",
    "mappedCommodityId",
    "mappedBasisId",
    "mappingStatus",
    "confidence",
    "mediaPath",
    "rawContext",
  ];
  const output = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(String(row[header as keyof PreviewRow] ?? ""))).join(",")),
  ].join("\n");
  await writeFile(PREVIEW_CSV, `${output}\n`, "utf8");
}

async function main() {
  const options = parseArgs();
  await mkdir(PREVIEW_ROOT, { recursive: true });
  const handles = options.source
    ? options.source.split(",").map((source) => source.trim())
    : ["spike_brokers", "kernelprices", "SoftComTrading"];
  const allRows: PreviewRow[] = [];

  for (const handle of handles) {
    const messagesPath = path.join(RAW_ROOT, handle, "messages.jsonl");
    const messages = (await readJsonl(messagesPath)).slice(0, options.limit);
    console.log("[extract]", handle, messages.length, "messages");
    for (const message of messages) {
      if (handle === "spike_brokers") {
        allRows.push(...extractSpikeTextRows(message));
      } else if (message.hasMedia) {
        try {
          allRows.push(...(await extractImageRows(message, { skipOcr: options.skipOcr })));
        } catch (error) {
          console.warn("[extract-image-failed]", handle, message.telegram.id, error instanceof Error ? error.message : error);
        }
      }
    }
  }

  await writeCsv(allRows);
  const summary = summarizeRows(allRows);
  await writeFile(path.join(PREVIEW_ROOT, "archive_preview_summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.table(summary.bySource);
  console.log("[extract] rows:", allRows.length);
  console.log("[extract] csv:", PREVIEW_CSV);
}

function summarizeRows(rows: PreviewRow[]) {
  const bySource = Object.values(
    rows.reduce<Record<string, { source: string; rows: number; observedDates: Set<string>; commodities: Set<string> }>>(
      (accumulator, row) => {
        accumulator[row.source] ??= {
          source: row.source,
          rows: 0,
          observedDates: new Set(),
          commodities: new Set(),
        };
        accumulator[row.source].rows += 1;
        accumulator[row.source].observedDates.add(row.reportDate);
        accumulator[row.source].commodities.add(row.rawCommodity);
        return accumulator;
      },
      {},
    ),
  ).map((item) => ({
    source: item.source,
    rows: item.rows,
    observedDates: item.observedDates.size,
    commodities: item.commodities.size,
  }));
  return {
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    bySource,
  };
}

main().catch((error) => {
  console.error("[extract] failed:", error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
