"use client";

import type { ReportKind } from "@/lib/report-workspace";
import type { TelegramSourceDigest } from "@/lib/telegram-source-collector";
import { formatDigestDate } from "@/lib/admin-reports";

export function TelegramDigestPreview({
  digest,
  generateAction,
  generationState,
  reportId,
  reportKind,
  resetWindowFiltersAction,
  syncSourcesAction,
  title,
  toggleChannelPostsAction,
  toggleCollectedPostAction,
}: {
  digest: TelegramSourceDigest;
  generateAction: ((formData: FormData) => Promise<void>) | null;
  generationState: {
    generatedAt: string | null;
    isCurrent: boolean;
    signature: string;
  } | null;
  reportId: string | null;
  reportKind: ReportKind;
  resetWindowFiltersAction: (formData: FormData) => Promise<void>;
  syncSourcesAction: (formData: FormData) => Promise<void>;
  title: string;
  toggleChannelPostsAction: (formData: FormData) => Promise<void>;
  toggleCollectedPostAction: (formData: FormData) => Promise<void>;
}) {
  const totalIncluded = digest.channels.reduce(
    (sum, channel) => sum + channel.includedPostCount,
    0,
  );
  const totalExcluded = digest.channels.reduce(
    (sum, channel) => sum + channel.excludedPostCount,
    0,
  );
  const activeChannels = digest.channels.filter(
    (channel) => channel.includedPostCount > 0,
  ).length;
  const totalChannels = digest.channels.filter(
    (channel) => channel.posts.length > 0,
  ).length;

  return (
    <section className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-white/62">
            Window: {formatDigestDate(digest.startAt)} → {formatDigestDate(digest.endAt)} · {totalIncluded} included posts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={resetWindowFiltersAction}>
            <input name="startAt" type="hidden" value={digest.startAt} />
            <input name="endAt" type="hidden" value={digest.endAt} />
            <button
              className="rounded-full border border-amber-400/35 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300"
              type="submit"
            >
              Reset filters for window
            </button>
          </form>
          <form action={syncSourcesAction}>
            <input name="reportKind" type="hidden" value={reportKind} />
            <input name="reportId" type="hidden" value={reportId ?? ""} />
            <button
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
              type="submit"
            >
              Refresh sync
            </button>
          </form>
        </div>
      </div>

      <div className="sticky top-4 z-10 rounded-[1rem] border border-white/12 bg-[#0a0a0a]/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <span className="rounded-full bg-uga-green/15 px-3 py-1 text-uga-green">
              {totalIncluded} included
            </span>
            <span className="rounded-full bg-amber-400/12 px-3 py-1 text-amber-100">
              {totalExcluded} excluded
            </span>
            <span className="rounded-full border border-white/12 px-3 py-1 text-white/72">
              {activeChannels}/{totalChannels} channels active
            </span>
          </div>

          {generateAction && reportId ? (
            <form action={generateAction} className="flex items-center gap-3">
              <input name="reportId" type="hidden" value={reportId} />
              <div className="text-right text-xs leading-5 text-white/55">
                <p>
                  {generationState
                    ? generationState.isCurrent
                      ? "Current weekly draft matches this filtered source set."
                      : "Current weekly draft is stale versus this filtered source set."
                    : "Generation uses only currently included posts."}
                </p>
                <p>
                  {generationState
                    ? `Last generation: ${generationState.generatedAt ?? "n/a"} · set ${generationState.signature}`
                    : "Excluded posts stay out of the prompt context."}
                </p>
              </div>
              <button
                className="rounded-full bg-uga-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#82ff4d] disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                disabled={totalIncluded === 0}
                type="submit"
              >
                Generate from current filtered set
              </button>
            </form>
          ) : (
            <p className="text-xs leading-5 text-white/55">
              Included/excluded counters reflect the exact set used by the digest layer.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {digest.channels.some((channel) => channel.posts.length > 0) ? (
          digest.channels
            .filter((channel) => channel.posts.length > 0)
            .map((channel) => (
              <details
                className="rounded-[1rem] border border-white/10 bg-black/20 p-4"
                key={`${channel.channelHandle}-${channel.peerId ?? "none"}`}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">@{channel.channelHandle}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                        {channel.includedPostCount} included · {channel.excludedPostCount} excluded{channel.peerId ? ` · peer ${channel.peerId}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={toggleChannelPostsAction}>
                        <input name="channelHandle" type="hidden" value={channel.channelHandle} />
                        <input name="included" type="hidden" value="1" />
                        <input name="startAt" type="hidden" value={digest.startAt} />
                        <input name="endAt" type="hidden" value={digest.endAt} />
                        <button
                          className="rounded-full border border-uga-green/35 px-3 py-1 text-xs font-semibold text-uga-green transition hover:border-uga-green"
                          type="submit"
                        >
                          Include all
                        </button>
                      </form>
                      <form action={toggleChannelPostsAction}>
                        <input name="channelHandle" type="hidden" value={channel.channelHandle} />
                        <input name="included" type="hidden" value="0" />
                        <input name="startAt" type="hidden" value={digest.startAt} />
                        <input name="endAt" type="hidden" value={digest.endAt} />
                        <button
                          className="rounded-full border border-amber-400/35 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300"
                          type="submit"
                        >
                          Exclude all
                        </button>
                      </form>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-uga-green">
                        Open
                      </span>
                    </div>
                  </div>
                </summary>
                <div className="mt-4 grid gap-3">
                  {channel.posts.map((post) => (
                    <article
                      className={`rounded-[0.9rem] border p-3 ${
                        post.included
                          ? "border-white/10 bg-black/30"
                          : "border-amber-400/20 bg-amber-400/5"
                      }`}
                      key={post.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs uppercase tracking-[0.12em] text-white/45">
                            {formatDigestDate(post.publishedAt)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                              post.included
                                ? "bg-uga-green/15 text-uga-green"
                                : "bg-amber-400/15 text-amber-200"
                            }`}
                          >
                            {post.included ? "included" : "excluded"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            className="text-xs text-uga-green hover:underline"
                            href={post.postUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open original
                          </a>
                          <form action={toggleCollectedPostAction}>
                            <input name="postId" type="hidden" value={post.id} />
                            <input
                              name="included"
                              type="hidden"
                              value={post.included ? "0" : "1"}
                            />
                            <button
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                post.included
                                  ? "border-amber-400/40 text-amber-100 hover:border-amber-300"
                                  : "border-uga-green/40 text-uga-green hover:border-uga-green"
                              }`}
                              type="submit"
                            >
                              {post.included ? "Exclude from digest" : "Include in digest"}
                            </button>
                          </form>
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/72">
                        {post.text}
                      </pre>
                    </article>
                  ))}
                </div>
              </details>
            ))
        ) : (
          <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4 text-sm text-white/62">
            No collected Telegram posts in the current window yet.
          </div>
        )}
      </div>
    </section>
  );
}
