import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "@/lib/fetch-timeout";

describe("fetchWithTimeout", () => {
  it("passes an abort signal to fetch and returns the response", async () => {
    const response = new Response("ok", { status: 200 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    try {
      await expect(fetchWithTimeout("https://example.com/api", { method: "POST" }, 1000))
        .resolves.toBe(response);
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
      expect(init?.method).toBe("POST");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      fetchMock.mockRestore();
    }
  });
});
