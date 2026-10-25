import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** mkdir is exclusive. A missing/invalid owner is conservatively left for review. */
export function acquireVideoWorkerLock(directory: string): (() => void) | null {
  const owner = path.join(directory, "pid");
  try { mkdirSync(directory, { mode: 0o700 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    let pid: number;
    try { pid = Number(readFileSync(owner, "utf8")); } catch { return null; }
    if (!Number.isSafeInteger(pid) || pid <= 0) return null;
    // Do not race to delete a stale directory. The installed launcher owns an OS
    // advisory lock; a direct interrupted invocation needs operator reconciliation.
    return null;
  }
  writeFileSync(owner, String(process.pid), { mode: 0o600 });
  return () => { if (Number(readFileSync(owner, "utf8")) === process.pid) rmSync(directory, { recursive: true }); };
}
