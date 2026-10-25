import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deliverWeeklyFoundersDraft, getSsiMacWakeWeek, type PairedDeliveryStore, type WeeklyVideoReadySet } from "../src/lib/ssi-weekly-paired-draft";
import { makeWeeklyDraftItems } from "../src/lib/ssi-weekly-paired-draft";
import type { FrozenVideoReport, WeeklyVideoPacket } from "../src/lib/ssi-weekly-video-packet";
import { acquireVideoWorkerLock } from "./ssi-weekly-video-lock";

type Config = { apiUrl: string; keychainService: string; startDate: string; workRoot: string; python: string; rendererPath?: string };
type Job = { id: string; snapshot: FrozenVideoReport; packet: WeeklyVideoPacket; readySet: WeeklyVideoReadySet | null;
  targetChatId: string; status: string; ledger: unknown };
const option = (name: string) => process.argv[process.argv.indexOf(name) + 1];
const configPath = option("--config");
if (!configPath || !process.argv.includes("--config")) throw new Error("worker_config_required");
const config = JSON.parse(readFileSync(configPath, "utf8")) as Config;
const renderer = config.rendererPath ?? fileURLToPath(new URL("../services/ssi-weekly-video-worker/render.py", import.meta.url));
process.umask(0o077);

function preflight() {
  const output = execFileSync(config.python, [renderer, "--config", configPath, "--preflight"], { encoding: "utf8", maxBuffer: 1024 * 1024 });
  console.log(output.trim());
}

async function main() {
  if (process.argv.includes("--preflight")) { preflight(); return; }
  if (process.argv.includes("--preflight-server")) {
    const token = execFileSync("/usr/bin/security", ["find-generic-password", "-s", config.keychainService, "-a", userInfo().username, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (config.apiUrl !== "https://spike.1d3x.com/api/admin/media-hub/weekly-video-worker") throw new Error("worker_api_target_invalid");
    const response = await fetch(config.apiUrl + "?preflight=1", { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    console.log(JSON.stringify(result));
    if (!response.ok) process.exitCode = 1;
    return;
  }
  const now = new Date(), week = getSsiMacWakeWeek(now);
  if (!week || week.deliveryDate < config.startDate) { console.log(JSON.stringify({ status: "skipped", reason: "outside_authorized_sunday" })); return; }
  const apiUrl = new URL(config.apiUrl);
  if (apiUrl.protocol !== "https:" || apiUrl.hostname !== "spike.1d3x.com" || apiUrl.pathname !== "/api/admin/media-hub/weekly-video-worker") throw new Error("worker_api_target_invalid");
  mkdirSync(config.workRoot, { recursive: true, mode: 0o700 });
  const releaseLock = acquireVideoWorkerLock(path.join(config.workRoot, "worker.lock"));
  if (!releaseLock) { console.log('{"status":"already_running"}'); return; }
  const caffeinate = spawn("/usr/bin/caffeinate", ["-dimsu", "-w", String(process.pid)], { stdio: "ignore" });
  try {
    const token = execFileSync("/usr/bin/security", ["find-generic-password", "-s", config.keychainService, "-a", userInfo().username, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const api = async (body: Record<string, unknown>, file?: string) => {
      let payload: string | FormData;
      if (file) { const form = new FormData(); form.set("metadata", JSON.stringify(body)); form.set("file", new Blob([readFileSync(file)], { type: "video/mp4" }), "draft.mp4"); payload = form; }
      else payload = JSON.stringify(body);
      const response = await fetch(apiUrl, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...(file ? {} : { "Content-Type": "application/json" }) }, body: payload, signal: AbortSignal.timeout(295000) });
      const value = await response.json() as Record<string, unknown>;
      if (!response.ok) throw new Error(typeof value.reason === "string" ? value.reason : `worker_api_${response.status}`);
      return value;
    };
    const prepared = await api({ action: "prepare" });
    if (prepared.status === "already_sent") { console.log('{"status":"already_sent"}'); return; }
    const job = prepared.job as Job | undefined;
    if (!job || !["prepared", "ready", "sent"].includes(job.status)) throw new Error("weekly_report_or_video_job_not_ready");
    const jobDir = path.join(config.workRoot, job.packet.packetSha256);
    mkdirSync(jobDir, { recursive: true, mode: 0o700 });
    const jobPath = path.join(jobDir, "job.json");
    writeFileSync(jobPath, JSON.stringify(job), { mode: 0o600 });
    const readyPath = path.join(jobDir, "ready-set.json");
    let ready = existsSync(readyPath) ? JSON.parse(readFileSync(readyPath, "utf8")) as WeeklyVideoReadySet : null;
    const fileVerified = async (asset: WeeklyVideoReadySet["assets"][number]) => {
      const file = path.resolve(asset.artifactId);
      return file.startsWith(path.resolve(jobDir) + path.sep) && existsSync(file) &&
        createHash("sha256").update(readFileSync(file)).digest("hex") === asset.sha256;
    };
    if (ready) {
      try { makeWeeklyDraftItems(job.snapshot, job.packet, ready, { tenantId: "spike-ua", chatId: job.targetChatId, role: "founders_draft", private: true });
        for (const asset of ready.assets) if (!await fileVerified(asset)) throw new Error("cached_file_changed");
      } catch { ready = null; }
    }
    if (!ready) {
      if (job.ledger) throw new Error("missing_files_after_delivery_started");
      execFileSync(config.python, [renderer, "--config", configPath, "--job", jobPath], { env: { ...process.env, SSI_VIDEO_ENABLE_RENDER: "1" }, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024, timeout: 3 * 60 * 60 * 1000 });
      ready = JSON.parse(readFileSync(readyPath, "utf8")) as WeeklyVideoReadySet;
    }
    await api({ action: "ready", jobId: job.id, ready });
    const sendWeek = getSsiMacWakeWeek(new Date());
    if (!sendWeek || sendWeek.periodEndDate !== job.snapshot.period.end || !sendWeek.maySend) { console.log('{"status":"prepared_waiting_for_slot"}'); return; }
    const store: PairedDeliveryStore = {
      claim: async () => (await api({ action: "claim", jobId: job.id })).lease as string | null,
      release: async lease => { await api({ action: "release", jobId: job.id, lease }); },
      load: async lease => await api({ action: "load", jobId: job.id, lease }) as { ledger: unknown; snapshotSha256: string },
      checkpoint: async (lease, expected, next) => Boolean((await api({ action: "checkpoint", jobId: job.id, lease, expected, next })).ok),
      complete: async lease => Boolean((await api({ action: "complete", jobId: job.id, lease })).ok),
    };
    let currentLease: string | null = null;
    const claim = store.claim;
    store.claim = async identity => { currentLease = await claim(identity); return currentLease; };
    const result = await deliverWeeklyFoundersDraft({ report: job.snapshot, packet: job.packet, ready,
      target: { tenantId: "spike-ua", chatId: job.targetChatId, role: "founders_draft", private: true }, held: false, store,
      verifyArtifact: fileVerified,
      send: async item => {
        const value = await api({ action: "send", jobId: job.id, lease: currentLease, key: item.key }, item.asset?.artifactId);
        if (value.status === "confirmed" && typeof value.messageId === "number") return { status: "confirmed", messageId: value.messageId };
        return value.status === "rejected" ? { status: "rejected" } : { status: "ambiguous" };
      },
    });
    const temp = path.join(config.workRoot, "last-status.tmp");
    writeFileSync(temp, JSON.stringify({ at: new Date().toISOString(), periodEndDate: job.snapshot.period.end, ...result }));
    renameSync(temp, path.join(config.workRoot, "last-status.json"));
    console.log(JSON.stringify(result));
  } finally {
    releaseLock();
    caffeinate.kill();
  }
}
main().catch(error => {
  // Never log request headers, credentials, untrusted provider payloads or report text.
  const reason = error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "worker_operation_failed";
  console.error(JSON.stringify({ status: "blocked", reason }));
  process.exitCode = 1;
});
