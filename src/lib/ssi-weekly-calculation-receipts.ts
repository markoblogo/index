import type { MediaHubManualMaterialDigest } from "./media-hub-manual-materials";
import type { MediaHubEvidenceItem } from "./media-hub-evidence";
import { renderSsiWeeklySpreadsheetEvidence } from "./media-hub-ssi-weekly-pattern";

type Block = { materialId: string; url?: string; cohort: string; cutoff: string; coverageStart?: string; comparisonRole: string;
  unit: string; columns?: string[]; total?: string[]; valueTotal?: { unit: string; value: string };
  valueByCommodity?: Array<{ metric: string; unit: string; value: string }>;
  destinationsByCommodity?: Array<{ metric: string; unit: string; destinations: Array<{ country: string; tonnes: string }> }> };
const round = (value: number) => Math.round(value * 10) / 10;
const num = (value: string | undefined) => value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;
const code = (value: string) => value.match(/^\d{4}/)?.[0] ?? value;

/** Independent arithmetic receipts, never copied from generated report prose. */
export function ssiCalculationReceipts(materials: MediaHubManualMaterialDigest[], end: string): MediaHubEvidenceItem[] {
  const blocks: Block[] = renderSsiWeeklySpreadsheetEvidence(materials, end).split("\n").filter(line => line.startsWith("{")).map(line => JSON.parse(line));
  return blocks.filter(block => block.unit === "tonnes").map((block, index) => {
    const weights = new Map((block.columns ?? []).slice(1).flatMap((metric, i) => {
      const value = num(block.total?.[i + 1]); return value === null ? [] : [[code(metric), { metric, value }] as const];
    }));
    const values = new Map((block.valueByCommodity ?? []).flatMap(item => {
      const value = item.unit === "thousand USD" ? num(item.value) : null;
      return value === null ? [] : [[code(item.metric), value] as const];
    }));
    const total = weights.get("Всього")?.value, totalUsd = block.valueTotal?.unit === "thousand USD" ? num(block.valueTotal.value) : null;
    const lines = [`${block.cohort}; ${block.comparisonRole}; ${block.coverageStart ?? "unknown start"}..${block.cutoff}; material ${block.materialId}.`];
    for (const [key, item] of weights) {
      const usd = values.get(key);
      lines.push(`${item.metric}: ${item.value} т = ${round(item.value / 1000)} тис. т${usd === undefined ? "" : `; ${usd} тис. дол. США = ${round(usd / 1000)} млн USD`}${total && key !== "Всього" ? `; частка в загальному тоннажі агроекспорту ${round(item.value / total * 100)}%` : ""}${usd !== undefined && totalUsd ? `; частка у вартості агроекспорту ${round(usd / totalUsd * 100)}%` : ""}.`);
    }
    if (total && ["1001", "1003", "1005"].every(key => weights.has(key))) {
      const grain = ["1001", "1003", "1005"].reduce((sum, key) => sum + weights.get(key)!.value, 0);
      lines.push(`Зернова складова: пшениця, кукурудза, ячмінь; зернова частка ${block.cohort === "road_passage" ? "автопереходів автопотоку" : "митного експорту"}: ${round(grain / 1000)} тис. т; ${round(grain / total * 100)}%. Формула: (${["1001", "1003", "1005"].map(key => weights.get(key)!.value).join(" + ")}) / ${total} * 100.`);
    }
    for (const group of block.destinationsByCommodity ?? []) {
      const denominator = weights.get(code(group.metric))?.value;
      if (group.unit !== "tonnes" || !denominator) continue;
      const countries = group.destinations.flatMap(item => { const value = num(item.tonnes); return value === null ? [] : [{ ...item, value }]; });
      lines.push(`${group.metric}; покупці: ${countries.map(item => `${item.country}: ${round(item.value / 1000)} тис. т, частка ${round(item.value / denominator * 100)}%`).join("; ")}.`);
      if (countries.length >= 2) lines.push(`${group.metric}: два найбільші покупці разом дали ${round((countries[0].value + countries[1].value) / denominator * 100)}% експорту; ${countries[0].country} + ${countries[1].country}; знаменник ${denominator} т; зріз ${block.cutoff}.`);
    }
    const previous = blocks.find(item => item.cohort === block.cohort && item.comparisonRole === "matched_previous_month" && item.cutoff.slice(8) === block.cutoff.slice(8));
    if (block.comparisonRole === "current" && previous) {
      for (const [key, current] of weights) {
        const position = previous.columns?.findIndex(metric => code(metric) === key) ?? -1;
        const before = position > 0 ? num(previous.total?.[position]) : null;
        if (before !== null && before > 0) lines.push(`${current.metric}: до ${previous.cutoff} зміна тоннажу ${round((current.value - before) / 1000)} тис. т (${round((current.value / before - 1) * 100)}%).`);
        const usd = values.get(key), beforeUsd = previous.valueByCommodity?.find(item => code(item.metric) === key && item.unit === "thousand USD");
        const previousUsd = num(beforeUsd?.value);
        if (usd !== undefined && previousUsd !== null && previousUsd > 0) lines.push(`${current.metric}: зміна у вартості ${round((usd - previousUsd) / 1000)} млн USD (${round((usd / previousUsd - 1) * 100)}%).`);
      }
    }
    const text = lines.join("\n");
    return { id: `manual:${block.materialId}:arithmetic:${index}`, claim: text, excerpt: `${text}\n${text.replace(/(\d)\.(\d)/g, "$1,$2")}`,
      sourceType: "manual_material", confidence: "high", sourceDate: block.cutoff, sourceTitle: `Source arithmetic ${block.cohort}; units and denominator retained`, sourceUrl: block.url ?? null, usedInSection: "source_materials" };
  });
}
