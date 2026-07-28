import { createHash } from "node:crypto";

export type ContextExtractionRuntime =
  | "rss"
  | "telegram"
  | "manual_file"
  | "obscura"
  | "playwright"
  | "markitdown"
  | "crawl4ai"
  | "crawlee";

export type ContextExtractionStatus = "ok" | "thin" | "blocked" | "unsupported" | "error";

export type ContextExtractionRequest = {
  bytes?: Buffer;
  contentType?: string;
  filePath?: string;
  filename?: string;
  languageHint?: "uk" | "en" | "ru" | "mixed";
  materialId?: string;
  maxBytes?: number;
  reason: "material_normalization" | "source_gap" | "claim_check" | "qa" | "operator_review";
  sourceId?: string;
  sourceUrl?: string;
  tenantId: "spike-ua" | "1d3x" | "uga-ua" | "shared" | "corporate-unrouted";
  timeoutMs?: number;
};

export type ContextExtractionResult = {
  extractedAt: string;
  finalUrl?: string;
  freshness: "current_window" | "recent" | "stale" | "unknown";
  links?: string[];
  markdown?: string;
  media?: Array<{
    contentType?: string;
    filePath?: string;
    sizeBytes?: number;
    url?: string;
  }>;
  normalizedText?: string;
  provenance: {
    contentHash?: string;
    materialId?: string;
    source: "telegram" | "rss" | "manual" | "web" | "api";
    sourceId?: string;
    sourceUrl?: string;
  };
  rightsRobotsNote?: string;
  runtime: ContextExtractionRuntime;
  status: ContextExtractionStatus;
  title?: string;
  warnings?: string[];
};

const MAX_MARKDOWN_CHARS = 24_000;
const MAX_TEXT_CHARS = 18_000;

export function extractManualFileWithMarkitdownStyle(
  request: ContextExtractionRequest & { bytes: Buffer; filename?: string; contentType?: string },
): ContextExtractionResult {
  const contentType = (request.contentType ?? "application/octet-stream").toLowerCase();
  const filename = (request.filename ?? "").toLowerCase();
  const contentHash = createHash("sha256").update(request.bytes).digest("hex");
  const base = buildBaseResult(request, contentHash);

  if (request.maxBytes && request.bytes.length > request.maxBytes) {
    return {
      ...base,
      status: "blocked",
      warnings: ["material_exceeds_adapter_max_bytes"],
    };
  }

  if (isMarkdownLike(contentType, filename)) {
    const markdown = decodeText(request.bytes);
    return withText(base, markdown, markdown, "ok");
  }

  if (isHtml(contentType, filename)) {
    const html = decodeText(request.bytes);
    const markdown = htmlToMarkdown(html);
    return {
      ...withText(base, markdownToPlainText(markdown), markdown, markdown.trim() ? "ok" : "thin"),
      links: extractLinksFromHtml(html),
      title: extractHtmlTitle(html),
    };
  }

  if (isCsv(contentType, filename)) {
    const text = decodeText(request.bytes);
    const table = csvToMarkdown(text);
    return withText(base, text, table || textToMarkdown(text), text.trim() ? "ok" : "unsupported");
  }

  if (isPlainText(contentType, filename)) {
    const text = decodeText(request.bytes);
    return withText(base, text, textToMarkdown(text), text.trim() ? "ok" : "unsupported");
  }

  if (isPdf(contentType, filename)) {
    return {
      ...base,
      status: "thin",
      normalizedText: `PDF received: ${request.filename ?? "uploaded file"}`,
      markdown: `# PDF received\n\nFile: ${request.filename ?? "uploaded file"}\n\nText extraction is handled by the PDF extraction adapter; this MarkItDown-style pass records shadow normalization metadata.`,
      warnings: ["pdf_text_extraction_delegated_to_pdf_adapter"],
    };
  }

  if (isOfficeOpenXml(contentType, filename)) {
    return {
      ...base,
      status: "thin",
      normalizedText: `Office document received: ${request.filename ?? "uploaded file"}`,
      markdown: `# Office document received\n\nFile: ${request.filename ?? "uploaded file"}\n\nBinary Office parsing is not enabled in this pilot. Keep the original file as evidence and route to operator review if exact table/text extraction is required.`,
      warnings: ["office_binary_parsing_not_enabled"],
    };
  }

  return {
    ...base,
    status: "unsupported",
    warnings: [`unsupported_manual_file_type:${contentType || "unknown"}`],
  };
}

export function extractAcceptedWebPageWithCrawl4AiStyle(
  request: ContextExtractionRequest & { html: string; sourceUrl: string },
): ContextExtractionResult {
  if (!/^https?:\/\//i.test(request.sourceUrl)) {
    return {
      extractedAt: new Date().toISOString(),
      freshness: "unknown",
      provenance: {
        source: "web",
        sourceId: request.sourceId,
        sourceUrl: request.sourceUrl,
      },
      rightsRobotsNote: "Rejected before extraction: source URL must be public HTTP(S).",
      runtime: "crawl4ai",
      status: "blocked",
      warnings: ["non_http_source_url"],
    };
  }

  const contentHash = createHash("sha256").update(request.html).digest("hex");
  const title = extractHtmlTitle(request.html);
  const markdown = htmlToMarkdown(request.html);
  const normalizedText = markdownToPlainText(markdown);
  const isThin = normalizedText.length < 240;

  return {
    extractedAt: new Date().toISOString(),
    finalUrl: request.sourceUrl,
    freshness: "unknown",
    links: extractLinksFromHtml(request.html),
    markdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
    normalizedText: normalizedText.slice(0, MAX_TEXT_CHARS),
    provenance: {
      contentHash,
      materialId: request.materialId,
      source: "web",
      sourceId: request.sourceId,
      sourceUrl: request.sourceUrl,
    },
    rightsRobotsNote: "Crawl4AI-style extraction is shadow-only and may run only after source policy accepts the public or permissioned URL.",
    runtime: "crawl4ai",
    status: markdown.trim() ? (isThin ? "thin" : "ok") : "unsupported",
    title,
    warnings: isThin ? ["thin_web_markdown"] : [],
  };
}

function buildBaseResult(
  request: ContextExtractionRequest & { bytes: Buffer; filename?: string; contentType?: string },
  contentHash: string,
): ContextExtractionResult {
  return {
    extractedAt: new Date().toISOString(),
    freshness: "unknown",
    media: [{
      contentType: request.contentType,
      filePath: request.filePath,
      sizeBytes: request.bytes.length,
    }],
    provenance: {
      contentHash,
      materialId: request.materialId,
      source: request.sourceUrl ? "web" : "manual",
      sourceId: request.sourceId,
      sourceUrl: request.sourceUrl,
    },
    rightsRobotsNote: request.sourceUrl
      ? "Accepted URL must comply with Context source policy before report use."
      : "Manual or Telegram-submitted file retained as permissioned editorial material.",
    runtime: "markitdown",
    status: "thin",
  };
}

function withText(
  base: ContextExtractionResult,
  normalizedText: string,
  markdown: string,
  status: ContextExtractionStatus,
): ContextExtractionResult {
  return {
    ...base,
    markdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
    normalizedText: normalizedText.slice(0, MAX_TEXT_CHARS),
    status,
  };
}

function decodeText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/\u0000/g, " ").trim();
}

function isCsv(contentType: string, filename: string) {
  return contentType.includes("csv") || filename.endsWith(".csv");
}

function isHtml(contentType: string, filename: string) {
  return contentType.includes("html") || filename.endsWith(".html") || filename.endsWith(".htm");
}

function isMarkdownLike(contentType: string, filename: string) {
  return contentType.includes("markdown") || filename.endsWith(".md") || filename.endsWith(".markdown");
}

function isOfficeOpenXml(contentType: string, filename: string) {
  return contentType.includes("spreadsheetml") ||
    contentType.includes("wordprocessingml") ||
    filename.endsWith(".xlsx") ||
    filename.endsWith(".xls") ||
    filename.endsWith(".docx");
}

function isPdf(contentType: string, filename: string) {
  return contentType.includes("pdf") || filename.endsWith(".pdf");
}

function isPlainText(contentType: string, filename: string) {
  return contentType.startsWith("text/") || filename.endsWith(".txt");
}

function textToMarkdown(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function htmlToMarkdown(html: string) {
  return decodeHtmlEntities(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function csvToMarkdown(text: string) {
  const delimiter = text.includes(";") && !text.includes(",") ? ";" : ",";
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean))
    .slice(0, 80);
  if (rows.length === 0) {
    return "";
  }
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
  const [header, ...body] = normalized;
  return [
    `| ${header.join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function extractHtmlTitle(html: string) {
  return stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim() || undefined;
}

function extractLinksFromHtml(html: string) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 40);
}

function stripTags(value: string) {
  return decodeHtmlEntities(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}
