import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function versionAtLeast(actual: string, minimum: number[]) {
  const parts = actual.split(".").map(Number);
  for (let i = 0; i < minimum.length; i++) {
    if (parts[i] !== minimum[i]) return parts[i] > minimum[i];
  }
  return true;
}

describe("dependency security regressions", () => {
  it("resolves patched Next.js and its matching lint configuration", () => {
    const nextVersion = require("next/package.json").version as string;
    expect(versionAtLeast(nextVersion, [16, 4, 1])).toBe(true);
    const lintPackage = JSON.parse(readFileSync(new URL("../../node_modules/eslint-config-next/package.json", import.meta.url), "utf8"));
    expect(lintPackage.version).toBe(nextVersion);
  });

  it("resolves the fixed IPv6 parser through the Telegram SOCKS dependency", () => {
    const telegramRequire = createRequire(require.resolve("telegram/package.json"));
    const socksRequire = createRequire(telegramRequire.resolve("socks/package.json"));
    const addressVersion = socksRequire("ip-address/package.json").version as string;
    expect(versionAtLeast(addressVersion, [10, 7, 4])).toBe(true);
  });

  it("rejects long zone identifiers promptly while accepting ordinary IPv6", () => {
    // A subprocess bounds the vulnerable parser's synchronous work. No network
    // request or production endpoint is used by this regression test.
    const script = `
      const { Address6 } = require('ip-address');
      const { performance } = require('node:perf_hooks');
      const start = performance.now();
      const rejected = ['\\n', '\\r\\n'].every(ending =>
        !Address6.isValid('%'.repeat(40000) + ending));
      console.log(JSON.stringify({ rejected, elapsedMs: performance.now() - start,
        valid: Address6.isValid('2001:db8::1'),
        validZone: Address6.isValid('fe80::1%eth0') }));
    `;
    const result = JSON.parse(execFileSync(process.execPath, ["-e", script], {
      cwd: process.cwd(), encoding: "utf8", timeout: 8000,
    }));
    expect(result).toMatchObject({ rejected: true, valid: true, validZone: true });
    expect(result.elapsedMs).toBeLessThan(500);
  }, 10000);
});
