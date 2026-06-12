import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { importBigMacDataset } from "@/lib/everyday-index/burger-publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BURGER_SOURCE_KEY = "big-mac-economist";
const IMPORT_MESSAGE = "Burger import completed.";

function getIngestSecret() {
  const secret = process.env.EVERYDAY_INDEX_INGEST_SECRET?.trim();

  return secret && secret.length > 0 ? secret : null;
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method not allowed" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}

export async function POST(request: Request) {
  const secret = getIngestSecret();

  if (!secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "EVERYDAY_INDEX_INGEST_SECRET is not configured.",
      },
      { status: 503 },
    );
  }

  if (!isCronRequestAuthorized(request, [secret])) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await importBigMacDataset({
      trigger: "operator_endpoint",
    });

    return NextResponse.json({
      ok: true,
      source: BURGER_SOURCE_KEY,
      runId: result.runId,
      status: result.status,
      parsed: result.rowsParsed,
      validated: result.rowsValidated,
      published: result.publishedRows,
      rejected: result.rejectedRows,
      snapshotHash: result.snapshotHash,
      message: IMPORT_MESSAGE,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        source: BURGER_SOURCE_KEY,
        error: "Burger import failed.",
      },
      { status: 500 },
    );
  }
}
