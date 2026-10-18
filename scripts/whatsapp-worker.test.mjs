import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("frozen WhatsApp worker", () => {
  it.each([undefined, "0"])("exits without loading optional runtime when opt-in is %s", (optIn) => {
    const env = { ...process.env, SSI_WHATSAPP_ENABLED: "1" };
    delete env.SSI_WHATSAPP_WORKER_UNFROZEN;
    if (optIn !== undefined) env.SSI_WHATSAPP_WORKER_UNFROZEN = optIn;
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./whatsapp-worker.mjs", import.meta.url))], {
      cwd: tmpdir(), env, encoding: "utf8", timeout: 5_000,
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("WhatsApp worker is frozen");
  });
});
