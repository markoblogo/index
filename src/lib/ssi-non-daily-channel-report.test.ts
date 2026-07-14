import { describe, expect, it } from "vitest";

import { buildSsiNonDailyStructuredMessages } from "./ssi-non-daily-channel-report";

describe("SSI non-daily channel report formatter", () => {
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
