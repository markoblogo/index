import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {},
  hasDatabaseUrl: () => false,
}));
vi.mock("@/lib/index-platform", () => ({
  getActiveIndexConfig: () => ({ id: "spike-ua" }),
}));

describe("telegram source collector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches Telegram channel pages with an abort signal", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body></body></html>", { status: 200 }),
    );
    const { __telegramSourceCollectorTestHooks } = await import("./telegram-source-collector");

    await expect(__telegramSourceCollectorTestHooks.fetchTelegramChannelPage("example"))
      .resolves.toMatchObject({ nextBeforePostId: null, posts: [] });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
