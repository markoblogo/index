import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));
vi.mock("@/lib/index-platform", () => ({
  getActiveIndexConfig: () => ({
    commodities: [],
    deliveryBases: [{ code: "CPT_ODESSA", basketCode: "EXPORT" }],
    id: "spike-ua",
    legalName: { en: "Spike", uk: "Spike" },
    respondents: [],
  }),
}));
vi.mock("@/lib/platform-site", () => ({
  isPlatformSite: () => false,
}));

import {
  getMediaHubMonitoringPlan,
  getMediaHubPublicationPlan,
  isMediaHubPublicationDue,
  normalizeMediaHubTelegramChatId,
} from "./media-hub-publication-scheduler";

describe("media hub publication scheduler", () => {
  beforeEach(() => {
    vi.stubEnv("MEDIA_HUB_SCHEDULE_TIMEZONE", "Europe/Kyiv");
    vi.stubEnv("MEDIA_HUB_DAILY_REPORT_TIME", "19:10");
    vi.stubEnv("MEDIA_HUB_WEEKLY_REPORT_TIME", "15:00");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("publishes daily on weekdays, weekly on most Saturdays, monthly on fourth Saturday, and nothing on Sunday", () => {
    expect(getMediaHubPublicationPlan("2026-06-19")).toMatchObject({
      kind: "daily",
      reason: "weekday_daily_slot",
      timezone: "Europe/Kyiv",
    });
    expect(getMediaHubPublicationPlan("2026-06-20")).toMatchObject({
      kind: "weekly",
      reason: "saturday_weekly_slot",
    });
    expect(getMediaHubPublicationPlan("2026-06-27")).toMatchObject({
      kind: "monthly",
      reason: "fourth_saturday_monthly_replaces_weekly",
    });
    expect(getMediaHubPublicationPlan("2026-06-21")).toMatchObject({
      kind: "none",
      reason: "no_publication_on_sunday",
    });
  });

  it("runs monitoring only on business days in the MediaHub schedule timezone", () => {
    expect(getMediaHubMonitoringPlan(new Date("2026-06-19T12:00:00.000Z"))).toMatchObject({
      allowed: true,
      date: "2026-06-19",
    });
    expect(getMediaHubMonitoringPlan(new Date("2026-06-20T12:00:00.000Z"))).toMatchObject({
      allowed: false,
      reason: "media_hub_monitoring_disabled_on_weekends",
    });
  });

  it("runs weekday daily reports after the 19:00 Kyiv index publication slot", () => {
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:10:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-01-05T17:10:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-06-22T16:00:00.000Z"))).toBe(false);
  });

  it("runs Saturday weekly/monthly reports at 15:00 Kyiv", () => {
    expect(isMediaHubPublicationDue(new Date("2026-06-20T12:00:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-01-10T13:00:00.000Z"))).toBe(true);
    expect(isMediaHubPublicationDue(new Date("2026-06-21T12:00:00.000Z"))).toBe(false);
  });

  it("normalizes Telegram peer ids to supergroup chat ids", () => {
    expect(normalizeMediaHubTelegramChatId("4847957467")).toBe("-1004847957467");
    expect(normalizeMediaHubTelegramChatId("-1004847957467")).toBe("-1004847957467");
    expect(normalizeMediaHubTelegramChatId("353706900")).toBe("353706900");
  });
});
