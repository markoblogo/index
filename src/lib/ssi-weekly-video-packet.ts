import { createHash } from "node:crypto";

export const VIDEO_PARTS = ["logistics", "grains", "oilseeds"] as const;
export type VideoPart = typeof VIDEO_PARTS[number];
export type VideoPeriod = { start: string; end: string; label: string };
export type VideoClaim = {
  id: string; evidenceId: string; part: VideoPart; value: number; unit: string;
  basis: string; period: VideoPeriod; english: { headline: string; narration: string; takeaway: string };
};
export type FrozenVideoReport = {
  tenantId: "spike-ua"; reportId: string; period: VideoPeriod;
  sourceManifestSha256: string; evidenceIds: string[]; claims: VideoClaim[];
  parts: Array<{ id: VideoPart; ukrainianHtml: string }>;
  validated: boolean; snapshotSha256: string;
};
export type SceneSelection = {
  id: string; heroClaimId: string; rowClaimIds: string[];
  kind: "rows" | "bars" | "none";
};
export type VideoScene = SceneSelection & {
  headlineEn: string; narrationEn: string; takeawayEn: string;
  hero: VideoClaim; rows: VideoClaim[]; claimIds: string[];
};
export type WeeklyVideoPacket = {
  schemaVersion: 1; tenantId: "spike-ua"; reportId: string; snapshotSha256: string;
  sourceManifestSha256: string; templateSha256: string; packetSha256: string;
  period: VideoPeriod; language: "en";
  parts: Array<{ id: VideoPart; textSha256: string; scenes: VideoScene[] }>;
};

export function videoHash(value: unknown): string {
  const canonical = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(key => [key, canonical((v as Record<string, unknown>)[key])]));
    return v;
  };
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
}
export const isVideoHash = (v: string) => /^[a-f0-9]{64}$/.test(v);
function requireVideo(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(`ssi_video_${reason}`);
}
function periodValid(period: VideoPeriod) {
  return /^\d{4}-\d{2}-\d{2}$/.test(period.start) && /^\d{4}-\d{2}-\d{2}$/.test(period.end) &&
    Number.isFinite(Date.parse(period.start)) && Number.isFinite(Date.parse(period.end)) &&
    new Date(period.start).toISOString().slice(0, 10) === period.start && new Date(period.end).toISOString().slice(0, 10) === period.end &&
    period.start <= period.end && Boolean(period.label.trim());
}
function english(text: string, max: number) {
  return typeof text === "string" && text.trim().length > 0 && text.length <= max && !/[\u0400-\u04ff<>]/u.test(text);
}

/** A derivative of the saved report/evidence, never a second database of facts. */
export function freezeVideoReport(input: Omit<FrozenVideoReport, "snapshotSha256">): FrozenVideoReport {
  requireVideo(input.tenantId === "spike-ua" && input.validated && input.reportId.trim(), "report_not_validated");
  requireVideo(isVideoHash(input.sourceManifestSha256) && periodValid(input.period), "source_identity_invalid");
  requireVideo(input.parts.length === 3 && VIDEO_PARTS.every((part, i) => input.parts[i].id === part), "part_order_invalid");
  requireVideo(input.parts.every(part => part.ukrainianHtml.trim() && part.ukrainianHtml.length <= 4096), "report_text_invalid");
  const evidence = new Set(input.evidenceIds), ids = new Set<string>();
  for (const claim of input.claims) {
    requireVideo(!ids.has(claim.id) && claim.id && evidence.has(claim.evidenceId), "claim_binding_invalid");
    requireVideo(VIDEO_PARTS.includes(claim.part) && Number.isFinite(claim.value) && claim.unit.trim() && claim.basis.trim() && periodValid(claim.period), "claim_metric_invalid");
    requireVideo(english(claim.english.headline, 90) && english(claim.english.narration, 600) && english(claim.english.takeaway, 180), "english_copy_invalid");
    requireVideo(claim.period.end <= input.period.end, "future_claim");
    ids.add(claim.id);
  }
  const cloned = JSON.parse(JSON.stringify(input));
  return { ...cloned, snapshotSha256: videoHash(cloned) };
}

export function buildWeeklyVideoPacket(report: FrozenVideoReport, templateSha256: string,
  selections: Record<VideoPart, SceneSelection[]>): WeeklyVideoPacket {
  const { snapshotSha256, ...snapshot } = report;
  requireVideo(videoHash(snapshot) === snapshotSha256 && report.validated, "snapshot_changed");
  requireVideo(isVideoHash(templateSha256), "template_identity_invalid");
  const claims = new Map(report.claims.map(claim => [claim.id, claim]));
  const parts = VIDEO_PARTS.map((part, index) => {
    const ids = new Set<string>();
    requireVideo(selections[part].length > 0 && selections[part].length <= 12, "scene_count_invalid");
    const scenes = selections[part].map(selection => {
      requireVideo(/^[a-z][a-z0-9-]*$/.test(selection.id) && !ids.has(selection.id), "scene_identity_invalid");
      ids.add(selection.id);
      const hero = claims.get(selection.heroClaimId), rows = selection.rowClaimIds.map(id => claims.get(id));
      requireVideo(hero && hero.part === part && rows.every(row => row && row.part === part), "scene_claim_missing");
      requireVideo(rows.length <= 2 && ["none", "rows", "bars"].includes(selection.kind), "chart_invalid");
      requireVideo(hero.english.headline.length <= 42 && hero.english.narration.length <= 140 && hero.english.takeaway.length <= 100 && rows.every(row => row!.english.headline.length <= 22), "fixed_design_copy_invalid");
      requireVideo(rows.every(row => row!.period.start === hero.period.start && row!.period.end === hero.period.end), "chart_period_mismatch");
      requireVideo(selection.kind !== "none" || rows.length === 0, "chart_none_has_rows");
      const present = rows as VideoClaim[];
      if (selection.kind === "bars") requireVideo(present.every(row => row.unit === present[0].unit && row.basis === present[0].basis), "chart_unit_basis_mismatch");
      return { ...selection, headlineEn: hero.english.headline, narrationEn: hero.english.narration,
        takeawayEn: hero.english.takeaway, hero, rows: present,
        claimIds: [...new Set([hero.id, ...selection.rowClaimIds])] };
    });
    return { id: part, textSha256: videoHash(report.parts[index].ukrainianHtml), scenes };
  });
  const packet = { schemaVersion: 1 as const, tenantId: report.tenantId, reportId: report.reportId,
    snapshotSha256, sourceManifestSha256: report.sourceManifestSha256, templateSha256,
    period: report.period, language: "en" as const, parts };
  return JSON.parse(JSON.stringify({ ...packet, packetSha256: videoHash(packet) }));
}

export function signedVideoBars(values: number[]) {
  requireVideo(values.length > 0 && values.every(Number.isFinite), "bar_values_invalid");
  const min = Math.min(0, ...values), max = Math.max(0, ...values), range = max - min || 1;
  return values.map(value => ({ left: (Math.min(0, value) - min) / range * 100, width: Math.abs(value) / range * 100, zero: -min / range * 100 }));
}

export function planWeeklyVideoCues(scenes: Array<{ id: string; voiceSeconds: number; settledAt: number }>) {
  let start = 0;
  return scenes.map(scene => {
    requireVideo(Number.isFinite(scene.voiceSeconds) && scene.voiceSeconds > 0 && Number.isFinite(scene.settledAt) && scene.settledAt >= 0, "timing_invalid");
    const duration = Math.ceil(Math.max(7.6, 0.3 + scene.voiceSeconds + 2, scene.settledAt + 2) * 30) / 30;
    const cue = { id: scene.id, start, duration, voiceStart: start + 0.3,
      voiceEnd: start + 0.3 + scene.voiceSeconds, settledAt: start + scene.settledAt };
    start += duration;
    return cue;
  });
}
