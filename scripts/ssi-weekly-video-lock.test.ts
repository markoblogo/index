import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { acquireVideoWorkerLock } from "./ssi-weekly-video-lock";

it("allows exactly one local worker and releases its lock", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ssi-lock-")), lock = path.join(root, "lock");
  try {
    const release = acquireVideoWorkerLock(lock);
    expect(release).not.toBeNull();
    expect(acquireVideoWorkerLock(lock)).toBeNull();
    release!();
    const second = acquireVideoWorkerLock(lock);
    expect(second).not.toBeNull(); second!();
  } finally { rmSync(root, { recursive: true, force: true }); }
});
