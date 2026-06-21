"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { MediaHubWindowSnapshot } from "@/lib/media-hub";

type FeedItem = MediaHubWindowSnapshot["feed"][number];

export function MonitoringFeed({ items, locale }: { items: FeedItem[]; locale: Locale }) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const allExpanded = items.length > 0 && expandedIds.length === items.length;
  const copy = locale === "uk"
    ? {
        collapseAll: "Згорнути всі",
        expandAll: "Розгорнути всі",
        hide: "Сховати",
        open: "Відкрити",
        subtitle: "Жива стрічка моніторингу, за замовчуванням згорнута.",
        title: "Стрічка моніторингу",
      }
    : {
        collapseAll: "Collapse all",
        expandAll: "Expand all",
        hide: "Hide",
        open: "Open",
        subtitle: "Live window preview, collapsed by default.",
        title: "Monitoring feed",
      };

  function toggleAll() {
    setExpandedIds(allExpanded ? [] : items.map((item) => item.id));
  }

  function toggleItem(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[var(--media-hub-panel)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">{copy.title}</h2>
          <p className="mt-1 text-sm text-white/44">{copy.subtitle}</p>
        </div>
        <button
          className="rounded-full border border-white/14 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/62 transition hover:border-[color:var(--media-hub-accent)] hover:text-white"
          onClick={toggleAll}
          type="button"
        >
          {allExpanded ? copy.collapseAll : copy.expandAll}
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {items.map((item) => {
          const expanded = expandedIds.includes(item.id);

          return (
            <article
              className={`rounded-[1.2rem] border ${
                item.tone === "elevated"
                  ? "border-[color:var(--media-hub-accent)] bg-[var(--media-hub-card-hover)]"
                  : "border-white/10 bg-[var(--media-hub-card)]"
              }`}
              key={item.id}
            >
              <button
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                onClick={() => toggleItem(item.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold leading-6 text-white">
                    {item.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/38">
                    <span>{item.sourceType}</span>
                    <span>•</span>
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{item.time}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/48">
                  {expanded ? copy.hide : copy.open}
                </span>
              </button>

              {expanded ? (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  <p className="text-sm leading-6 text-white/66">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/60"
                        key={`${item.id}-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
