import { afterEach, expect, it, vi } from "vitest";
import { parseBrownfieldCloses, parseEuronextCloses, readSsiWeeklyQuotePage } from "./ssi-weekly-closing-quotes";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const html = `<p>Corn settled at €247.25/t on 6 November 2026.</p><p>Over 5 sessions, since 30 October 2026: −€11.50/t</p><table>
<tr>${["Contract", "Date", "Open", "High", "Low", "Close", "Volume", "OI"].map(value => `<th>${value}</th>`).join("")}</tr>
<tr>${["XBH27 March 2027", "06/11/2026", "245.50", "247.50", "244.00", "247.25", "2,521", "26,071"].map(value => `<td>${value}</td>`).join("")}</tr></table>`;
it("uses the close column and same-contract weekly series, not intraday hero fields or another crop", () => {
  expect(parseEuronextCloses(html, "corn", "2026-11-06")[0]).toMatchObject({ contract: "XBH27", price: 247.25, weeklyChange: -11.5, priceType: "settlement" });
  expect(parseEuronextCloses(html, "corn", "2026-11-13")).toEqual([]);
  expect(parseEuronextCloses(html, "wheat", "2026-11-06")).toEqual([]);
  expect(parseEuronextCloses(html.replace("30 October", "29 October"), "corn", "2026-11-06")[0].weeklyChange).toBeUndefined();
  expect(parseEuronextCloses(html.replace("<th>Close</th>", "<th>Last</th>"), "corn", "2026-11-06")).toEqual([]);
});
it("times out a stalled body after headers and preserves the original abort", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      init.signal!.addEventListener("abort", () => controller.error(new Error("body_aborted")), { once: true });
    } });
    const response = new Response(body);
    Object.defineProperty(response, "url", { value: "https://www.graindecision.com/en/analyses/corn-euronext" });
    return response;
  }));
  const rejected = expect(readSsiWeeklyQuotePage("https://www.graindecision.com/en/analyses/corn-euronext")).rejects.toThrow("body_aborted");
  await vi.advanceTimersByTimeAsync(8000); await rejected;
});
it("preserves fractional CBOT closes, contract years and short-ton units without daily-to-weekly substitution", () => {
  const article = `<h1>Closing Grain and Livestock Futures: November 6, 2026</h1>Closing prices for selected commodities. Dec. corn $4.41 and 1/2, up 1 and 1/2 cents Jan. soybeans $11.93 and 3/4, up 5 cents Dec. soybean meal $319.20, up $2.00 Dec. soybean oil 62.26, up 2 points Dec. Chicago wheat $5.91 and 1/4, down 8 cents`;
  const quotes = parseBrownfieldCloses(article, "2026-11-06");
  expect(quotes.map(quote => quote.price)).toEqual([441.5, 1193.75, 319.2, 62.26, 591.25]);
  expect(quotes[1].expiry).toBe("January 2027"); expect(quotes[2].unit).toBe("USD/short ton");
  expect(quotes.every(quote => quote.weeklyChange === undefined)).toBe(true);
  expect(parseBrownfieldCloses(article, "2026-11-13")).toEqual([]);
});
