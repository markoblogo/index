import type { VideoClaim } from "./ssi-weekly-video-packet";

const units: Record<string, RegExp> = {
  "USD/t": /\$|USD|долар/i, "EUR/t": /€|EUR|євро/i, "USD/short ton": /коротк.{0,20}тон|short ton/i,
  "cents/bu": /цент.{0,12}бушел|cents?.{0,8}bushel/i, "cents/lb": /цент.{0,12}фунт|cents?.{0,8}pound/i,
  "thousand tonnes": /тис\.?\s*(?:т|тонн)|thousand tonnes/i, "million tonnes": /млн\s*(?:т|тонн)|million tonnes/i,
  "tonnes": /тонн|tonnes/i, "wagons/day": /ваг.{0,8}(?:доб|день)|wagons?.{0,8}day/i,
  "%": /%/, "percentage points": /в\.?\s*п\.?|percentage points/i,
  "USD/bbl": /барел|барель|barrel/i, "MYR/t": /MYR/i,
};
const bases: Record<string, RegExp> = {
  "CPT Odesa": /CPT\s*(?:Одеса|Odesa)|CPT\s*(?:порт|port)/i,
  "CPT port": /CPT\s*(?:Одеса|Odesa|порт|port)/i,
  "CPT plant": /CPT\s*(?:завод|plant)|перероб/i,
  "FCA Chop": /FCA\s*(?:Чоп|Chop)/i, "CBOT": /CBOT/i, "MATIF": /MATIF|Euronext/i,
  "BMD": /BMD|пальмов/i, "WTI": /WTI/i, "Brent": /Brent/i,
  "FOB Northern Europe": /FOB.{0,30}(?:Північн|Northern)/i,
  "FOB Netherlands": /FOB.{0,30}(?:Нідерланд|Netherlands|Dutch)/i,
  "FCA Hamburg": /FCA.{0,20}(?:Гамбург|Hamburg)/i,
  "customs clearance": /митн|оформ|customs|clearance/i,
  "road passage": /авто|road/i, "rail transportation": /залізнич|УЗ|rail/i,
  "border handovers": /передач|переход|кордон|border/i,
};
export const normalizeVideoSource = (text: string) => text.replace(/<[^>]*>/g, " ").replace(/&(?:amp|nbsp|quot);/g, " ").replace(/\s+/g, " ").trim();

export function videoClaimMatchesReport(claim: VideoClaim & { sourceQuote: string }, source: string, reportEnd: string) {
  if (typeof claim.sourceQuote !== "string" || !normalizeVideoSource(source).includes(normalizeVideoSource(claim.sourceQuote))) return false;
  const quote = normalizeVideoSource(claim.sourceQuote);
  if (!units[claim.unit]?.test(quote) || !bases[claim.basis]?.test(quote)) return false;
  if (/коротк.{0,20}тон|short ton/i.test(quote) && claim.unit !== "USD/short ton") return false;
  if ((claim.unit === "tonnes" || claim.unit === "thousand tonnes") && /млн\s*(?:т|тонн)|million tonnes/i.test(quote)) return false;
  const numbers = [...quote.matchAll(/[-−]?\d+(?:[ '\u2019\u00a0\u202f]\d{3})*(?:[.,]\d+)?/gu)];
  if (!numbers.some(match => Math.abs(Number(match[0].replace(/−/g, "-").replace(/[ '\u2019\u00a0\u202f]/g, "").replace(",", ".")) - claim.value) < 0.000001)) return false;
  if (![claim.period.start, claim.period.end].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d) || claim.period.start > claim.period.end) return false;
  if (claim.period.end !== reportEnd) {
    const [, month, day] = claim.period.end.split("-");
    if (!quote.includes(claim.period.end) && !quote.includes(`${day}.${month}`) && !quote.includes(`${day}/${month}`)) return false;
  }
  return claim.period.end <= reportEnd;
}
