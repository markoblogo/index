import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/internal/everyday-index/import-burger/route";

const { importBigMacDatasetMock } = vi.hoisted(() => ({
  importBigMacDatasetMock: vi.fn(),
}));

vi.mock("@/lib/everyday-index/burger-publish", () => ({
  importBigMacDataset: importBigMacDatasetMock,
}));

describe("POST /api/internal/everyday-index/import-burger", () => {
  const originalSecret = process.env.EVERYDAY_INDEX_INGEST_SECRET;

  beforeEach(() => {
    importBigMacDatasetMock.mockReset();
    process.env.EVERYDAY_INDEX_INGEST_SECRET = "test-ingest-secret";
  });

  afterEach(() => {
    if (typeof originalSecret === "string") {
      process.env.EVERYDAY_INDEX_INGEST_SECRET = originalSecret;
      return;
    }

    delete process.env.EVERYDAY_INDEX_INGEST_SECRET;
  });

  it("rejects unsupported methods", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(body).toEqual({
      ok: false,
      error: "Method not allowed",
    });
  });

  it("fails closed when the ingest secret is missing", async () => {
    delete process.env.EVERYDAY_INDEX_INGEST_SECRET;

    const response = await POST(
      new Request("https://day.1d3x.com/api/internal/everyday-index/import-burger", {
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(importBigMacDatasetMock).not.toHaveBeenCalled();
    expect(body).toEqual({
      ok: false,
      error: "EVERYDAY_INDEX_INGEST_SECRET is not configured.",
    });
  });

  it("rejects an invalid bearer token", async () => {
    const response = await POST(
      new Request("https://day.1d3x.com/api/internal/everyday-index/import-burger", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(importBigMacDatasetMock).not.toHaveBeenCalled();
    expect(body).toEqual({
      ok: false,
      error: "Unauthorized",
    });
  });

  it("runs the burger import with a valid token and returns a concise result", async () => {
    importBigMacDatasetMock.mockResolvedValue({
      changedRows: 7,
      parserVersion: "economist-big-mac-csv-v1",
      publishedRows: 6,
      rejectedRows: 1,
      runId: "run-123",
      rowsParsed: 10,
      rowsValidated: 9,
      snapshotHash: "snapshot-abc",
      sourceUrl:
        "https://raw.githubusercontent.com/TheEconomist/big-mac-data/master/output-data/big-mac-full-index.csv",
      startedAt: "2026-06-12T00:00:00.000Z",
      status: "completed",
    });

    const response = await POST(
      new Request("https://day.1d3x.com/api/internal/everyday-index/import-burger", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-ingest-secret",
        },
      }),
    );
    const body = await response.json();

    expect(importBigMacDatasetMock).toHaveBeenCalledWith({
      trigger: "operator_endpoint",
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      source: "big-mac-economist",
      runId: "run-123",
      status: "completed",
      parsed: 10,
      validated: 9,
      published: 6,
      rejected: 1,
      snapshotHash: "snapshot-abc",
      message: "Burger import completed.",
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("latte");
    expect(serialized).not.toContain("iphone");
    expect(serialized).not.toContain("wti");
    expect(serialized).not.toContain("brent");
    expect(serialized).not.toContain("gold");
    expect(serialized).not.toContain("New York");
  });

  it("returns a redacted failure response when the import service throws", async () => {
    importBigMacDatasetMock.mockRejectedValue(new Error("DATABASE_URL=secret"));

    const response = await POST(
      new Request("https://day.1d3x.com/api/internal/everyday-index/import-burger", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-ingest-secret",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      source: "big-mac-economist",
      error: "Burger import failed.",
    });
  });
});
