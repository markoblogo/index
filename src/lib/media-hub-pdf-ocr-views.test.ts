import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { preparePdfOcrViews } from "./media-hub-pdf-ocr-views";

describe("bounded StoneX image regions", () => {
  it("keeps four Snapshot table regions with parent-image provenance", async () => {
    const bytes = await sharp({ create: { width: 747, height: 1036, channels: 3, background: "white" } }).png().toBuffer();
    const parent = { assetType: "preview_image" as const, bytes, pageNumber: 2, mimeType: "image/png" };
    const result = await preparePdfOcrViews([parent], "StoneX October USDA S&D Snapshot.pdf");
    expect(result.failed).toBe(false); expect(result.views).toHaveLength(4);
    expect(result.derived[0].metadata).toMatchObject({ ocrLayout: "stonex-snapshot-v1", parentImageSha256: expect.any(String), ocrRegion: { left: 0, width: 747 } });
    expect(result.views.every(v => v.bytes!.length <= 750 * 1024)).toBe(true);
    expect((await sharp(result.views[0].bytes!).metadata()).width).toBe(1800);
    expect(parent.bytes).toBe(bytes);
  });
  it("separates three side-by-side Summary panels without changing ordinary PDF images", async () => {
    const bytes = await sharp({ create: { width: 685, height: 415, channels: 3, background: "white" } }).png().toBuffer();
    const parent = { assetType: "preview_image" as const, bytes, pageNumber: 1, mimeType: "image/png" };
    expect((await preparePdfOcrViews([parent], "StoneX October USDA Grain S&D Summary.pdf")).views).toHaveLength(3);
    const ordinary = await preparePdfOcrViews([parent], "other.pdf");
    expect(ordinary.views).toEqual([parent]); expect(ordinary.derived).toEqual([]);
  });
});
