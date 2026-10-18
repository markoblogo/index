import { posix } from "node:path";
import { strFromU8, unzipSync } from "fflate";

type OfficeTable = { sheetName: string; header: string[]; rows: string[][]; inferredTopic: string; parseWarnings: string[] };
export type OfficeExtraction = { text: string; tables: OfficeTable[]; warnings: string[] };

function decodeXml(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (entity, value: string) => {
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (!value.startsWith("#")) return named[value] ?? entity;
    const point = value[1].toLowerCase() === "x" ? parseInt(value.slice(2), 16) : parseInt(value.slice(1), 10);
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : " ";
  });
}
function attribute(xml: string, name: string) {
  const match = new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)')`).exec(xml);
  return decodeXml(match?.[1] ?? match?.[2] ?? "");
}
function textRuns(xml: string) {
  return [...xml.matchAll(/<(?:w:)?t\b[^>]*>([\s\S]*?)<\/(?:w:)?t>/g)].map((match) => decodeXml(match[1])).join("");
}

// Read only selected XML parts; never execute formulas, links or document macros.
export function extractBoundedOfficeFile(bytes: Buffer, filename: string): OfficeExtraction | null {
  if (!/\.(xlsx|docx)$/i.test(filename)) return null;
  try {
    let selectedBytes = 0;
    let selectedEntries = 0;
    const files = unzipSync(bytes, { filter(entry) {
      if (!/^(?:word\/document\.xml|xl\/workbook\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/sharedStrings\.xml|xl\/worksheets\/[^/]+\.xml)$/.test(entry.name)) return false;
      selectedBytes += entry.originalSize;
      selectedEntries += 1;
      if (entry.originalSize > 8 * 1024 * 1024 || selectedBytes > 24 * 1024 * 1024 || selectedEntries > 256) throw new Error("Office extraction limit exceeded");
      return true;
    } });
    const xml = (name: string) => {
      const data = files[name];
      if (!data) return "";
      const value = strFromU8(data);
      if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw new Error("Document entities are not supported");
      return value;
    };
    if (/\.docx$/i.test(filename)) {
      const document = xml("word/document.xml");
      if (!document) return null;
      const warnings = /<w:del\b/.test(document) ? ["tracked_deletions_omitted"] : [];
      const text = decodeXml(document.replace(/<w:del\b[^>]*>[\s\S]*?<\/w:del>/g, "")
        .replace(/<w:tab\b[^>]*\/>/g, "\t").replace(/<w:br\b[^>]*\/>/g, "\n")
        .replace(/<\/w:tc>/g, "\t").replace(/<\/w:(?:p|tr)>/g, "\n")
        .replace(/<[^>]+>/g, "")).replace(/\n{3,}/g, "\n\n").trim();
      return { text: text.slice(0, 18_000), tables: [], warnings: [...warnings, ...(text.length > 18_000 ? ["text_truncated"] : [])] };
    }
    const shared = [...xml("xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textRuns(match[1]));
    const relationships = new Map([...xml("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)\/?\s*>/g)]
      .filter((match) => attribute(match[1], "TargetMode") !== "External")
      .map((match) => [attribute(match[1], "Id"), attribute(match[1], "Target")]));
    let sheets = [...xml("xl/workbook.xml").matchAll(/<sheet\b([^>]*)\/?\s*>/g)].map((match) => {
      const target = relationships.get(attribute(match[1], "r:id")) ?? "";
      return { name: attribute(match[1], "name"), path: target.startsWith("/") ? target.slice(1) : posix.normalize(posix.join("xl", target)) };
    });
    if (!sheets.length) sheets = Object.keys(files).filter((name) => name.startsWith("xl/worksheets/"))
      .sort().map((name) => ({ name: posix.basename(name, ".xml"), path: name }));
    const tables: OfficeTable[] = [];
    const warnings = ["cached_cell_values_only", "cell_number_formats_not_applied"];
    let cellsRead = 0;
    for (const sheet of sheets.slice(0, 8)) {
      const rows: string[][] = [];
      for (const rowMatch of xml(sheet.path).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        if (rows.length >= 400 || cellsRead >= 12_000) { warnings.push("table_truncated"); break; }
        const row: string[] = [];
        for (const cell of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
          if (++cellsRead > 12_000) break;
          const reference = attribute(cell[1], "r").match(/^([A-Z]+)/)?.[1];
          const column = reference ? [...reference].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1 : row.length;
          if (column >= 64) { warnings.push("columns_truncated"); continue; }
          const body = cell[2] ?? "";
          const raw = decodeXml(/<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
          const type = attribute(cell[1], "t");
          let value = type === "s" ? (/^\d+$/.test(raw) ? shared[Number(raw)] ?? "" : "") : type === "inlineStr" ? textRuns(body) : raw;
          if (type === "s" && (!/^\d+$/.test(raw) || shared[Number(raw)] === undefined)) warnings.push("missing_shared_string");
          if (type === "b") value = raw === "1" ? "TRUE" : raw === "0" ? "FALSE" : "";
          if (/<f\b/.test(body) && !/<v\b/.test(body)) warnings.push("formula_has_no_cached_value");
          while (row.length <= column) row.push("");
          row[column] = value.slice(0, 500);
        }
        if (row.some((cell) => cell !== "")) rows.push(row);
      }
      if (rows.length) tables.push({ sheetName: sheet.name, header: rows[0], rows: rows.slice(1), inferredTopic: "source_table", parseWarnings: [...new Set(warnings)] });
    }
    if (sheets.length > 8) warnings.push("sheets_truncated");
    if (!tables.length) return null;
    const text = tables.map((table) => `Sheet: ${table.sheetName}\n${[table.header, ...table.rows].map((row) => row.join("\t")).join("\n")}`).join("\n\n");
    return { text: text.slice(0, 18_000), tables, warnings: [...new Set([...warnings, ...(text.length > 18_000 ? ["text_truncated"] : [])])] };
  } catch {
    return null;
  }
}
