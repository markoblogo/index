import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/index-platform", () => ({
  getActiveIndexConfig() {
    return process.env.INDEX_TENANT === "spike-ua"
      ? {
          id: "spike-ua",
          name: "SPIKE SPOT INDEX",
        }
      : {
          id: "uga-ua",
          name: "UGA Index",
        };
  },
  isSpikeIndex: process.env.INDEX_TENANT === "spike-ua",
}));

beforeEach(() => {
  process.env.INDEX_TENANT = "uga-ua";
});

afterEach(() => {
  delete process.env.INDEX_TENANT;
});

function loadRespondentTelegramModule() {
  vi.resetModules();
  return import("@/lib/respondent-telegram");
}

describe("buildTelegramSubmissionConfirmationText", () => {
  it("renders Ukrainian confirmation with submitted values", async () => {
    const { buildTelegramSubmissionConfirmationText } =
      await loadRespondentTelegramModule();

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
  it("keeps the legacy UGA initial Kyiv slot at 16:00", async () => {
    const { getKyivReminderLevel } = await loadRespondentTelegramModule();
    expect(getKyivReminderLevel(new Date("2026-06-03T13:05:00.000Z"))).toBe(
      "initial",
    );
  });

  it("keeps the legacy UGA first reminder slot at 17:00", async () => {
    const { getKyivReminderLevel } = await loadRespondentTelegramModule();
    expect(getKyivReminderLevel(new Date("2026-06-03T14:05:00.000Z"))).toBe(
      "reminder_18",
    );
  });

  it("keeps the legacy UGA final reminder slot at 18:00", async () => {
    const { getKyivReminderLevel } = await loadRespondentTelegramModule();
    expect(getKyivReminderLevel(new Date("2026-06-03T15:05:00.000Z"))).toBe(
      "final_19",
    );
  });

  it("uses only two SSI Telegram slots before publication", async () => {
    const previousTenant = process.env.INDEX_TENANT;
    process.env.INDEX_TENANT = "spike-ua";
    const { getKyivReminderLevel } = await import("@/lib/respondent-telegram");

    expect(getKyivReminderLevel(new Date("2026-06-03T12:05:00.000Z"))).toBeNull();
    expect(getKyivReminderLevel(new Date("2026-06-03T13:05:00.000Z"))).toBe(
      "initial",
    );
    expect(getKyivReminderLevel(new Date("2026-06-03T14:05:00.000Z"))).toBe(
      "reminder_18",
    );
    expect(getKyivReminderLevel(new Date("2026-06-03T15:05:00.000Z"))).toBeNull();
    expect(getKyivReminderLevel(new Date("2026-06-03T16:05:00.000Z"))).toBeNull();

    if (previousTenant) {
      process.env.INDEX_TENANT = previousTenant;
    } else {
      delete process.env.INDEX_TENANT;
    }
  });

  it("skips weekends", async () => {
    const { getKyivReminderLevel } = await loadRespondentTelegramModule();
    expect(getKyivReminderLevel(new Date("2026-06-06T13:05:00.000Z"))).toBeNull();
  });
});
