import { describe, expect, it } from "vitest";
import { buildTelegramSubmissionConfirmationText } from "@/lib/respondent-telegram";

describe("buildTelegramSubmissionConfirmationText", () => {
  it("renders Ukrainian confirmation with submitted values", () => {
    const text = buildTelegramSubmissionConfirmationText({
      date: "2026-06-02",
      locale: "uk",
      summary: [
        { name: "Пшениця 11.5pro", price: 226 },
        { name: "Соя ГМО", price: 500 },
      ],
    });

    expect(text).toContain("Дякуємо. Ваші дані для SPIKE SPOT INDEX прийнято");
    expect(text).toContain("Дата: 2026-06-02");
    expect(text).toContain("• Пшениця 11.5pro — 226 USD/t");
    expect(text).toContain("• Соя ГМО — 500 USD/t");
  });
});
