import { NextResponse } from "next/server";

export function publicDataResponse(data: unknown, cacheSeconds = 300) {
  return NextResponse.json(
    {
      data,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheSeconds}, stale-while-revalidate=3600`,
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
