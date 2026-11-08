import { createHash } from "node:crypto";
import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";

type Quote = { crop: string; venue: string; contract: string; expiry: string; date: string; price: number; unit: string; priceType: "closing" | "settlement"; weeklyChange?: number };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const plain = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ").replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const namedDate = (value: string) => {
  const date = new Date(`${value.replace(/(\d)(st|nd|rd|th)\b/g, "$1")} UTC`);
  return Number.isFinite(date.valueOf()) ? date.toISOString().slice(0, 10) : null;
};

/** Read the named Close column, never the dynamic hero's daily percentage. */
export function parseEuronextCloses(html: string, crop: "corn" | "wheat" | "rapeseed", end: string): Quote[] {
  const text = plain(html), prefix = { corn: "XB", wheat: "ML", rapeseed: "XR" }[crop];
  const observed = text.match(/settled at €[\d.]+\/t on (\d{1,2} [A-Za-z]+ \d{4})/);
  if (!observed || namedDate(observed[1]) !== end) return [];
  const table = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].find(match => /Contract/.test(plain(match[1])) && /Close/.test(plain(match[1])));
  if (!table) return [];
  const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => plain(cell[1])));
  if (rows[0]?.join("|") !== "Contract|Date|Open|High|Low|Close|Volume|OI") return [];
  const date = `${end.slice(8)}/${end.slice(5, 7)}/${end.slice(0, 4)}`;
  const quotes: Quote[] = rows.slice(1).flatMap(row => {
    const contract = row[0]?.match(new RegExp(`^(${prefix}[FGHJKMNQUVXZ]\\d{2})\\s+([A-Za-z]+ \\d{4})$`));
    const price = Number(row[5]);
    return row.length === 8 && row[1] === date && contract && Number.isFinite(price) && price > 0
      ? [{ crop, venue: "MATIF", contract: contract[1], expiry: contract[2], date: end, price, unit: "EUR/t", priceType: "settlement" as const }] : [];
  }).slice(0, 2);
  const delta = text.match(/Over 5 sessions, since (\d{1,2} [A-Za-z]+ \d{4}):\s*([−+\-]?)€([\d.]+)\/t/);
  const previous = new Date(`${end}T00:00:00Z`); previous.setUTCDate(previous.getUTCDate() - 7);
  if (quotes.length && delta && namedDate(delta[1]) === previous.toISOString().slice(0, 10)) quotes[0].weeklyChange = Number(`${delta[2] === "−" ? "-" : delta[2]}${delta[3]}`);
  return quotes;
}

/** An article's up/down fields are DAILY; they never become weekly deltas. */
export function parseBrownfieldCloses(html: string, end: string): Quote[] {
  const heading = plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const date = heading.match(/Closing Grain and Livestock Futures:\s*([A-Za-z]+ \d{1,2}, \d{4})/);
  if (!date || namedDate(date[1]) !== end) return [];
  const text = plain(html).split("Closing prices for selected")[1]?.split("Newsletter Sign Up")[0]?.slice(0, 2000) ?? "";
  const specs = [
    { crop: "corn", label: "corn", unit: "cents/bu", scale: 100 },
    { crop: "soybeans", label: "soybeans", unit: "cents/bu", scale: 100 },
    { crop: "soybean meal", label: "soybean meal", unit: "USD/short ton", scale: 1 },
    { crop: "soybean oil", label: "soybean oil", unit: "cents/lb", scale: 1 },
    { crop: "wheat", label: "Chicago wheat", unit: "cents/bu", scale: 100 },
  ];
  return specs.flatMap(spec => {
    const match = text.match(new RegExp(`([A-Z][a-z]{2})\\. ${spec.label} \\$?([\\d.]+)(?: and ([123])/4| and (1)/2)?(?=,|\\s+(?:up|down))`));
    if (!match) return [];
    const month = months.findIndex(name => name.startsWith(match[1]));
    if (month < 0) return [];
    const year = Number(end.slice(0, 4)) + (month + 1 < Number(end.slice(5, 7)) ? 1 : 0);
    const fractionCents = match[3] ? Number(match[3]) / 4 : match[4] ? 0.5 : 0;
    const price = Math.round((Number(match[2]) * spec.scale + fractionCents * (spec.scale === 100 ? 1 : 0.01)) * 100) / 100;
    return Number.isFinite(price) && price > 0 ? [{ crop: spec.crop, venue: "CBOT", contract: `${spec.crop}:${year}-${String(month + 1).padStart(2, "0")}`,
      expiry: `${months[month]} ${year}`, date: end, price, unit: spec.unit, priceType: "closing" as const }] : [];
  });
}

export async function readSsiWeeklyQuotePage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
  const response = await fetch(url, { headers: { Accept: "text/html" }, cache: "no-store", signal: controller.signal });
  if (!response.ok || !["www.graindecision.com", "www.brownfieldagnews.com", "brownfieldagnews.com"].includes(new URL(response.url).hostname) || !response.body) throw new Error("quote_source_unavailable");
  const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length;
      if (bytes > 2 * 1024 * 1024) throw new Error("quote_source_too_large"); chunks.push(value); }
    return Buffer.concat(chunks).toString("utf8");
  } finally { await reader.cancel().catch(() => undefined); }
  } finally { clearTimeout(timeout); }
}

/** Four allowlisted pages; no search/browser runtime, no stale-date substitution. */
export async function collectSsiWeeklyClosingQuotes(end: string): Promise<MediaHubManualMaterialDigest[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end) || new Date(`${end}T00:00:00Z`).getUTCDay() !== 5) return [];
  const month = months[Number(end.slice(5, 7)) - 1].toLowerCase();
  const sources = ["corn", "wheat", "rapeseed"].map(crop => ({ url: `https://www.graindecision.com/en/analyses/${crop}-euronext`, parse: (html: string) => parseEuronextCloses(html, crop as "corn" | "wheat" | "rapeseed", end) }));
  sources.push({ url: `https://www.brownfieldagnews.com/news/closing-grain-and-livestock-futures-${month}-${Number(end.slice(8))}-${end.slice(0, 4)}/`, parse: html => parseBrownfieldCloses(html, end) });
  const materials: MediaHubManualMaterialDigest[] = [];
  for (const source of sources) {
    try {
      const quotes = source.parse(await readSsiWeeklyQuotePage(source.url));
      if (!quotes.length) continue;
      const text = quotes.map(quote => `${quote.crop}; ${quote.venue}; ${quote.expiry}; ${quote.contract}; ${quote.date}; ${quote.priceType}: ${quote.price} ${quote.unit}; ${quote.weeklyChange === undefined ? "weekly comparison unavailable" : `same-contract weekly change: ${quote.weeklyChange} ${quote.unit}`}\n${JSON.stringify(quote)}`).join("\n");
      materials.push({ id: `closing:${createHash("sha256").update(source.url + text).digest("hex")}`, tenantId: "spike-ua", kind: "weekly_material", sourceType: "scheduled_api", receivedFrom: "scheduler",
        receivedAt: new Date(`${end}T00:00:00Z`), originalUrl: source.url, originalFilename: null, sourceDomain: new URL(source.url).hostname, sourceRegistrationStatus: "allowlisted_weekly_closes",
        extractionStatus: "extracted", extractedText: text, summary: text, extractedFacts: quotes, extractedTables: [], assets: [], extractionReceipts: [], hashtags: [], telegramFromId: null, usedInReportId: null });
    } catch { console.warn("ssi_weekly_closing_source_unavailable", new URL(source.url).hostname); }
  }
  return materials;
}
