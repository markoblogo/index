import { describe, expect, it } from "vitest";
import {
  buildTelegramSubmissionConfirmationText,
  getKyivReminderLevel,
} from "@/lib/respondent-telegram";

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

    expect(text).toContain("Дякуємо. Ваші дані для UGA Index прийнято");
    expect(text).toContain("Дата: 2026-06-02");
    expect(text).toContain("• Пшениця 11.5pro — 226 USD/t");
    expect(text).toContain("• Соя ГМО — 500 USD/t");
  });
});

describe("getKyivReminderLevel", () => {
  it("returns the initial Kyiv slot at 16:00", () => {
    expect(getKyivReminderLevel(new Date("2026-06-03T13:05:00.000Z"))).toBe(
      "initial",
    );
  });

  it("returns the first reminder slot at 17:00", () => {
    expect(getKyivReminderLevel(new Date("2026-06-03T14:05:00.000Z"))).toBe(
      "reminder_17",
    );
  });

  it("returns the final reminder slot at 18:00", () => {
    expect(getKyivReminderLevel(new Date("2026-06-03T15:05:00.000Z"))).toBe(
      "final_18",
    );
  });

  it("skips weekends", () => {
    expect(getKyivReminderLevel(new Date("2026-06-06T13:05:00.000Z"))).toBeNull();
  });
});
