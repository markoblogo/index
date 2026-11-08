import { describe, expect, it } from "vitest";

import { buildSsiNonDailyStructuredMessages } from "./ssi-non-daily-channel-report";
import { getSsiWeeklyRequiredParts } from "./ssi-weekly-editorial-contract";

describe("SSI non-daily channel report formatter", () => {
  it("preserves authored part and crop boundaries without rebucketing logistics or publishing evidence", () => {
    const parts = getSsiWeeklyRequiredParts("uk");
    const summary = parts.flatMap((part, i) => [part.title, ...part.sections.flatMap((heading, j) => [heading,
      i === 0 ? `LOGISTICS_ONLY_${j}: митний експорт кукурудзи, пшениці, сої та соняшнику становив 100 тис. т.` :
      i === 1 ? `GRAINS_ONLY_${j}: CBOT грудень 2026 — 441.50 cents/bu; MATIF — 247.25 EUR/т; CPT Одеса — 155 USD/т; FCA Чоп — 198 USD/т.` :
      `OILSEEDS_ONLY_${j}: соя, ріпак і соняшник на окремих базисах зберігають перевірені ціни.`])]);
    const content = { summary, windows: [{ feed: [{ title: "FEED_LEAK кукурудза", summary: "FEED_LEAK соя" }], summaryBody: ["WINDOW_LEAK пшениця"] }],
      evidence: [{ claim: "EVIDENCE_LEAK експорт пшениці і сої", excerpt: "INTERNAL_ONLY" }] } as unknown as Parameters<typeof buildSsiNonDailyStructuredMessages>[0]["content"];
    const input = { content, kind: "weekly" as const, locale: "uk" as const, periodEndDate: "2026-11-06" };
    const messages = buildSsiNonDailyStructuredMessages(input);
    expect(messages).toHaveLength(3);
    expect(messages[0]).toContain("LOGISTICS_ONLY"); expect(messages[1]).not.toContain("LOGISTICS_ONLY"); expect(messages[2]).not.toContain("LOGISTICS_ONLY");
    expect(messages[1]).toContain("GRAINS_ONLY"); expect(messages[2]).toContain("OILSEEDS_ONLY");
    expect(messages[1]).toContain("155 $"); expect(messages[1]).toContain("247.25 €");
    for (const [i, part] of parts.entries()) for (const heading of part.sections) expect(messages[i]).toContain(heading);
    expect(messages.join("\n")).not.toMatch(/EVIDENCE_LEAK|FEED_LEAK|WINDOW_LEAK|INTERNAL_ONLY/);
    expect(() => buildSsiNonDailyStructuredMessages({ ...input, content: { ...content, summary: summary.slice(0, -1) } })).toThrow("ssi_structured_parts_incomplete");
  });
  it("normalizes broker-facing weekly report facts and removes internal evidence leaks", () => {
    const messages = buildSsiNonDailyStructuredMessages({
      content: {
        evidence: [
          {
            claim: "Кукурудза index 210.0 $; Кукурудза; Corn; CORN; CPT Odesa, Ukraine (export)",
            excerpt: "Продовольча пшениця index 206.8 $; Продовольча пшениця; Milling Wheat; WHT_115; CPT Odesa, Ukraine (export); d/d -1.0",
            id: "evidence-1",
            confidence: "high",
            sourceDate: null,
            sourceTitle: "Index",
            sourceType: "index",
            sourceUrl: null,
            usedInSection: "market",
          },
        ],
        localized: {
          uk: {
            summary: [
              "• 1. Загальний обсяг експорту зернових та олійних культур залишався високим через порти Великої Одеси.",
              "✅Поточна ситуація з обробкою вагонів із зерном в морських портах України станом на 02.07.2026 року: ⚡️Середньодобовий показник вивантаження вагонів в портах Великої Одеси - 1 054 ваг/доба; ✅Кількість вагонів із зерном, що рухаються в напрямку портів Великої Одеси - 5 136 ваг.",
              "🌻 SUNFLOWER:",
            ],
            title: "Weekly market report",
          },
        },
        summary: [],
        windows: [
          {
            feed: [],
            summaryBody: [
              "• 2. Залізничні перевезення зерна зросли на 18% з початку року, що підтримало експортні потоки через західні кордони України.",
            ],
          },
        ],
      },
      kind: "weekly",
      locale: "uk",
      periodEndDate: "2026-07-04",
    });

    const text = messages.join("\n\n");

    expect(text).not.toContain("• 1.");
    expect(text).not.toContain("• 2.");
    expect(text).not.toContain("Кукурудза index");
    expect(text).not.toContain("WHT_115");
    expect(text).not.toContain("SUNFLOWER:");
    expect(text).toContain("• Загальний обсяг експорту зернових та олійних культур залишався високим");
    expect(text).toContain("• Поточна ситуація з обробкою вагонів");
    expect(text).toContain("• Середньодобовий показник вивантаження вагонів");
    expect(text).toContain("• Кількість вагонів із зерном");
    expect(messages).toHaveLength(3);
  });
});
