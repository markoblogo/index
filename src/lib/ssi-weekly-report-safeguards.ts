export function getWeeklyAiLimits(tenantId: string) {
  // Three Telegram parts plus their structured/site representations, bounded
  // inside the prepare route's existing 300-second function duration.
  return tenantId === "spike-ua"
    ? { maxOutputTokens: 16_000, timeoutMs: 180_000 }
    : { maxOutputTokens: 2200, timeoutMs: 60_000 };
}

type PublishedObservation = { date: string; valueUsdPerMt: number; respondents: number };

export function weeklyPublishedComparison(rows: PublishedObservation[], endDate: string) {
  const start = new Date(`${endDate}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 7);
  const comparisonStartDate = start.toISOString().slice(0, 10);
  const current = rows.find(row => row.date === endDate && Number.isFinite(row.valueUsdPerMt));
  const previous = rows.find(row => row.date === comparisonStartDate && Number.isFinite(row.valueUsdPerMt));
  const round = (value: number) => Math.round(value * 10) / 10;
  return {
    comparisonStartDate,
    comparisonEndDate: endDate,
    latestValue: current?.valueUsdPerMt ?? null,
    respondents: current?.respondents ?? 0,
    weeklyChangeAbs: current && previous ? round(current.valueUsdPerMt - previous.valueUsdPerMt) : null,
    weeklyChangePct: current && previous && previous.valueUsdPerMt !== 0
      ? round((current.valueUsdPerMt - previous.valueUsdPerMt) / previous.valueUsdPerMt * 100)
      : null,
  };
}

type Section = { heading: string; items: string[] };
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Select complete facts, not a prefix of HTML. Reserve all headings/footer. */
export function fitSsiTelegramPart(input: {
  header: string;
  footer: string;
  sections: Section[];
  fallback: string;
  limit?: number;
}) {
  const limit = Math.min(input.limit ?? 3900, 4096);
  const selected = input.sections.map(section => ({ heading: section.heading, items: [] as string[] }));
  const render = () => [input.header, ...selected.filter(section => section.items.length).map(section =>
    `<b>${escapeHtml(section.heading)}</b>\n${section.items.map(item => `• ${escapeHtml(item)}`).join("\n")}`,
  ), input.footer].join("\n\n");
  if (render().length > limit) throw new Error("ssi_telegram_header_footer_exceed_limit");
  const count = Math.max(0, ...input.sections.map(section => section.items.length));
  // Give later crop sections a chance before filling earlier sections further.
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < selected.length; column++) {
      const item = input.sections[column].items[row];
      if (!item) continue;
      selected[column].items.push(item);
      if (render().length > limit) selected[column].items.pop();
    }
  }
  if (!selected.some(section => section.items.length)) {
    if (input.sections.some(section => section.items.length)) throw new Error("ssi_telegram_no_complete_fact_fits");
    const fallback = [input.header, `• ${escapeHtml(input.fallback)}`, input.footer].join("\n\n");
    if (fallback.length > limit) throw new Error("ssi_telegram_fallback_exceeds_limit");
    return fallback;
  }
  return render();
}

export function isSsiTelegramPackValid(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every(text => {
    if (typeof text !== "string" || !text.trim() || text.length > 4096) return false;
    const stack: string[] = [];
    const tags = text.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s[^<>]*)?>/gi);
    let consumed = text;
    for (const match of tags) {
      const tag = match[1].toLowerCase();
      if (!/^(b|strong|i|em|u|ins|s|strike|del|a|code|pre|blockquote|tg-spoiler|tg-emoji|span)$/.test(tag)) return false;
      if (match[0].startsWith("</")) {
        if (stack.pop() !== tag) return false;
      } else stack.push(tag);
      consumed = consumed.replace(match[0], "");
    }
    return stack.length === 0 && !/[<>]/.test(consumed) && !/&(?!(?:amp|lt|gt|quot|#\d+|#x[\da-f]+);)/i.test(consumed);
  });
}
