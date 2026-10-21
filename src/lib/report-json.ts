// PostgreSQL jsonb rejects lone UTF-16 surrogates even though JSON.stringify
// accepts them. Preserve complete Unicode characters at every text boundary.
export function truncateReportText(value: string, limit: number) {
  const text = value.toWellFormed();
  let end = Math.max(0, Math.min(text.length, Math.floor(limit)));
  if (end > 0 && end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1]) && /[\uDC00-\uDFFF]/.test(text[end])) end -= 1;
  return text.slice(0, end);
}

export function stringifyReportJson(value: unknown): string {
  const json = JSON.stringify(value, (_key, item: unknown) => typeof item === "string" ? item.toWellFormed() : item);
  if (json === undefined) throw new TypeError("Report JSON must have a value");
  return json;
}
