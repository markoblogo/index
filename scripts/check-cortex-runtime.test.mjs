import { describe, expect, it } from "vitest";
import { parseCortexRuntimeArgs, validateCortexRuntimeCredential, validateCortexRuntimePayload } from "./check-cortex-runtime.mjs";

describe("check-cortex-runtime", () => {
  it("rejects missing credentials and redaction placeholders before requesting health", () => {
    expect(() => validateCortexRuntimeCredential(undefined)).toThrow("is required");
    for (const value of ["[SENSITIVE]", " [SENSITIVE] ", "[REDACTED]", "undefined", "null"]) {
      expect(() => validateCortexRuntimeCredential(value)).toThrow("No request was sent");
    }
    expect(validateCortexRuntimeCredential("fixture-token")).toBe("fixture-token");
  });
  it("accepts a ready Cortex payload", () => {
    expect(validateCortexRuntimePayload({
      assistantProvider: "configured",
      manifest: { generatedAt: "2026-07-14T00:00:00.000Z", totals: { chunks: 4 } },
      mode: "observe-learn",
      ok: true,
      product: "1D3X Cortex",
      service: "cortex-runtime",
    })).toEqual([]);
  });

  it("reports missing runtime components", () => {
    expect(validateCortexRuntimePayload({ ok: false })).toEqual([
      "runtime is not ready",
      "unexpected product",
      "unexpected service",
      "unexpected lifecycle mode",
      "assistant provider is not configured",
      "runtime manifest metadata is missing",
      "runtime manifest totals are missing",
    ]);
  });

  it("supports an explicit health URL without accepting a token argument", () => {
    expect(parseCortexRuntimeArgs(["--url", "https://runtime.example/health"])).toEqual({
      url: "https://runtime.example/health",
    });
  });
});
