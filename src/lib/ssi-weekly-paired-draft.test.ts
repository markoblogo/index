import { describe, expect, it, vi } from "vitest";
import { buildWeeklyVideoPacket, freezeVideoReport, planWeeklyVideoCues, signedVideoBars, videoHash, VIDEO_PARTS, type FrozenVideoReport, type SceneSelection, type VideoPart } from "./ssi-weekly-video-packet";
import { deliverWeeklyFoundersDraft, getSsiMacWakeWeek, makeWeeklyDraftItems, runWeeklyFoundersDraftOnWake, type PairedDeliveryStore, type PairedLedger, type WeeklyVideoReadySet } from "./ssi-weekly-paired-draft";

function fixture(end = "2026-10-30") {
  const period = { start: end.slice(0, 8) + "26", end, label: "Completed reporting period" };
  if (period.start > end) period.start = end;
  const report = freezeVideoReport({ tenantId: "spike-ua", reportId: "fixture-report", period,
    sourceManifestSha256: videoHash("fixture-evidence-manifest"), evidenceIds: ["source:1"], validated: true,
    parts: VIDEO_PARTS.map(id => ({ id, ukrainianHtml: `<b>Чернетка ${id}</b>\nПовний український текст.` })),
    claims: VIDEO_PARTS.map((part, i) => ({ id: `claim:${part}`, evidenceId: "source:1", part, value: 100 + i,
      unit: "USD/t", basis: "CPT port", period, english: { headline: "A supported market figure", narration: "This is a supported fixture observation.", takeaway: "Compare like with like." } })) });
  const selections: Record<VideoPart, SceneSelection[]> = { logistics: [], grains: [], oilseeds: [] };
  for (const part of VIDEO_PARTS) selections[part] = [{ id: "overview", heroClaimId: `claim:${part}`, rowClaimIds: [], kind: "none" }];
  const packet = buildWeeklyVideoPacket(report, videoHash("accepted-template-revision"), selections);
  const ready: WeeklyVideoReadySet = { snapshotSha256: report.snapshotSha256, packetSha256: packet.packetSha256, templateSha256: packet.templateSha256,
    assets: VIDEO_PARTS.map((part, i) => ({ part, artifactId: `durable-asset:${i}`, sha256: videoHash(`encoded-video:${i}`), packetSha256: packet.packetSha256,
      snapshotSha256: report.snapshotSha256, narrationSha256: videoHash(packet.parts[i].scenes.map(scene => scene.narrationEn)),
      voiceRevision: "fixture-fresh-voice-revision", bytes: 1000, width: 1080, height: 1920, fps: 30, codec: "h264", audioCodec: "aac",
      qa: { decode: true, layout: true, claims: true, audio: true, timing: true, voiceOnly: true } })) };
  const target = { tenantId: "spike-ua", chatId: "-1001234567890", role: "founders_draft", private: true } as const;
  return { report, packet, ready, target };
}
function setup() {
  const f = fixture(); let ledger: unknown = null, busy = false, completed = false;
  const store: PairedDeliveryStore = {
    claim: vi.fn(async () => { if (busy) return null; busy = true; return "lease"; }),
    release: vi.fn(async () => { busy = false; }),
    load: vi.fn(async () => ({ ledger, snapshotSha256: f.report.snapshotSha256 })),
    checkpoint: vi.fn(async (_lease, expected, next) => {
      if (JSON.stringify(ledger) !== JSON.stringify(expected)) return false;
      ledger = JSON.parse(JSON.stringify(next)); return true;
    }),
    complete: vi.fn(async (_lease, _identity, ids) => { completed = ids.length === 6; return completed; }),
  };
  let nextId = 100;
  const send = vi.fn(async () => ({ status: "confirmed" as const, messageId: nextId++ }));
  return { ...f, held: false, store, verifyArtifact: vi.fn(async () => true), send,
    getLedger: () => ledger as PairedLedger, setLedger: (value: unknown) => { ledger = value; }, completed: () => completed };
}

describe("weekly video data binding", () => {
  it("pins three Ukrainian parts and English scenes to the same immutable revision", () => {
    const f = fixture(); expect(f.packet.parts).toHaveLength(3);
    expect(f.packet.parts.every(part => part.textSha256 && part.scenes[0].hero.period.end === "2026-10-30")).toBe(true);
    expect(JSON.stringify(f.packet)).not.toContain("2026-10-23");
    const corrupt = structuredClone(f.report); corrupt.claims[0].value++;
    expect(() => buildWeeklyVideoPacket(corrupt, f.packet.templateSha256, {} as never)).toThrow("snapshot_changed");
  });
  it("rejects missing evidence, future periods, unsupported language and overlong copy", () => {
    for (const mutate of [
      (r: FrozenVideoReport) => { r.claims[0].evidenceId = "missing"; },
      (r: FrozenVideoReport) => { r.claims[0].period.end = "2027-01-01"; },
      (r: FrozenVideoReport) => { r.claims[0].english.headline = "Неперекладений заголовок"; },
      (r: FrozenVideoReport) => { r.claims[0].english.narration = "X".repeat(601); },
    ]) {
      const report = fixture().report; mutate(report);
      expect(() => freezeVideoReport(report)).toThrow();
    }
  });
  it("uses a zero axis and nonnegative widths for negative/zero/positive bars", () => {
    const bars = signedVideoBars([-20, 0, 40]);
    expect(bars[0].left).toBe(0); expect(bars[1].width).toBe(0);
    expect(bars.every(bar => bar.width >= 0 && bar.left >= 0 && bar.left + bar.width <= 100.00001)).toBe(true);
    expect(signedVideoBars([0])[0].width).toBe(0);
  });
  it("fits short and long speech and late-settling data with both two-second holds", () => {
    const cues = planWeeklyVideoCues([{ id: "short", voiceSeconds: 1, settledAt: 0.8 }, { id: "long", voiceSeconds: 20, settledAt: 2 }, { id: "late", voiceSeconds: 2, settledAt: 12 }]);
    for (const cue of cues) {
      expect(cue.start + cue.duration - cue.voiceEnd).toBeGreaterThanOrEqual(2);
      expect(cue.start + cue.duration - cue.settledAt).toBeGreaterThanOrEqual(2);
      expect(cue.duration * 30).toBeCloseTo(Math.round(cue.duration * 30));
    }
    expect(cues[1].duration).toBeGreaterThan(22);
  });
  it("refuses mixed revisions, stale voices, incomplete sets and public targets", () => {
    for (const mutate of [
      (f: ReturnType<typeof fixture>) => { f.ready.assets.pop(); },
      (f: ReturnType<typeof fixture>) => { f.ready.assets[0].narrationSha256 = videoHash("last week voice"); },
      (f: ReturnType<typeof fixture>) => { f.ready.assets[0].snapshotSha256 = videoHash("old snapshot"); },
      (f: ReturnType<typeof fixture>) => { f.ready.assets[0].qa.timing = false; },
    ]) { const f = fixture(); mutate(f); expect(() => makeWeeklyDraftItems(f.report, f.packet, f.ready, f.target)).toThrow(); }
    const f = fixture(); expect(() => makeWeeklyDraftItems(f.report, f.packet, f.ready, { ...f.target, private: false } as never)).toThrow("target_invalid");
  });
});

describe("six-item founders draft delivery", () => {
  it("sends text/video pairs in order and completes only after six receipts", async () => {
    const f = setup(); expect((await deliverWeeklyFoundersDraft(f)).status).toBe("sent");
    expect(f.send.mock.calls.map(args => (args as unknown as [{ kind: string }])[0].kind)).toEqual(["text", "video", "text", "video", "text", "video"]);
    expect(f.store.complete).toHaveBeenCalledWith("lease", expect.any(String), [100, 101, 102, 103, 104, 105]);
    expect(f.completed()).toBe(true);
    await deliverWeeklyFoundersDraft(f); expect(f.send).toHaveBeenCalledTimes(6);
  });
  it("blocks all side effects on hold and blocks all sends until every file is verified", async () => {
    const f = setup(); await deliverWeeklyFoundersDraft({ ...f, held: true });
    expect(f.store.claim).not.toHaveBeenCalled(); expect(f.send).not.toHaveBeenCalled();
    f.verifyArtifact.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await deliverWeeklyFoundersDraft(f)).toMatchObject({ skippedReason: "video_file_unavailable" });
    expect(f.send).not.toHaveBeenCalled();
  });
  it("resumes only known-unsent items after a confirmed rejection", async () => {
    const f = setup(); let calls = 0;
    const send = vi.fn(async () => ++calls === 2 ? { status: "rejected" as const } : { status: "confirmed" as const, messageId: 200 + calls });
    expect((await deliverWeeklyFoundersDraft({ ...f, send })).status).toBe("failed");
    expect(f.getLedger().ids).toEqual([201]); expect(f.completed()).toBe(false);
    expect((await deliverWeeklyFoundersDraft(f)).status).toBe("sent");
    expect(f.send.mock.calls).toHaveLength(5);
    expect((f.send.mock.calls[0] as unknown as [{ key: string }])[0].key).toBe("logistics:video");
  });
  it("never retries an ambiguous timeout or lost confirmed checkpoint", async () => {
    const f = setup(); const send = vi.fn(async () => { throw new Error("timeout after submission"); });
    expect((await deliverWeeklyFoundersDraft({ ...f, send })).status).toBe("needs_review");
    expect(f.getLedger().ids).toEqual([null]);
    expect((await deliverWeeklyFoundersDraft(f)).status).toBe("needs_review"); expect(f.send).not.toHaveBeenCalled();
  });
  it("does not reinterpret or clear legacy receipts", async () => {
    const f = setup(); f.setLedger([11, 12, 13]);
    expect(await deliverWeeklyFoundersDraft(f)).toMatchObject({ skippedReason: "existing_receipts_need_reconciliation" });
    expect(f.send).not.toHaveBeenCalled();
  });
  it("uses the lock to exclude concurrent runners", async () => {
    const f = setup(); let unlock!: () => void;
    const wait = new Promise<void>(resolve => { unlock = resolve; });
    const send = vi.fn(async () => { await wait; return { status: "confirmed" as const, messageId: 100 + send.mock.calls.length }; });
    const first = deliverWeeklyFoundersDraft({ ...f, send });
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(await deliverWeeklyFoundersDraft(f)).toMatchObject({ skippedReason: "delivery_in_progress" });
    unlock(); expect((await first).status).toBe("sent");
  });
  it("stops before sending if the saved snapshot changed", async () => {
    const f = setup(); vi.mocked(f.store.load).mockResolvedValue({ ledger: null, snapshotSha256: videoHash("new revision") });
    expect(await deliverWeeklyFoundersDraft(f)).toMatchObject({ skippedReason: "report_revision_changed" }); expect(f.send).not.toHaveBeenCalled();
  });
});

describe("Mac Sunday wake coordination", () => {
  it("supports late Sunday delivery but not Monday, with Kyiv DST", () => {
    expect(getSsiMacWakeWeek(new Date("2026-11-01T12:00:00Z"))).toMatchObject({ periodEndDate: "2026-10-30", maySend: true });
    expect(getSsiMacWakeWeek(new Date("2026-11-02T08:00:00Z"))).toBe(null);
    expect(getSsiMacWakeWeek(new Date("2026-03-29T06:00:00Z"))?.maySend).toBe(true);
    expect(getSsiMacWakeWeek(new Date("2026-10-25T07:00:00Z"))?.maySend).toBe(true);
    expect(getSsiMacWakeWeek(new Date("2026-10-25T06:59:00Z"))?.maySend).toBe(false);
  });
  it("prepares before 09:00 without sending, then delivers the same ready set", async () => {
    const f = fixture(); const deps = { held: false, ssiTenant: true, loadOrPrepareReport: vi.fn(async () => f.report),
      prepareVideos: vi.fn(async () => f.ready), deliver: vi.fn(async () => ({ status: "sent" })), notifyBlocked: vi.fn(async () => undefined) };
    expect((await runWeeklyFoundersDraftOnWake(new Date("2026-11-01T06:30:00Z"), deps)).status).toBe("prepared");
    expect(deps.deliver).not.toHaveBeenCalled();
    expect((await runWeeklyFoundersDraftOnWake(new Date("2026-11-01T13:00:00Z"), deps)).status).toBe("sent");
    expect(deps.loadOrPrepareReport).toHaveBeenCalledWith("2026-10-30");
  });
  it("preserves hold, tenant and failed-preparation boundaries", async () => {
    const deps = { held: true, ssiTenant: true, loadOrPrepareReport: vi.fn(async () => null),
      prepareVideos: vi.fn(async () => null), deliver: vi.fn(async () => ({ status: "sent" })), notifyBlocked: vi.fn(async () => undefined) };
    await runWeeklyFoundersDraftOnWake(new Date("2026-11-01T10:00:00Z"), deps); expect(deps.loadOrPrepareReport).not.toHaveBeenCalled();
    await runWeeklyFoundersDraftOnWake(new Date("2026-11-01T10:00:00Z"), { ...deps, held: false, ssiTenant: false }); expect(deps.loadOrPrepareReport).not.toHaveBeenCalled();
    expect((await runWeeklyFoundersDraftOnWake(new Date("2026-11-01T10:00:00Z"), { ...deps, held: false })).status).toBe("blocked");
    expect(deps.deliver).not.toHaveBeenCalled(); expect(deps.notifyBlocked).toHaveBeenCalledWith("weekly_report_not_ready", "2026-10-30");
  });
});
