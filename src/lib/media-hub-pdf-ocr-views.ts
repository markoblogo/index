import "server-only";
import { createHash } from "node:crypto";
import type { ExtractedMaterialContent } from "./media-hub-manual-materials";

type Asset = ExtractedMaterialContent["assets"][number];

// Bounded layout adapters for the two witnessed StoneX source families.
// Originals are retained; region coordinates always refer to the parent bitmap.
export async function preparePdfOcrViews(assets: Asset[], context: string) {
  const snapshot = /StoneX/i.test(context) && /USDA[\s\S]{0,160}Snapshot|Snapshot[\s\S]{0,160}USDA/i.test(context);
  const summary = /StoneX/i.test(context) && /USDA[\s\S]{0,160}Summary/i.test(context) && !snapshot;
  if (!snapshot && !summary) return { views: assets, derived: [] as Asset[], specialized: false, failed: false };
  const { default: sharp } = await import("sharp");
  const views: Asset[] = []; const derived: Asset[] = [];
  let failed = false;
  for (const asset of assets) {
    try {
      const { width = 0, height = 0 } = await sharp(asset.bytes!).metadata();
      const ratio = width / height;
      let regions: Array<{ left: number; top: number; width: number; height: number }> = [];
      if (snapshot && width >= 600 && height >= 800 && ratio > 0.65 && ratio < 0.85) {
        regions = [[0.125, 0.235], [0.245, 0.345], [0.355, 0.44], [0.445, 0.54]].map(([top, bottom]) => ({
          left: 0, top: Math.floor(height * top), width, height: Math.ceil(height * (bottom - top)),
        }));
      } else if (summary && width >= 600 && height >= 250 && ratio > 1.45 && ratio < 1.85) {
        regions = [0, 1, 2].map(i => ({ left: Math.floor(width * i / 3), top: 0,
          width: Math.floor(width * (i + 1) / 3) - Math.floor(width * i / 3), height }));
      }
      if (!regions.length) { views.push(asset); continue; }
      const parentImageSha256 = createHash("sha256").update(asset.bytes!).digest("hex");
      for (const [i, region] of regions.entries()) {
        const bytes = await sharp(asset.bytes!).extract(region).resize({
          width: 1800, height: 2400, fit: "inside", withoutEnlargement: false,
        }).png().toBuffer();
        if (bytes.length > 750 * 1024) throw new Error("ocr_region_size_limit");
        const view: Asset = { ...asset, bytes, mimeType: "image/png", byteSize: bytes.length,
          storagePath: `mediahub://preview/${parentImageSha256}/table-region-${i + 1}.png`,
          metadata: { ...asset.metadata, parentImageSha256, ocrRegion: region, ocrLayout: snapshot ? "stonex-snapshot-v1" : "stonex-summary-v1" } };
        views.push(view); derived.push(view);
      }
    } catch { failed = true; views.push(asset); }
  }
  return { views: views.slice(0, 6), derived, specialized: true, failed: failed || views.length > 6 };
}
