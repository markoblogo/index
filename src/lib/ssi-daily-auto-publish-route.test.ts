import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const publish = vi.hoisted(() => vi.fn().mockResolvedValue({ published: 0, skippedReason: "already_published" }));
vi.mock("@/lib/auto-publish", () => ({ autoPublishSpikeDailyIndices: publish, formatDateKyiv: () => "2026-10-20", isKyivAutoPublishHour: () => true }));
vi.mock("@/lib/platform-site", () => ({ isPlatformSite: () => false }));
vi.mock("@/lib/mn7r-monitor-import", () => ({ importMn7rMonitorRespondentPrices: vi.fn() }));
vi.mock("@/lib/telegram-source-collector", () => ({ syncTelegramWorkspaceResources: vi.fn() }));
import { GET } from "@/app/api/cron/spike-auto-publish/route";

afterEach(() => { vi.unstubAllEnvs(); publish.mockClear(); });
describe("automatic SSI historical repair does not send historical reports", () => {
  it("four runs can repair both dates, but only today may trigger MediaHub", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron");
    for (const route of ["spike-auto-publish-window-16", "spike-auto-publish-window-16-retry", "spike-auto-publish-window-16-retry", "spike-auto-publish-window-17"]) {
      await GET(new Request(`https://example.com/api/cron/${route}`, { headers: { authorization: "Bearer test-cron" } }));
    }
    expect(publish).toHaveBeenCalledTimes(8);
    for (const [date, options] of publish.mock.calls) expect(options.publishMediaHub).toBe(date === "2026-10-20");
  });
});
