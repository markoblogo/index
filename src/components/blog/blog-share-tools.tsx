"use client";

import { useMemo, useState } from "react";

export function BlogShareTools({
  copyLabel,
  copiedLabel,
  label,
  title,
  url,
}: {
  copyLabel: string;
  copiedLabel: string;
  label: string;
  title: string;
  url: string;
}) {
  const [copied, setCopied] = useState(false);
  const encoded = useMemo(
    () => ({
      text: encodeURIComponent(title),
      url: encodeURIComponent(url),
    }),
    [title, url],
  );
  const links = [
    {
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`,
      label: "in",
    },
    {
      href: `https://t.me/share/url?url=${encoded.url}&text=${encoded.text}`,
      label: "tg",
    },
    {
      href: `https://twitter.com/intent/tweet?url=${encoded.url}&text=${encoded.text}`,
      label: "x",
    },
    {
      href: `mailto:?subject=${encoded.text}&body=${encoded.url}`,
      label: "@",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/50">
        {label}
      </span>
      {links.map((item) => (
        <a
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/18 bg-white/8 text-xs font-black uppercase text-white transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505]"
          href={item.href}
          key={item.label}
          rel="noopener noreferrer"
          target="_blank"
        >
          {item.label}
        </a>
      ))}
      <button
        className="rounded-full border border-white/18 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505]"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        }}
        type="button"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
