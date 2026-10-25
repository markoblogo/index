import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { getActiveIndexConfig } from "./index-platform";
import { isPlatformSite } from "./platform-site";
import { isSsiPeriodicPublicationHeld } from "./ssi-periodic-publication-hold";
import { authorizeSsiVideoWorker } from "./ssi-weekly-video-worker-auth";
import { isBearerTokenAuthorized } from "./cron-auth";
import { fetchWithTimeout } from "./fetch-timeout";
import { getMediaHubReport, publishMediaHubSnapshotReport, buildMediaHubTelegramMessages } from "./media-hub-publication-scheduler";
import { syncGoogleDriveContextMaterials } from "./media-hub-google-drive";
import { getSsiWeeklyLogisticsPublicationBlock } from "./ssi-weekly-logistics-control";
import { freezeVideoReport, buildWeeklyVideoPacket, videoHash, VIDEO_PARTS, type FrozenVideoReport, type VideoClaim, type SceneSelection, type VideoPart, type WeeklyVideoPacket } from "./ssi-weekly-video-packet";
import { makeWeeklyDraftItems, type PairedLedger, type WeeklyVideoReadySet } from "./ssi-weekly-paired-draft";
import { videoClaimMatchesReport } from "./ssi-weekly-video-source-guard";

type Job = { id: string; reportId: string; baseContentSha256: string; snapshot: FrozenVideoReport; packet: WeeklyVideoPacket;
  readySet: WeeklyVideoReadySet | null; targetChatId: string; ledger: PairedLedger | null; lease: string | null;
  leaseUntil: Date | string | null; activeItem: string | null; status: string; lastError: string | null };
const MAX_VIDEO_BYTES = 3_900_000;
const reportContentHash = (value: unknown) => videoHash(typeof value === "string" ? JSON.parse(value) : value);
const chatId = () => process.env.SPIKE_MEDIA_HUB_TELEGRAM_CHAT_ID || process.env.MEDIA_HUB_TELEGRAM_CHAT_ID || process.env.SPIKE_WEEKLY_REPORT_TELEGRAM_CHAT_ID || process.env.SPIKE_AI_TELEGRAM_CHAT_ID;
const botToken = () => process.env.SPIKE_TELEGRAM_BOT_TOKEN || process.env.INDEX_TELEGRAM_BOT_TOKEN;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });

async function privateFoundersTarget(id: string) {
  if (!botToken() || !/^-\d+$/.test(id) || id !== chatId()) throw new Error("founders_target_not_configured");
  const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken()}/getChat`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: id }),
  }, 15000);
  const payload = await response.json() as { ok?: boolean; result?: { type?: string; username?: string } };
  if (!response.ok || !payload.ok || !["group", "supergroup"].includes(payload.result?.type ?? "") || payload.result?.username) throw new Error("target_is_not_closed_founders_group");
  return { tenantId: "spike-ua", chatId: id, private: true, role: "founders_draft" } as const;
}
async function currentJob(end: string, id?: string) {
  const rows = await db.$queryRawUnsafe<Job[]>('SELECT * FROM private."SsiWeeklyVideoJob" WHERE "tenantId" = $1 AND "periodEnd" = $2::date AND ($3::text IS NULL OR "id" = $3) ORDER BY "createdAt" DESC LIMIT 1', "spike-ua", end, id ?? null);
  return rows[0] ?? null;
}
async function reportForJob(job: Job, end: string) {
  const report = await getMediaHubReport("weekly", end, "spike-ua");
  if (!report || report.id !== job.reportId || reportContentHash(report.contentJson) !== job.baseContentSha256) throw new Error("report_revision_changed");
  return report;
}
function plain(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/&(?:amp|nbsp|quot);/g, " ").replace(/\s+/g, " ").trim(); }

async function prepareJob(end: string) {
  let report = await getMediaHubReport("weekly", end, "spike-ua");
  if (report?.telegramSentAt) return { status: "already_sent" };
  const existing = await currentJob(end);
  if (existing && report && existing.baseContentSha256 === reportContentHash(report.contentJson)) return { status: existing.status, job: existing };
  if (existing) throw new Error("report_revision_changed");
  if (!report || report.status !== "published") {
    const imported = await syncGoogleDriveContextMaterials();
    if (imported.status !== "processed" || imported.remainingCount !== 0) return { status: "blocked", reason: "drive_import_incomplete" };
    const blocked = await getSsiWeeklyLogisticsPublicationBlock({ periodEndDate: end, publishTelegram: false });
    if (blocked) return blocked;
    await publishMediaHubSnapshotReport("weekly", end);
    report = await getMediaHubReport("weekly", end, "spike-ua");
  }
  if (!report || report.status !== "published" || report.telegramSentAt) throw new Error("weekly_report_not_ready");
  type Content = Parameters<typeof buildMediaHubTelegramMessages>[0]["content"];
  const content = (typeof report.contentJson === "string" ? JSON.parse(report.contentJson) : report.contentJson) as Content;
  if (content.validation?.status !== "passed" || content.validation.unsupportedClaims.length) throw new Error("weekly_claims_need_review");
  const texts = buildMediaHubTelegramMessages({ content, kind: "weekly", latestData: [], locale: "uk", periodEndDate: end, tenant: "spike" });
  if (texts.length !== 3 || !content.evidence?.length) throw new Error("weekly_evidence_missing");
  const target = await privateFoundersTarget(chatId() ?? "");
  if (!process.env.OPENAI_API_KEY) throw new Error("video_metadata_provider_not_configured");
  const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.SPIKE_WEEKLY_EDITORIAL_MODEL || process.env.SPIKE_WEEKLY_REPORT_MODEL || "gpt-4.1-mini", max_output_tokens: 14000,
      input: JSON.stringify({ task: "Create English scene METADATA ONLY for this frozen validated Ukrainian founders draft, not a new report. No external search, new facts, advice or invented numbers. Exactly logistics, grains, oilseeds. Target 5/7/10 short scenes, omit unsupported optional scenes, at most 12 per part. Short headline <=42 characters, row headline <=22, narration <=140 characters (commentary, not reading every number), takeaway <=100. Return strict JSON {claims:[{id,evidenceId,part,value,unit,basis,period:{start,end,label},sourceQuote,english:{headline,narration,takeaway}}],selections:{logistics:[{id,heroClaimId,rowClaimIds,kind}],grains:[],oilseeds:[]}}. All quotes must be exact excerpts of the corresponding Ukrainian part; values must occur there. Evidence IDs must be from the supplied ledger. Keep each unit/basis/observation date exactly comparable to that excerpt. Units: USD/t, EUR/t, USD/short ton, cents/bu, cents/lb, thousand tonnes, million tonnes, tonnes, wagons/day, %, percentage points, USD/bbl, MYR/t. Allowed bases: CPT Odesa, CPT port, CPT plant, FCA Chop, CBOT, MATIF, BMD, WTI, Brent, FOB Northern Europe, FOB Netherlands, FCA Hamburg, customs clearance, road passage, rail transportation, border handovers. kind=none with zero rows, rows or bars with max2 rows. Bars may not mix units/bases. English labels must identify the crop or flow. Never copy a prior week's voice/date/value. A field's lack of evidence means omit the scene, not zero-fill.",
        period: { start: content.periodStartDate, end }, parts: VIDEO_PARTS.map((id, i) => ({ id, ukrainianText: plain(texts[i]) })), evidence: content.evidence }),
    }),
  }, 180000);
  const raw = await response.json() as { status?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  if (!response.ok || raw.status !== "completed") throw new Error("video_metadata_generation_failed");
  const text = raw.output?.flatMap(item => item.content ?? []).map(item => item.text ?? "").join("") ?? "";
  const draft = JSON.parse(text) as { claims: Array<VideoClaim & { sourceQuote: string }>; selections: Record<VideoPart, SceneSelection[]> };
  for (const claim of draft.claims) {
    const i = VIDEO_PARTS.indexOf(claim.part);
    if (i < 0 || !videoClaimMatchesReport(claim, texts[i], end)) throw new Error("video_claim_quote_mismatch");
  }
  const snapshot = freezeVideoReport({ tenantId: "spike-ua", reportId: report.id,
    period: { start: content.periodStartDate, end, label: `${content.periodStartDate} - ${end}` }, validated: true,
    sourceManifestSha256: videoHash(content.evidence), evidenceIds: content.evidence.map(item => item.id), claims: draft.claims,
    parts: VIDEO_PARTS.map((id, i) => ({ id, ukrainianHtml: texts[i] })) });
  const templateSha = process.env.SSI_WEEKLY_VIDEO_TEMPLATE_SHA256;
  if (!templateSha) throw new Error("video_template_not_configured");
  const packet = buildWeeklyVideoPacket(snapshot, templateSha, draft.selections);
  await reportForJob({ reportId: report.id, baseContentSha256: reportContentHash(report.contentJson) } as Job, end);
  const id = randomUUID();
  await db.$executeRawUnsafe('INSERT INTO private."SsiWeeklyVideoJob" ("id","tenantId","reportId","periodEnd","baseContentSha256","snapshot","packet","targetChatId") VALUES ($1,$2,$3,$4::date,$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT ("tenantId","reportId","baseContentSha256") DO NOTHING', id, "spike-ua", report.id, end, reportContentHash(report.contentJson), JSON.stringify(snapshot), JSON.stringify(packet), target.chatId);
  return { status: "prepared", job: await currentJob(end) };
}

export async function handleSsiVideoWorker(request: Request) {
  if (request.method === "GET" && new URL(request.url).searchParams.get("preflight") === "1") {
    if (!isBearerTokenAuthorized(request, [process.env.SSI_WEEKLY_VIDEO_WORKER_SECRET])) return json({ error: "unauthorized" }, 401);
    if (isPlatformSite() || getActiveIndexConfig().id !== "spike-ua") return json({ error: "ssi_only" }, 403);
    try {
      const target = await privateFoundersTarget(chatId() ?? "");
      const rows = await db.$queryRawUnsafe<Array<{ installed: boolean }>>('SELECT to_regclass(\'private."SsiWeeklyVideoJob"\') IS NOT NULL AS installed');
      if (rows[0]?.installed) {
        await db.$queryRawUnsafe('SELECT "id" FROM private."SsiWeeklyVideoJob" LIMIT 0');
        await db.$queryRawUnsafe('SELECT "periodEnd" FROM private."SsiWeeklyVideoPreparation" LIMIT 0');
      }
      return json({ status: rows[0]?.installed ? "configured" : "migration_required", foundersGroupPrivate: target.private,
        pairedMode: process.env.SSI_WEEKLY_PAIRED_DRAFTS === "1", held: isSsiPeriodicPublicationHeld("spike-ua", "weekly"),
        startsOn: process.env.SSI_WEEKLY_VIDEO_START_DATE ?? "2026-11-01", reportsGenerated: false, messagesSent: false });
    } catch { return json({ status: "blocked", reason: "worker_configuration_not_ready" }, 503); }
  }
  const auth = authorizeSsiVideoWorker(request, { secret: process.env.SSI_WEEKLY_VIDEO_WORKER_SECRET,
    enabled: process.env.SSI_WEEKLY_PAIRED_DRAFTS === "1", ssiTenant: !isPlatformSite() && getActiveIndexConfig().id === "spike-ua",
    held: isSsiPeriodicPublicationHeld("spike-ua", "weekly"), startDate: process.env.SSI_WEEKLY_VIDEO_START_DATE ?? "2026-11-01", now: new Date() });
  if (auth.status !== 200 || !auth.week) return json({ status: "blocked", reason: auth.reason }, auth.status);
  try {
    const end = auth.week.periodEndDate;
    if (request.method === "GET") return json({ status: "ok", week: auth.week, job: await currentJob(end) });
    if (Number(request.headers.get("content-length")) > 4_200_000) return json({ error: "request_too_large" }, 413);
    const multipart = request.headers.get("content-type")?.includes("multipart/form-data");
    const form = multipart ? await request.formData() : null;
    const body = (form ? JSON.parse(String(form.get("metadata"))) : await request.json()) as {
      action: string; jobId?: string; lease?: string; identity?: string; expected?: unknown; next?: PairedLedger; ready?: WeeklyVideoReadySet; key?: string;
    };
    if (body.action === "prepare") {
      const token = randomUUID();
      const claimed = await db.$queryRawUnsafe<Array<{ periodEnd: Date }>>('INSERT INTO private."SsiWeeklyVideoPreparation" ("periodEnd","lease","retryAfter") VALUES ($1::date,$2,NOW()+INTERVAL \'20 minutes\') ON CONFLICT ("periodEnd") DO UPDATE SET "lease"=$2,"retryAfter"=NOW()+INTERVAL \'20 minutes\' WHERE "SsiWeeklyVideoPreparation"."retryAfter"<NOW() RETURNING "periodEnd"', end, token);
      if (!claimed.length) return json({ status: "waiting", reason: "preparation_in_progress_or_backoff" });
      try {
        const result = await prepareJob(end);
        await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoPreparation" SET "retryAfter"=NOW() WHERE "periodEnd"=$1::date AND "lease"=$2', end, token);
        return json(result);
      } catch (error) {
        await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoPreparation" SET "retryAfter"=NOW()+INTERVAL \'30 minutes\' WHERE "periodEnd"=$1::date AND "lease"=$2', end, token);
        throw error;
      }
    }
    const job = await currentJob(end, body.jobId);
    if (!job || !body.jobId || job.id !== body.jobId) return json({ error: "job_not_found" }, 404);
    const sourceReport = await reportForJob(job, end);
    if (body.action === "ready") {
      if (!body.ready || body.ready.assets.some(asset => asset.bytes > MAX_VIDEO_BYTES)) throw new Error("video_exceeds_delivery_limit");
      makeWeeklyDraftItems(job.snapshot, job.packet, body.ready, await privateFoundersTarget(job.targetChatId));
      if (job.readySet && videoHash(job.readySet) === videoHash(body.ready)) return json({ status: "ready" });
      if (job.ledger?.ids.length || job.activeItem) throw new Error("existing_receipts_need_review");
      const changed = await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "readySet"=$2::jsonb,"status"=\'ready\',"updatedAt"=NOW() WHERE "id"=$1 AND "ledger" IS NULL AND "activeItem" IS NULL AND "lease" IS NULL', job.id, JSON.stringify(body.ready));
      if (changed !== 1) throw new Error("ready_set_changed_concurrently");
      return json({ status: "ready" });
    }
    if (!job.readySet) throw new Error("all_three_videos_required");
    const pack = makeWeeklyDraftItems(job.snapshot, job.packet, job.readySet, await privateFoundersTarget(job.targetChatId));
    if (body.action === "claim") {
      if (!auth.week.maySend) return json({ status: "waiting_for_0900_kyiv" }, 409);
      if (job.ledger?.ids.includes(null) || job.activeItem) return json({ status: "needs_review", reason: "telegram_delivery_ambiguous" }, 409);
      const lease = randomUUID();
      const rows = await db.$queryRawUnsafe<Array<{ id: string }>>('UPDATE private."SsiWeeklyVideoJob" SET "lease"=$2,"leaseUntil"=NOW()+INTERVAL \'15 minutes\',"updatedAt"=NOW() WHERE "id"=$1 AND ("lease" IS NULL OR "leaseUntil"<NOW()) AND "activeItem" IS NULL RETURNING "id"', job.id, lease);
      return json({ lease: rows.length ? lease : null });
    }
    if (job.lease !== body.lease || !body.lease || !job.leaseUntil || new Date(job.leaseUntil).getTime() <= Date.now()) return json({ error: "lease_invalid" }, 409);
    if (body.action === "load") return json({ ledger: job.ledger, snapshotSha256: job.snapshot.snapshotSha256 });
    if (body.action === "release") {
      await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "lease"=NULL,"leaseUntil"=NULL WHERE "id"=$1 AND "lease"=$2', job.id, body.lease);
      return json({ status: "released" });
    }
    if (body.action === "checkpoint") {
      if (body.next && videoHash(job.ledger) === videoHash(body.next)) return json({ ok: true });
      const old = job.ledger?.ids ?? [], next = body.next;
      if (!next || next.version !== 1 || next.identity !== pack.identity || next.ids.length !== old.length + 1 || next.ids.at(-1) !== null ||
        JSON.stringify(next.ids.slice(0, -1)) !== JSON.stringify(old) || old.includes(null) || next.ids.length > 6) throw new Error("checkpoint_transition_invalid");
      const changed = await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "ledger"=$3::jsonb,"updatedAt"=NOW() WHERE "id"=$1 AND "lease"=$2 AND COALESCE("ledger",\'null\'::jsonb)=$4::jsonb', job.id, body.lease, JSON.stringify(next), JSON.stringify(body.expected ?? null));
      return json({ ok: changed === 1 });
    }
    if (body.action === "send") {
      if (!auth.week.maySend || !job.ledger || job.ledger.identity !== pack.identity || job.ledger.ids.at(-1) !== null) throw new Error("pending_receipt_required");
      const item = pack.items[job.ledger.ids.length - 1];
      if (item.key !== body.key) throw new Error("item_order_invalid");
      const upload = form?.get("file");
      let bytes: Uint8Array | null = null;
      if (item.kind === "video") {
        if (!(upload instanceof File) || upload.size > MAX_VIDEO_BYTES || upload.size !== item.asset?.bytes) throw new Error("video_upload_invalid");
        bytes = new Uint8Array(await upload.arrayBuffer());
        const { createHash } = await import("node:crypto");
        if (createHash("sha256").update(bytes).digest("hex") !== item.asset.sha256) throw new Error("video_bytes_changed");
      }
      const claimed = await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "activeItem"=$3 WHERE "id"=$1 AND "lease"=$2 AND "activeItem" IS NULL AND "ledger"=$4::jsonb', job.id, body.lease, item.key, JSON.stringify(job.ledger));
      if (claimed !== 1) return json({ status: "ambiguous" }, 409);
      let response: Response;
      try {
        if (bytes) {
          const outgoing = new FormData(); outgoing.set("chat_id", job.targetChatId); outgoing.set("caption", item.caption ?? "DRAFT"); outgoing.set("supports_streaming", "true");
          outgoing.set("video", new Blob([Buffer.from(bytes)], { type: "video/mp4" }), `${item.key.replace(":", "-")}.mp4`);
          response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken()}/sendVideo`, { method: "POST", body: outgoing }, 25000);
        } else response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken()}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: job.targetChatId, text: item.text, parse_mode: "HTML", disable_web_page_preview: true }),
        }, 15000);
        const receipt = await response.json() as { ok?: boolean; result?: { message_id?: number } };
        if (!response.ok || !receipt.ok || !Number.isSafeInteger(receipt.result?.message_id) || (receipt.result?.message_id ?? 0) <= 0) {
          if (response.status < 500 && response.status >= 400 && receipt.ok === false) {
            const ledger = { ...job.ledger, ids: job.ledger.ids.slice(0, -1) };
            await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "ledger"=$3::jsonb,"activeItem"=NULL WHERE "id"=$1 AND "lease"=$2 AND "activeItem"=$4', job.id, body.lease, JSON.stringify(ledger), item.key);
            return json({ status: "rejected" });
          }
          return json({ status: "ambiguous" }, 502);
        }
        const ledger = { ...job.ledger, ids: [...job.ledger.ids.slice(0, -1), receipt.result!.message_id!] };
        const saved = await db.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "ledger"=$3::jsonb,"activeItem"=NULL WHERE "id"=$1 AND "lease"=$2 AND "activeItem"=$4 AND "ledger"=$5::jsonb', job.id, body.lease, JSON.stringify(ledger), item.key, JSON.stringify(job.ledger));
        return saved === 1 ? json({ status: "confirmed", messageId: receipt.result!.message_id }) : json({ status: "ambiguous" }, 502);
      } catch { return json({ status: "ambiguous" }, 502); }
    }
    if (body.action === "complete") {
      if (job.ledger?.identity !== pack.identity || job.ledger.ids.length !== 6 || job.ledger.ids.some(id => !Number.isSafeInteger(id) || (id ?? 0) <= 0) || new Set(job.ledger.ids).size !== 6) throw new Error("six_confirmed_receipts_required");
      await db.$transaction(async tx => {
        const fenced = await tx.$executeRawUnsafe('UPDATE private."SsiWeeklyVideoJob" SET "status"=\'sent\',"updatedAt"=NOW() WHERE "id"=$1 AND "lease"=$2 AND "leaseUntil">NOW() AND "activeItem" IS NULL AND "ledger"=$3::jsonb', job.id, body.lease, JSON.stringify(job.ledger));
        if (fenced !== 1) throw new Error("completion_lease_changed");
        const contentJson = typeof sourceReport.contentJson === "string" ? sourceReport.contentJson : JSON.stringify(sourceReport.contentJson);
        const saved = await tx.$executeRawUnsafe('UPDATE "MediaHubReport" SET "telegramMessageIds"=$3::jsonb,"telegramSentAt"=COALESCE("telegramSentAt",NOW()),"updatedAt"=NOW() WHERE "tenantId"=$1 AND "id"=$2 AND "contentJson"=$4::jsonb', "spike-ua", job.reportId, JSON.stringify(job.ledger!.ids), contentJson);
        if (saved !== 1) throw new Error("report_revision_changed");
      });
      return json({ ok: true });
    }
    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    const reason = error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "video_worker_operation_failed";
    console.warn("SSI paired draft worker blocked", { reason });
    return json({ status: "blocked", reason }, 409);
  }
}
