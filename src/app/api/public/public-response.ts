import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export function publicDataResponse(data: unknown, cacheSeconds = 300, request?: Request) {
  const etag = buildPublicDataEtag(data);
  if (request?.headers.get("if-none-match") === etag) {
    return new Response(null, {
      headers: {
        "Cache-Control": publicCacheControl(cacheSeconds),
        ETag: etag,
      },
      status: 304,
    });
  }

  return NextResponse.json(
    {
      data,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": publicCacheControl(cacheSeconds),
        ETag: etag,
      },
    },
  );
}

export function publicDataUnavailableResponse(source: string, error: unknown) {
  console.error(source, sanitizeError(error));
  return NextResponse.json(
    {
      error: "public_data_unavailable",
      generatedAt: new Date().toISOString(),
      ok: false,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 503,
    },
  );
}

function sanitizeError(error: unknown) {
  return error instanceof Error
    ? { message: error.message.slice(0, 180), name: error.name }
    : { message: "unknown_error" };
}

function buildPublicDataEtag(data: unknown) {
  return `W/"${createHash("sha256").update(stableStringify(data)).digest("base64url").slice(0, 24)}"`;
}

function publicCacheControl(cacheSeconds: number) {
  if (cacheSeconds <= 0) {
    return "no-store";
  }

  return `public, s-maxage=${cacheSeconds}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
