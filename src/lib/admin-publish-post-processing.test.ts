import { describe, expect, it, vi } from "vitest";
import { scheduleAdminPublishAiBrief } from "@/lib/admin-publish-post-processing";

describe("scheduleAdminPublishAiBrief", () => {
  it("schedules AI work without blocking the publication response", async () => {
    let task: (() => Promise<void>) | undefined;
    const generate = vi.fn().mockResolvedValue(undefined);

    scheduleAdminPublishAiBrief(
      { date: "2026-09-09", userId: "admin-1" },
      {
        generate,
        schedule: (callback) => {
          task = callback;
        },
      },
    );

    expect(generate).not.toHaveBeenCalled();
    expect(task).toBeTypeOf("function");

    await task?.();

    expect(generate).toHaveBeenCalledWith({
      actorUserId: "admin-1",
      date: "2026-09-09",
      force: true,
      source: "admin_publish",
    });
  });

  it("contains AI errors after the index publication has succeeded", async () => {
    let task: (() => Promise<void>) | undefined;
    const error = new Error("AI unavailable");
    const report = vi.fn();

    scheduleAdminPublishAiBrief(
      { date: "2026-09-09", userId: "admin-1" },
      {
        generate: vi.fn().mockRejectedValue(error),
        report,
        schedule: (callback) => {
          task = callback;
        },
      },
    );

    await expect(task?.()).resolves.toBeUndefined();
    expect(report).toHaveBeenCalledWith(error);
  });
});
