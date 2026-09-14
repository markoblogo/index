import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchUgaSpikeReadthrough,
  getUgaSpikeReadthroughSource,
  selectUgaCompatibleSpikeItems,
} from "@/lib/uga-spike-readthrough";

const originalSource = process.env.UGA_SPIKE_PUBLIC_API_BASE;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalSource === undefined) delete process.env.UGA_SPIKE_PUBLIC_API_BASE;
  else process.env.UGA_SPIKE_PUBLIC_API_BASE = originalSource;
});

describe("UGA SPIKE read-through", () => {
  it("keeps only UGA-compatible published SPIKE values without changing their market facts", () => {
    expect(
      selectUgaCompatibleSpikeItems([
        {
          commodityId: "corn",
          commodityCode: "CORN",
          commodityNameUk: "Кукурудза",
          commodityNameEn: "Corn",
          date: "2026-09-11",
          basis: "CPT Odesa, Ukraine (export)",
          valueUsdPerMt: 180,
          changeAbs: -5,
          changePct: -2.7,
          respondents: 20,
          status: "published",
        },
        {
          commodityId: "sunflower",
          commodityCode: "SUNFLOWER",
          commodityNameUk: "Соняшник",
          commodityNameEn: "Sunflower",
          date: "2026-09-11",
          basis: "CPT Crush",
          valueUsdPerMt: 450,
          status: "published",
        },
        {
          commodityId: "feed-wheat",
          commodityCode: "FEED_WHT",
          commodityNameUk: "Пшениця фураж",
          commodityNameEn: "Feed wheat",
          date: "2026-09-11",
          basis: "CPT Odesa, Ukraine (export)",
          valueUsdPerMt: null,
          status: "published",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        basis: "CPT Odesa, Ukraine (export)",
        changeAbs: -5,
        commodityCode: "CORN",
        date: "2026-09-11",
        respondents: 20,
        valueUsdPerMt: 180,
      }),
    ]);
  });

  it("fails closed when the SPIKE response is unavailable or malformed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 })));
    await expect(fetchUgaSpikeReadthrough("latest", "https://spike.example")).rejects.toThrow(
      "SPIKE public API returned 502",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ unexpected: [] })),
    );
    await expect(fetchUgaSpikeReadthrough("history", "https://spike.example")).rejects.toThrow(
      "does not contain a data array",
    );
  });

  it("rejects a configured source outside the canonical SPIKE HTTPS host", () => {
    process.env.UGA_SPIKE_PUBLIC_API_BASE = "http://index.uga.ua";
    expect(() => getUgaSpikeReadthroughSource()).toThrow(
      "must be https://spike.1d3x.com",
    );
  });
});
