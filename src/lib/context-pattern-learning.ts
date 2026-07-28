import {
  CONTEXT_RECURRING_SOURCE_FAMILIES,
  type ContextRecurringSourceFamily,
} from "@/lib/context-recurring-sources";

export type ContextPatternProfile = {
  expectedSignals: string[];
  id: string;
  mode: "html_table" | "text_block";
  sourceFamilyId: string;
  status: "active" | "candidate";
};

export type ContextPatternLearningResult = {
  matchedSignals: string[];
  profileId: string;
  rows: Array<Record<string, string>>;
  status: "ok" | "thin" | "unsupported";
  warnings: string[];
};

export const CONTEXT_PATTERN_PROFILES: ContextPatternProfile[] = [
  {
    expectedSignals: ["corn", "wheat", "soybeans", "soybean oil", "meal"],
    id: "zaner-netags-commodity-table",
    mode: "html_table",
    sourceFamilyId: "zaner_netags_grain_oilseed",
    status: "candidate",
  },
];

export function findPatternProfilesForSourceFamily(
  sourceFamilyId: string,
  profiles = CONTEXT_PATTERN_PROFILES,
) {
  return profiles.filter((profile) => profile.sourceFamilyId === sourceFamilyId);
}

export function runContextPatternLearningForHtml(input: {
  html: string;
  profile: ContextPatternProfile;
  sourceFamily?: ContextRecurringSourceFamily;
}): ContextPatternLearningResult {
  if (input.profile.mode !== "html_table") {
    return {
      matchedSignals: [],
      profileId: input.profile.id,
      rows: [],
      status: "unsupported",
      warnings: ["pattern_mode_not_supported"],
    };
  }

  const tables = extractHtmlTables(input.html);
  const rows = tables.flatMap((table) => table.rows);
  const matchedSignals = input.profile.expectedSignals.filter((signal) =>
    rows.some((row) => Object.values(row).some((value) => value.toLowerCase().includes(signal))),
  );
  const warnings: string[] = [];
  if (tables.length === 0) {
    warnings.push("no_html_tables_found");
  }
  if (matchedSignals.length === 0) {
    warnings.push("expected_signals_not_matched");
  }

  return {
    matchedSignals,
    profileId: input.profile.id,
    rows: rows.slice(0, 80),
    status: rows.length > 0 && matchedSignals.length > 0 ? "ok" : rows.length > 0 ? "thin" : "unsupported",
    warnings,
  };
}

export function buildContextPatternProfileFixtures() {
  return CONTEXT_PATTERN_PROFILES.map((profile) => ({
    expectedSignals: profile.expectedSignals,
    id: profile.id,
    sourceFamilyId: profile.sourceFamilyId,
    sourceUrl: CONTEXT_RECURRING_SOURCE_FAMILIES.find((family) => family.id === profile.sourceFamilyId)?.url ?? null,
    status: profile.status,
  }));
}

function extractHtmlTables(html: string) {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .map((match) => parseHtmlTable(match[1]))
    .filter((table) => table.rows.length > 0);
}

function parseHtmlTable(tableHtml: string) {
  const rawRows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((cell) => cleanCell(cell[1])))
    .filter((row) => row.some(Boolean));
  const header = rawRows[0] ?? [];
  const body = rawRows.slice(1);
  const normalizedHeader = header.map((cell, index) => cell || `column_${index + 1}`);

  return {
    rows: body.map((row) =>
      Object.fromEntries(normalizedHeader.map((key, index) => [key, row[index] ?? ""])),
    ),
  };
}

function cleanCell(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
