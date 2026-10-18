import "server-only";
import { createHash } from "node:crypto";

// No Poppler/canvas binaries are required in the Vercel function.
export async function extractPdfImages(bytes: Buffer, maxAssets: number) {
  const assets: Array<{
    assetType: "preview_image"; bytes: Buffer; byteSize: number; confidence: number;
    metadata: Record<string, unknown>; mimeType: string; pageNumber: number;
    storagePath: string; visualSummary: string;
  }> = [];
  const warnings: string[] = [];
  if (bytes.length > 25 * 1024 * 1024) return { assets, warnings: ["pdf_image_size_limit"] };
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const task = async () => {
    const { getDocumentProxy, extractImages } = await import("unpdf");
    const { default: sharp } = await import("sharp");
    const pdf = await getDocumentProxy(new Uint8Array(bytes), {
      useSystemFonts: false, disableFontFace: true, maxImageSize: 16_777_216,
    });
    try {
      const limit = Math.max(1, Math.min(6, maxAssets));
      if (pdf.numPages > 12) warnings.push("pdf_image_pages_truncated");
      for (let page = 1; page <= Math.min(pdf.numPages, 12) && !expired; page++) {
        const images = await extractImages(pdf, page);
        for (const [index, image] of images.entries()) {
          if (expired) break;
          if (image.width < 300 || image.height < 120) continue; // Ignore logos/icons.
          if (image.width * image.height > 16_777_216) {
            warnings.push("pdf_image_pixel_limit"); continue;
          }
          if (assets.length >= limit) { warnings.push("pdf_image_assets_truncated"); return; }
          const png = await sharp(image.data, {
            raw: { width: image.width, height: image.height, channels: image.channels },
            limitInputPixels: 16_777_216,
          }).resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true })
            .png().toBuffer();
          if (png.length > 750 * 1024) { warnings.push("pdf_image_output_limit"); continue; }
          assets.push({
            assetType: "preview_image", bytes: png, byteSize: png.length, confidence: 0.5,
            metadata: { parser: "pdfjs-embedded-image-v1", imageIndex: index,
              imageSha256: createHash("sha256").update(png).digest("hex"), pdfTableOcr: true },
            mimeType: "image/png", pageNumber: page,
            storagePath: `mediahub://preview/page-${page}-image-${index}.png`,
            visualSummary: "PDF image awaiting bounded table transcription.",
          });
        }
      }
    } finally { await pdf.loadingTask.destroy(); }
  };
  try {
    await Promise.race([task(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { expired = true; reject(new Error("image budget")); }, 12_000);
    })]);
    return { assets, warnings: [...new Set(warnings)] };
  } catch {
    return { assets: [], warnings: ["pdf_image_extraction_failed"] };
  } finally { if (timer) clearTimeout(timer); }
}
