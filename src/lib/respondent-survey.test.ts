import { beforeEach, describe, expect, it, vi } from "vitest";

const autoPublishSpikeDailyIndices = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auto-publish", () => ({
  autoPublishSpikeDailyIndices,
}));

vi.mock("@/lib/admin-daily-inputs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin-daily-inputs")>(
    "@/lib/admin-daily-inputs",
  );

  return {
    ...actual,
    todayInputDate: () => "2026-06-01",
  };
});

describe("autoPublishAfterRespondentSubmit", () => {
  beforeEach(() => {
    vi.stubEnv("INDEX_TENANT", "spike-ua");
    vi.stubEnv("NEXT_PUBLIC_INDEX_TENANT", "spike-ua");
    vi.resetModules();
    autoPublishSpikeDailyIndices.mockReset();
  });

  it("does not fail respondent confirmation if auto-publish fails", async () => {
    autoPublishSpikeDailyIndices.mockRejectedValue(new Error("publish failed"));
    const logger = { error: vi.fn(), warn: vi.fn() };
    const { autoPublishAfterRespondentSubmit } = await import(
      "@/lib/respondent-survey"
    );

    await expect(
      autoPublishAfterRespondentSubmit({
        date: "2026-06-01",
        logger,
        status: "submitted",
      }),
    ).resolves.toEqual({ attempted: true, ok: false });
    expect(autoPublishSpikeDailyIndices).toHaveBeenCalledWith("2026-06-01", {
      replaceExisting: true,
    });
    expect(logger.error).toHaveBeenCalled();
  });
});
