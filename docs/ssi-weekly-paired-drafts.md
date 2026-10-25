# SSI weekly founders drafts and paired videos

Owner-approved scope, 25 October 2026. These are **drafts in the closed founders
Telegram group**, not publication to the public SPIKE Brokers channel. Humans
finalize the public report. WhatsApp is unchanged and outside this work.

## Workflow and schedule

1. Materials accumulate in the existing Drive folder until Saturday 22:00 Kyiv.
   From Sunday login/wake the Mac requests the current weekly report (Friday
   cutoff), using existing Drive completeness and report validation gates.
   The report may `publish-site` when ready; channel delivery is a separate step.
2. Freeze one saved Ukrainian report and its evidence manifest. Derive English
   video metadata through the already configured OpenAI provider, not a second
   research/report pipeline. Exact quotes, numbers, units, bases and dates must
   match. Unsupported optional scenes are omitted, never zero-filled.
3. Create three English videos locally using verified Framewright design assets,
   HyperFrames 0.8.185, fresh Supertonic-3 M1/en narration and FFmpeg. No old voice
   masters, music, SFX, cloning or new paid service. Model licence: BigScience
   Open RAIL-M; preserve its restrictions, not an MIT assumption.
4. At/after Sunday 09:00 Europe/Kyiv, when **all three** videos pass technical QA,
   `send-channel`: full Ukrainian text I, English video I, text II, video II,
   text III, video III. Late-ready delivery is allowed that same Sunday only.
   No Monday catch-up or text-only fallback. Start date: **2026-11-01**.

## Storage, authorization and duplicate protection

- `SSI_WEEKLY_PAIRED_DRAFTS=1` disables the old server-only weekly scheduler and
  text-only weekly send paths. Daily/monthly flows are not switched by this flag.
  Preserve `MEDIA_HUB_SSI_PERIODIC_PUBLICATION_HOLD`: hold blocks preparation and
  sends. A deployment is not permission to clear it.
- A separate `SSI_WEEKLY_VIDEO_WORKER_SECRET` lives in macOS Keychain and Vercel
  production only. It authorizes this current-week SSI workflow, not generic
  admin requests, arbitrary dates, chat IDs or tenants. Never put it in the repo,
  launcher arguments, configuration JSON or logs. No browser session is needed.
- Migration `20261025233000_ssi_weekly_video_jobs` adds private job/receipt and
  preparation-lease tables with RLS and no anon/authenticated/PUBLIC access.
  Preparation is serialized; model failures back off 30 minutes.
- One immutable job binds report, packet, sources, template and three file hashes.
  Changing the report after freezing requires operator review, never silently
  mixing revisions or replacing an already-started six-message set.
- Server leases, compare-and-swap checkpoints and an in-flight marker precede
  every Telegram request. Confirmed IDs are saved **before** replying to the Mac.
  JSON equality is canonical, independent of PostgreSQL key ordering. Explicit
  rejection may resume; uncertain timeout requires reconciliation. Neither an
  expired lease nor a deploy clears receipts.
- The server checks the configured target with Telegram `getChat`: private group
  or supergroup, no public username and no caller-selected destination.

## Local runtime

Private configuration follows
`services/ssi-weekly-video-worker/config.example.json`. Keep the verified handoff
and scratch on mounted Work, outside the public tree. Historical masters are
references only. The installed runtime lives in
`~/Library/Application Support/SSIWeeklyVideoWorker`, not a temporary checkout.

```sh
node scripts/install-ssi-weekly-video-worker.mjs --config /absolute/private/config.json --enable
node '/absolute/installed/worker.mjs' --config /absolute/private/config.json --preflight
node '/absolute/installed/worker.mjs' --config /absolute/private/config.json --preflight-server
```

The LaunchAgent runs at login and every five minutes. Its OS lock prevents
concurrent launchers; a running worker keeps the Mac awake. It does not wake a
powered-off Mac. Work must be mounted, the user logged in, Keychain unlocked and
the network available. Model hashing/rendering is not repeated after confirmed
delivery. Stop with `launchctl bootout gui/$(id -u)/com.spike.ssi-weekly-video-worker`;
this does not erase server receipts.

Local `last-status.json`, `worker.log` and `worker-error.log` contain operational
status, not credentials. For `needs_review` or missing files after delivery began,
compare confirmed IDs with the founders group before reconciling; never force
resend or delete the ledger. A directly interrupted CLI PID lock is conservative;
only the OS-lock-owning launcher cleans a dead predecessor.

## QA and limits

- 1080x1920, 30 fps, H.264/AAC, full decode, layout checks, source-bound claims,
  fresh voice only, measured loudness and two seconds after both voice completion
  and settled data. Compared rows share the hero's visible observation window.
  Negative bars never use negative widths.
- Three assets form one atomically saved ready set. Each MP4 must be at most
  3,900,000 bytes to leave room for multipart overhead under Vercel's request
  limit. Oversize blocks delivery; no silent shortening or alternate routing.
- Setup uses synthetic data/fake Telegram. Handoff integrity, runtime preflight
  and HTML tests do **not** prove future generated-film listening, voice pacing
  or actual weekly editorial quality. Assess those on the next scheduled run.
  No live reports, speech or new MP4s are produced for setup.
- `--preflight-server` is authenticated and read-only: migration, private target,
  paired mode, hold and start date. It generates and sends nothing.

## Framewright implementation note

Index owns collect/normalize/generate/validate/publish-site/send-channel and the
schedule. Framewright supplies a versioned design/asset reference, not another
daemon, scheduler, bot or fact store. Fresh fixed-design scenes come from the
frozen typed packet; historical algorithms are not executed unchanged. Private
assets and accepted masters are not committed to this public repository. First
real weekly delivery remains an operational test, not something established by
synthetic tests or deployment status.

Setup evidence: 505 JavaScript/TypeScript tests, four synthetic Python scene
tests, typecheck, dependency/repository audit and Next production build passed.
The exact synthetic subcomposition passed HyperFrames strict lint, runtime,
layout and contrast checks with zero warnings (14/14 contrast checks).
The verified handoff has 115 files. Both private tables have RLS enabled and no
anon/authenticated table privileges. The installed LaunchAgent's pre-start run
exited successfully with `outside_authorized_sunday`; no report or send ran.
