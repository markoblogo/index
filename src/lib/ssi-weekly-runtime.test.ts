import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/index-platform", () => ({ getActiveIndexConfig: () => ({ id: "spike-ua" }) }));
vi.mock("@/lib/platform-site", () => ({ isPlatformSite: () => false }));
vi.mock("@/lib/media-hub-google-drive", () => ({ syncGoogleDriveContextMaterials: vi.fn() }));
vi.mock("@/lib/telegram-source-collector", () => ({ syncTelegramWorkspaceResources: vi.fn() }));
vi.mock("@/lib/media-hub-publication-scheduler", () => ({
  getMediaHubReport: vi.fn(), publishMediaHubSnapshotReport: vi.fn(), sendMediaHubReportTelegram: vi.fn(),
  runDueMediaHubPublication: vi.fn(),
}));
vi.mock("@/lib/ssi-weekly-logistics-control", () => ({ getSsiWeeklyLogisticsPublicationBlock: vi.fn() }));

import { GET as prepare } from "@/app/api/cron/ssi-weekly-report-prepare/route";
import { GET as send } from "@/app/api/cron/ssi-weekly-report-send/route";
import { GET as legacy } from "@/app/api/cron/spike-weekly-report/route";
import { syncGoogleDriveContextMaterials } from "@/lib/media-hub-google-drive";
import { syncTelegramWorkspaceResources } from "@/lib/telegram-source-collector";
import { getMediaHubReport, publishMediaHubSnapshotReport, sendMediaHubReportTelegram } from "@/lib/media-hub-publication-scheduler";
import config from "../../vercel.json";
import { getSsiWeeklySlot } from "./ssi-weekly-workflow";

describe("SSI weekly protected cron routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "weekly-cron-test");
    vi.stubEnv("MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD", "1");
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([prepare, send, legacy])("requires authentication even while held", async (handler) => {
    expect((await handler(new Request("https://example.com/api/cron/weekly"))).status).toBe(401);
  });

  it.each([prepare, send, legacy])("cannot override the hold using query parameters", async (handler) => {
    const response = await handler(new Request("https://example.com/api/cron/weekly?force=1&resend=1", { headers: { authorization: "Bearer weekly-cron-test" } }));
    expect(await response.json()).toEqual({ status: "skipped", skippedReason: "ssi_periodic_quality_hold" });
    for (const fn of [syncGoogleDriveContextMaterials, syncTelegramWorkspaceResources, getMediaHubReport, publishMediaHubSnapshotReport, sendMediaHubReportTelegram]) expect(fn).not.toHaveBeenCalled();
  });

  it("has UTC cron candidates for night preparation and 09:00 in both seasons", () => {
    const schedules = (path: string) => config.crons.filter(cron => cron.path === path).map(cron => cron.schedule);
    expect(schedules("/api/cron/ssi-weekly-report-prepare")).toEqual(["10 21-23 * * 6", "10 0-6 * * 0"]);
    expect(schedules("/api/cron/ssi-weekly-report-send")).toEqual(["*/5 6,7 * * 0"]);
    expect(getSsiWeeklySlot(new Date("2026-10-25T06:00:00Z"))?.phase).toBe("prepare");
    expect(getSsiWeeklySlot(new Date("2026-10-18T07:00:00Z"))).toBeNull();
  });
});
