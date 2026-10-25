import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWeeklyVideoPacket, freezeVideoReport, VIDEO_PARTS, videoHash } from "./ssi-weekly-video-packet";
import { makeWeeklyDraftItems, type WeeklyVideoReadySet } from "./ssi-weekly-paired-draft";

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), report: vi.fn(), send: vi.fn(), publish: vi.fn(), held: vi.fn(() => false), inTransaction: false }));
vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({ db: { $queryRawUnsafe: mocks.query, $executeRawUnsafe: mocks.execute, $transaction: async (fn: (tx: unknown) => unknown) => { mocks.inTransaction = true; try { return await fn({ $executeRawUnsafe: mocks.execute }); } finally { mocks.inTransaction = false; } } } }));
vi.mock("./index-platform", () => ({ getActiveIndexConfig: () => ({ id: "spike-ua" }) }));
vi.mock("./platform-site", () => ({ isPlatformSite: () => false }));
vi.mock("./ssi-periodic-publication-hold", () => ({ isSsiPeriodicPublicationHeld: mocks.held }));
vi.mock("./fetch-timeout", () => ({ fetchWithTimeout: mocks.send }));
vi.mock("./media-hub-publication-scheduler", () => ({ getMediaHubReport: mocks.report, publishMediaHubSnapshotReport: mocks.publish, buildMediaHubTelegramMessages: vi.fn() }));
vi.mock("./media-hub-google-drive", () => ({ syncGoogleDriveContextMaterials: vi.fn() }));
vi.mock("./ssi-weekly-logistics-control", () => ({ getSsiWeeklyLogisticsPublicationBlock: vi.fn() }));
import { handleSsiVideoWorker } from "./ssi-weekly-video-worker-api";

const snapshot = freezeVideoReport({ tenantId: "spike-ua", reportId: "report", validated: true,
  period: { start: "2026-10-24", end: "2026-10-30", label: "Week" }, sourceManifestSha256: videoHash("evidence"), evidenceIds: ["e"],
  claims: VIDEO_PARTS.map(part => ({ id: part, part, value: 160, unit: "USD/t", basis: "CPT Odesa", evidenceId: "e",
    period: { start: "2026-10-30", end: "2026-10-30", label: "Friday" }, english: { headline: "Corn", narration: "Port prices softened.", takeaway: "Compare delivery bases." } })),
  parts: VIDEO_PARTS.map(id => ({ id, ukrainianHtml: "<b>Тижневий чернетковий звіт</b>" })) });
const packet = buildWeeklyVideoPacket(snapshot, videoHash("template"), { logistics: [{ id: "logistics", heroClaimId: "logistics", rowClaimIds: [], kind: "none" }], grains: [{ id: "grains", heroClaimId: "grains", rowClaimIds: [], kind: "none" }], oilseeds: [{ id: "oilseeds", heroClaimId: "oilseeds", rowClaimIds: [], kind: "none" }] });
const ready: WeeklyVideoReadySet = { snapshotSha256: snapshot.snapshotSha256, packetSha256: packet.packetSha256, templateSha256: packet.templateSha256,
  assets: VIDEO_PARTS.map((part, i) => ({ part, artifactId: "/fixture/" + part, sha256: videoHash(part), packetSha256: packet.packetSha256,
    snapshotSha256: snapshot.snapshotSha256, narrationSha256: videoHash(packet.parts[i].scenes.map(s => s.narrationEn)), voiceRevision: "fixture",
    bytes: Buffer.byteLength(part), width: 1080, height: 1920, fps: 30, codec: "h264", audioCodec: "aac", qa: { decode: true, layout: true, claims: true, audio: true, timing: true, voiceOnly: true } })) };
const pack = makeWeeklyDraftItems(snapshot, packet, ready, { tenantId: "spike-ua", chatId: "-123", role: "founders_draft", private: true });
const baseJob = { id: "job", reportId: "report", baseContentSha256: videoHash({ frozen: true }), snapshot, packet, readySet: ready, targetChatId: "-123",
  ledger: null as null | { version: number; identity: string; ids: Array<number | null> }, lease: "lease" as string | null, leaseUntil: new Date("2026-11-01T11:00:00Z"), activeItem: null as string | null, status: "ready", lastError: null };
let job = structuredClone(baseJob);
const request = (body: Record<string, unknown>) => new Request("https://spike.1d3x.com/api/admin/media-hub/weekly-video-worker", {
  method: "POST", headers: { Authorization: "Bearer fixture-key", "Content-Type": "application/json" }, body: JSON.stringify({ jobId: "job", lease: "lease", ...body }),
});
const action = async (body: Record<string, unknown>) => { const r = await handleSsiVideoWorker(request(body)); return { status: r.status, body: await r.json() }; };

describe("production paired-draft adapter with fake database and Telegram", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-01T10:00:00Z")); vi.clearAllMocks(); job = structuredClone(baseJob);
    vi.stubEnv("SSI_WEEKLY_VIDEO_WORKER_SECRET", "fixture-key"); vi.stubEnv("SSI_WEEKLY_PAIRED_DRAFTS", "1"); vi.stubEnv("SSI_WEEKLY_VIDEO_START_DATE", "2026-11-01");
    vi.stubEnv("SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID", "-123"); vi.stubEnv("SPIKE_TELEGRAM_BOT_TOKEN", "fake-bot");
    mocks.held.mockReturnValue(false);
    mocks.report.mockResolvedValue({ id: "report", status: "published", contentJson: { frozen: true }, telegramSentAt: null });
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT to_regclass")) return [{ installed: true }];
      if (sql.startsWith("SELECT *")) return [structuredClone(job)];
      return [];
    });
    mocks.execute.mockImplementation(async (sql: string, ...args: unknown[]) => {
      if (sql.includes('SET "activeItem"=$3')) { if (job.activeItem) return 0; job.activeItem = String(args[2]); }
      else if (sql.includes('SET "ledger"=$3')) { job.ledger = JSON.parse(String(args[2])); if (sql.includes('"activeItem"=NULL')) job.activeItem = null; }
      return 1;
    });
    mocks.send.mockImplementation(async (url: string) => url.endsWith("/getChat") ? Response.json({ ok: true, result: { type: "supergroup" } }) : Response.json({ ok: true, result: { message_id: 101 } }));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  it("rejects missing authentication and holds before any reads or sends", async () => {
    expect((await handleSsiVideoWorker(new Request(request({}).url))).status).toBe(401);
    mocks.held.mockReturnValue(true);
    expect((await action({ action: "prepare" })).status).toBe(423);
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("allows a read-only configuration check before start without generating", async () => {
    vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
    const response = await handleSsiVideoWorker(new Request(request({}).url + "?preflight=1", { headers: { Authorization: "Bearer fixture-key" } }));
    expect(await response.json()).toMatchObject({ status: "configured", reportsGenerated: false, messagesSent: false });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.send.mock.calls.every(([url]) => String(url).endsWith("/getChat"))).toBe(true);
  });
  it("accepts a PostgreSQL-reordered confirmed receipt without another send", async () => {
    job.ledger = { ids: [101], identity: pack.identity, version: 1 };
    expect(await action({ action: "checkpoint", next: { version: 1, identity: pack.identity, ids: [101] } })).toMatchObject({ status: 200, body: { ok: true } });
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("accepts the identical ready set during a partial resume", async () => {
    job.ledger = { version: 1, identity: pack.identity, ids: [101] };
    expect(await action({ action: "ready", ready })).toMatchObject({ status: 200, body: { status: "ready" } });
  });
  it("stores pending then confirmed receipts on the server before replying", async () => {
    const pending = { version: 1, identity: pack.identity, ids: [null] };
    expect(await action({ action: "checkpoint", expected: null, next: pending })).toMatchObject({ body: { ok: true } });
    expect(await action({ action: "send", key: "logistics:text" })).toMatchObject({ body: { status: "confirmed", messageId: 101 } });
    expect(job.ledger?.ids).toEqual([101]);
    expect((await action({ action: "send", key: "logistics:text" })).status).toBe(409);
    expect(mocks.send.mock.calls.filter(([url]) => String(url).endsWith("/sendMessage"))).toHaveLength(1);
  });
  it("retains an ambiguous marker after a provider timeout, blocking blind retry", async () => {
    job.ledger = { version: 1, identity: pack.identity, ids: [null] };
    mocks.send.mockImplementation(async (url: string) => { if (url.endsWith("/getChat")) return Response.json({ ok: true, result: { type: "group" } }); throw new Error("timeout"); });
    expect(await action({ action: "send", key: "logistics:text" })).toMatchObject({ status: 502, body: { status: "ambiguous" } });
    expect(job.ledger.ids).toEqual([null]); expect(job.activeItem).toBe("logistics:text");
    expect((await action({ action: "claim" })).body.status).toBe("needs_review");
  });
  it("blocks a changed report or a public channel before any sends", async () => {
    mocks.report.mockResolvedValueOnce({ id: "report", contentJson: { changed: true } });
    expect((await action({ action: "load" })).body.reason).toBe("report_revision_changed");
    mocks.send.mockResolvedValue(Response.json({ ok: true, result: { type: "channel", username: "public" } }));
    expect((await action({ action: "claim" })).body.reason).toBe("target_is_not_closed_founders_group");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("cannot finish three-text delivery as if it were six confirmed messages", async () => {
    job.ledger = { version: 1, identity: pack.identity, ids: [101, 102, 103] };
    expect((await action({ action: "complete" })).body.reason).toBe("six_confirmed_receipts_required");
    expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("delivers exactly three ordered pairs and only then marks the report sent", async () => {
    let id = 200;
    mocks.report.mockImplementation(async () => { if (mocks.inTransaction) throw new Error("nested_connection_deadlock"); return { id: "report", status: "published", contentJson: '{"frozen":true}', telegramSentAt: null }; });
    mocks.send.mockImplementation(async (url: string) => url.endsWith("/getChat") ? Response.json({ ok: true, result: { type: "group" } }) : Response.json({ ok: true, result: { message_id: ++id } }));
    for (const item of pack.items) {
      const expected = structuredClone(job.ledger);
      const next = { version: 1, identity: pack.identity, ids: [...(job.ledger?.ids ?? []), null] };
      expect((await action({ action: "checkpoint", expected, next })).body.ok).toBe(true);
      let response;
      if (item.kind === "video") {
        const form = new FormData();
        form.set("metadata", JSON.stringify({ action: "send", jobId: "job", lease: "lease", key: item.key }));
        form.set("file", new Blob([item.asset!.part]), "fixture.mp4");
        response = await handleSsiVideoWorker(new Request(request({}).url, { method: "POST", headers: { Authorization: "Bearer fixture-key" }, body: form }));
      } else response = await handleSsiVideoWorker(request({ action: "send", key: item.key }));
      expect(await response.json()).toMatchObject({ status: "confirmed", messageId: id });
      expect((await action({ action: "checkpoint", expected: next, next: job.ledger })).body.ok).toBe(true);
    }
    expect(job.ledger!.ids).toEqual([201, 202, 203, 204, 205, 206]);
    expect((await action({ action: "complete" })).body.ok).toBe(true);
    expect(mocks.send.mock.calls.map(([url]) => String(url).split('/').at(-1)).filter(method => method !== "getChat")).toEqual(["sendMessage", "sendVideo", "sendMessage", "sendVideo", "sendMessage", "sendVideo"]);
    expect(mocks.execute.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE "MediaHubReport"'))).toHaveLength(1);
  });
  it("rejects expired leases and concurrent ready-set replacement", async () => {
    job.leaseUntil = new Date("2026-11-01T09:59:00Z");
    expect((await action({ action: "load" })).status).toBe(409);
    job.leaseUntil = baseJob.leaseUntil;
    mocks.execute.mockResolvedValue(0);
    expect((await action({ action: "ready", ready: { ...ready, assets: ready.assets.map(a => ({ ...a, artifactId: a.artifactId + ".new" })) } })).status).toBe(409);
  });
});
