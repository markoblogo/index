import { getIsoWeekday, getMediaHubLocalTimeParts, shiftIsoDate } from "./media-hub-schedule";
import { VIDEO_PARTS, videoHash, type FrozenVideoReport, type VideoPart, type WeeklyVideoPacket } from "./ssi-weekly-video-packet";

export type WeeklyVideoAsset = {
  part: VideoPart; artifactId: string; sha256: string; packetSha256: string;
  snapshotSha256: string; narrationSha256: string; voiceRevision: string;
  bytes: number; width: number; height: number; fps: number; codec: string; audioCodec: string;
  qa: { decode: boolean; layout: boolean; claims: boolean; audio: boolean; timing: boolean; voiceOnly: boolean };
};
export type WeeklyVideoReadySet = { snapshotSha256: string; packetSha256: string; templateSha256: string; assets: WeeklyVideoAsset[] };
export type FoundersTarget = { tenantId: "spike-ua"; chatId: string; role: "founders_draft"; private: true };
export type PairedItem = { key: string; kind: "text" | "video"; contentHash: string; text?: string; asset?: WeeklyVideoAsset; caption?: string };
export type PairedLedger = { version: 1; identity: string; ids: Array<number | null> };
type Result = { status: string; skippedReason?: string; messageIds?: number[]; [key: string]: unknown };

export function getSsiMacWakeWeek(now: Date) {
  const local = getMediaHubLocalTimeParts(now, "Europe/Kyiv");
  if (getIsoWeekday(local.date) !== 7) return null;
  return { periodEndDate: shiftIsoDate(local.date, -2), deliveryDate: local.date,
    maySend: local.hour >= 9, timezone: "Europe/Kyiv" as const };
}

export function makeWeeklyDraftItems(report: FrozenVideoReport, packet: WeeklyVideoPacket,
  ready: WeeklyVideoReadySet, target: FoundersTarget): { identity: string; items: PairedItem[] } {
  if (target.tenantId !== "spike-ua" || target.role !== "founders_draft" || target.private !== true || !/^-\d+$/.test(target.chatId)) throw new Error("founders_target_invalid");
  const { snapshotSha256, ...snapshot } = report;
  const { packetSha256, ...packetBody } = packet;
  if (!report.validated || videoHash(snapshot) !== snapshotSha256 || videoHash(packetBody) !== packetSha256 ||
    packet.snapshotSha256 !== snapshotSha256 || packet.reportId !== report.reportId || packet.sourceManifestSha256 !== report.sourceManifestSha256 ||
    ready.snapshotSha256 !== snapshotSha256 || ready.packetSha256 !== packetSha256 || ready.templateSha256 !== packet.templateSha256) throw new Error("paired_revision_mismatch");
  if (ready.assets.length !== 3 || !VIDEO_PARTS.every((part, i) => ready.assets[i].part === part && packet.parts[i].id === part)) throw new Error("three_video_set_required");
  for (const [i, asset] of ready.assets.entries()) {
    if (asset.snapshotSha256 !== snapshotSha256 || asset.packetSha256 !== packetSha256 ||
      asset.narrationSha256 !== videoHash(packet.parts[i].scenes.map(scene => scene.narrationEn)) || !asset.voiceRevision ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) || !asset.artifactId || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
      asset.width !== 1080 || asset.height !== 1920 || asset.fps !== 30 || asset.codec !== "h264" || asset.audioCodec !== "aac" ||
      !asset.qa.decode || !asset.qa.layout || !asset.qa.claims || !asset.qa.audio || !asset.qa.timing || !asset.qa.voiceOnly) throw new Error("video_not_ready");
  }
  const items = VIDEO_PARTS.flatMap((part, index): PairedItem[] => [
    { key: `${part}:text`, kind: "text", text: report.parts[index].ukrainianHtml, contentHash: videoHash(report.parts[index].ukrainianHtml) },
    { key: `${part}:video`, kind: "video", asset: ready.assets[index], contentHash: ready.assets[index].sha256,
      caption: `DRAFT · Part ${index + 1} · ${report.period.end} · English narration` },
  ]);
  if (items.some((item, i) => i % 2 === 0 && (item.contentHash !== packet.parts[i / 2].textSha256 || !item.text?.trim() || item.text.length > 4096))) throw new Error("paired_text_changed");
  return { identity: videoHash({ reportId: report.reportId, snapshotSha256, packetSha256, target, items }), items };
}

export type PairedDeliveryStore = {
  claim: (identity: string) => Promise<string | null>;
  release: (lease: string) => Promise<void>;
  load: (lease: string) => Promise<{ ledger: unknown; snapshotSha256: string }>;
  checkpoint: (lease: string, expected: unknown, next: PairedLedger) => Promise<boolean>;
  complete: (lease: string, identity: string, messageIds: number[]) => Promise<boolean>;
};

/** Persisted in-flight markers survive failures; never reset an old ledger. */
export async function deliverWeeklyFoundersDraft(input: {
  report: FrozenVideoReport; packet: WeeklyVideoPacket; ready: WeeklyVideoReadySet; target: FoundersTarget;
  held: boolean; store: PairedDeliveryStore;
  verifyArtifact: (asset: WeeklyVideoAsset) => Promise<boolean>;
  send: (item: PairedItem) => Promise<{ status: "confirmed"; messageId: number } | { status: "rejected" } | { status: "ambiguous" }>;
}): Promise<Result> {
  if (input.held) return { status: "blocked", skippedReason: "ssi_periodic_quality_hold" };
  let pack: ReturnType<typeof makeWeeklyDraftItems>;
  try { pack = makeWeeklyDraftItems(input.report, input.packet, input.ready, input.target); }
  catch { return { status: "blocked", skippedReason: "paired_pack_not_ready" }; }
  const lease = await input.store.claim(pack.identity);
  if (!lease) return { status: "skipped", skippedReason: "delivery_in_progress" };
  try {
    const current = await input.store.load(lease);
    if (current.snapshotSha256 !== input.report.snapshotSha256) return { status: "blocked", skippedReason: "report_revision_changed" };
    let ledger: PairedLedger;
    if (current.ledger === null) ledger = { version: 1, identity: pack.identity, ids: [] };
    else {
      const candidate = current.ledger as PairedLedger;
      if (!candidate || candidate.version !== 1 || candidate.identity !== pack.identity || !Array.isArray(candidate.ids)) return { status: "blocked", skippedReason: "existing_receipts_need_reconciliation" };
      ledger = { ...candidate, ids: [...candidate.ids] };
    }
    if (ledger.ids.length > 6 || ledger.ids.some(id => id !== null && (!Number.isSafeInteger(id) || id <= 0)) ||
      new Set(ledger.ids).size !== ledger.ids.length) return { status: "blocked", skippedReason: "receipts_invalid" };
    if (ledger.ids.includes(null)) return { status: "needs_review", skippedReason: "telegram_delivery_ambiguous" };
    if (ledger.ids.length < 6) {
      for (const asset of input.ready.assets) if (!await input.verifyArtifact(asset)) return { status: "blocked", skippedReason: "video_file_unavailable" };
    }
    let persisted: unknown = current.ledger;
    for (const item of pack.items.slice(ledger.ids.length)) {
      if ((await input.store.load(lease)).snapshotSha256 !== input.report.snapshotSha256) return { status: "blocked", skippedReason: "report_revision_changed" };
      const pending: PairedLedger = { ...ledger, ids: [...ledger.ids, null] };
      if (!await input.store.checkpoint(lease, persisted, pending)) return { status: "needs_review", skippedReason: "delivery_checkpoint_failed" };
      persisted = pending;
      let receipt: Awaited<ReturnType<typeof input.send>>;
      try { receipt = await input.send(item); }
      catch { return { status: "needs_review", skippedReason: "telegram_delivery_ambiguous" }; }
      if (receipt.status === "ambiguous") return { status: "needs_review", skippedReason: "telegram_delivery_ambiguous" };
      if (receipt.status === "rejected") {
        if (!await input.store.checkpoint(lease, persisted, ledger)) return { status: "needs_review", skippedReason: "delivery_checkpoint_failed" };
        return { status: "failed", skippedReason: "telegram_rejected" };
      }
      if (!Number.isSafeInteger(receipt.messageId) || receipt.messageId <= 0 || ledger.ids.includes(receipt.messageId)) return { status: "needs_review", skippedReason: "telegram_delivery_ambiguous" };
      ledger = { ...ledger, ids: [...ledger.ids, receipt.messageId] };
      if (!await input.store.checkpoint(lease, persisted, ledger)) return { status: "needs_review", skippedReason: "delivery_checkpoint_failed" };
      persisted = ledger;
    }
    const ids = ledger.ids as number[];
    if (!await input.store.complete(lease, pack.identity, ids)) return { status: "needs_review", skippedReason: "delivery_completion_pending" };
    return { status: "sent", messageIds: ids };
  } finally { await input.store.release(lease); }
}

/** Called by the Mac worker after login/wake; not a Framewright scheduler. */
export async function runWeeklyFoundersDraftOnWake(now: Date, deps: {
  held: boolean; ssiTenant: boolean;
  loadOrPrepareReport: (periodEndDate: string) => Promise<FrozenVideoReport | null>;
  prepareVideos: (report: FrozenVideoReport) => Promise<WeeklyVideoReadySet | null>;
  deliver: (report: FrozenVideoReport, ready: WeeklyVideoReadySet) => Promise<Result>;
  notifyBlocked: (reason: string, periodEndDate: string) => Promise<void>;
}): Promise<Result> {
  if (!deps.ssiTenant) return { status: "skipped", skippedReason: "ssi_only_workflow" };
  if (deps.held) return { status: "blocked", skippedReason: "ssi_periodic_quality_hold" };
  const week = getSsiMacWakeWeek(now);
  if (!week) return { status: "skipped", skippedReason: "outside_sunday" };
  const report = await deps.loadOrPrepareReport(week.periodEndDate);
  if (!report || !report.validated || report.period.end !== week.periodEndDate) {
    await deps.notifyBlocked("weekly_report_not_ready", week.periodEndDate);
    return { ...week, status: "blocked", skippedReason: "weekly_report_not_ready" };
  }
  const ready = await deps.prepareVideos(report);
  if (!ready) {
    await deps.notifyBlocked("weekly_videos_not_ready", week.periodEndDate);
    return { ...week, status: "blocked", skippedReason: "weekly_videos_not_ready" };
  }
  if (!week.maySend) return { ...week, status: "prepared", skippedReason: "waiting_for_0900_kyiv" };
  const result = await deps.deliver(report, ready);
  if (result.status === "blocked" || result.status === "failed" || result.status === "needs_review") await deps.notifyBlocked(result.skippedReason ?? result.status, week.periodEndDate);
  return { ...week, ...result };
}
