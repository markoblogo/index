import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("pins supported screenshot capture for unattended Mac renders without changing the wake schedule", () => {
  const source = readFileSync(new URL("../../scripts/install-ssi-weekly-video-worker.mjs", import.meta.url), "utf8");
  expect(source).toContain("<key>PRODUCER_EXPERIMENTAL_FAST_CAPTURE</key><string>false</string>");
  expect(source).toContain("<key>RunAtLoad</key><true/>");
  expect(source).toContain("<key>StartInterval</key><integer>300</integer>");
});
