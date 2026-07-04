import "server-only";

type PdfPreviewAsset = {
  assetType: "preview_image";
  byteSize: number;
  bytes: Buffer;
  confidence: number;
  metadata: Record<string, unknown>;
  mimeType: string;
  pageNumber: number;
  storagePath: string;
  visualSummary: string;
};

export async function extractPdfContent(
  bytes: Buffer,
  filename: string,
  options: {
    maxPreviewPages: number;
    maxTextChars: number;
    previewsEnabled: boolean;
  },
) {
  const [
    { execFileSync },
    { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync },
    { tmpdir },
    { join },
  ] = await Promise.all([
    import("node:child_process"),
    import("node:fs"),
    import("node:os"),
    import("node:path"),
  ]);
  const tmp = mkdtempSync(join(tmpdir(), "media-hub-pdf-"));
  const pdfPath = join(tmp, sanitizePdfFilename(filename || "material.pdf"));
  try {
    writeFileSync(pdfPath, bytes);
    const textResult = tryExtractPdfTextWithPoppler(pdfPath, execFileSync);
    const previewAssets = options.previewsEnabled
      ? tryRenderPdfPreviewAssets(pdfPath, {
          execFileSync,
          join,
          maxPreviewPages: options.maxPreviewPages,
          mkdtempSync,
          readdirSync,
          readFileSync,
          rmSync,
          tmpdir,
        })
      : [];
    return {
      parser: textResult ? "pdftotext" : "fallback",
      previewAssets,
      text: (textResult || extractFallbackPdfText(bytes)).slice(0, options.maxTextChars),
    };
  } finally {
    rmSync(tmp, { force: true, recursive: true });
  }
}

function tryExtractPdfTextWithPoppler(
  pdfPath: string,
  execFileSync: typeof import("node:child_process").execFileSync,
) {
  if (!commandExists("pdftotext", execFileSync)) {
    return "";
  }
  try {
    const output = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 8000,
    }).toString("utf8");
    return output.replace(/\s+\n/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
  } catch {
    return "";
  }
}

function tryRenderPdfPreviewAssets(
  pdfPath: string,
  io: {
    execFileSync: typeof import("node:child_process").execFileSync;
    join: typeof import("node:path").join;
    maxPreviewPages: number;
    mkdtempSync: typeof import("node:fs").mkdtempSync;
    readdirSync: typeof import("node:fs").readdirSync;
    readFileSync: typeof import("node:fs").readFileSync;
    rmSync: typeof import("node:fs").rmSync;
    tmpdir: typeof import("node:os").tmpdir;
  },
): PdfPreviewAsset[] {
  if (!commandExists("pdftoppm", io.execFileSync)) {
    return [];
  }
  const prefix = io.join(io.mkdtempSync(io.join(io.tmpdir(), "media-hub-pdf-preview-")), "page");
  const previewDir = prefix.replace(/\/page$/, "");
  try {
    io.execFileSync("pdftoppm", ["-f", "1", "-l", String(io.maxPreviewPages), "-png", "-r", "96", pdfPath, prefix], {
      maxBuffer: 512 * 1024,
      timeout: 8000,
    });
    return io.readdirSync(previewDir)
      .filter((name) => name.endsWith(".png"))
      .sort()
      .slice(0, io.maxPreviewPages)
      .map((name, index) => {
        const path = io.join(previewDir, name);
        const bytes = io.readFileSync(path);
        return {
          assetType: "preview_image",
          byteSize: bytes.length,
          bytes,
          confidence: 0.5,
          metadata: { filename: name, parser: "pdftoppm" },
          mimeType: "image/png",
          pageNumber: index + 1,
          storagePath: `mediahub://preview/${name}`,
          visualSummary: `PDF page ${index + 1} preview generated for visual review; OCR/vision summary can be added in a later pass.`,
        };
      });
  } catch {
    return [];
  } finally {
    io.rmSync(previewDir, { force: true, recursive: true });
  }
}

function commandExists(
  command: string,
  execFileSync: typeof import("node:child_process").execFileSync,
) {
  try {
    execFileSync("sh", ["-lc", `command -v ${command}`], { stdio: "ignore", timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

function extractFallbackPdfText(buffer: Buffer) {
  return buffer
    .toString("latin1")
    .replace(/\\([()\\])/g, "$1")
    .match(/\(([^()]{8,})\)/g)
    ?.map((part) => part.slice(1, -1))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

function sanitizePdfFilename(value: string) {
  return value.split(/[\\/]/).filter(Boolean).pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120) || "material.pdf";
}
