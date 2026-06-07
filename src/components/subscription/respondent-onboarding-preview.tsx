"use client";

import Image from "next/image";
import { useState } from "react";

type RespondentOnboardingPreviewProps = {
  alt: string;
  downloadHref: string;
  downloadLabel: string;
  eyebrow: string;
  hint: string;
  previewLabel: string;
};

export function RespondentOnboardingPreview({
  alt,
  downloadHref,
  downloadLabel,
  eyebrow,
  hint,
  previewLabel,
}: RespondentOnboardingPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="rounded-[1.15rem] border border-white/14 bg-[linear-gradient(135deg,rgba(248,248,242,0.08),rgba(248,248,242,0.03))] p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] md:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {eyebrow}
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/68">
              {hint}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                className="inline-flex min-h-11 items-center rounded-full border border-[var(--spike-accent)] bg-[var(--spike-accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#050505] transition hover:bg-transparent hover:text-[var(--spike-accent)]"
                download
                href={downloadHref}
              >
                {downloadLabel}
              </a>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {previewLabel}
              </span>
            </div>
          </div>

          <button
            className="group relative ml-auto block w-full max-w-[12rem] overflow-hidden rounded-[1rem] border border-[var(--spike-accent)]/80 bg-[#123548] text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#071017]/88 via-transparent to-transparent" />
            <Image
              alt={alt}
              className="aspect-[1/1.18] w-full object-cover object-left-top transition duration-300 group-hover:scale-[1.03]"
              height={1024}
              priority={false}
              src={downloadHref}
              width={1536}
            />
            <div className="absolute inset-x-3 bottom-3 rounded-[0.85rem] border border-white/10 bg-black/72 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--spike-accent)]">
                Respondent flow
              </p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white/84">
                  {previewLabel}
                </p>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/16 bg-white/8 text-white transition group-hover:border-[var(--spike-accent)] group-hover:text-[var(--spike-accent)]">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14Zm0 0c1.87 0 3.57.73 4.83 1.93M20 20l-4.2-4.2"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Close onboarding preview"
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="relative z-[1] max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[1.25rem] border border-white/12 bg-[#050505] shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--spike-accent)]">
                  Respondent onboarding
                </p>
                <p className="mt-1 text-sm font-semibold text-white/86">
                  {alt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="inline-flex rounded-full border border-[var(--spike-accent)] bg-[var(--spike-accent)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#050505] transition hover:bg-transparent hover:text-[var(--spike-accent)]"
                  download
                  href={downloadHref}
                >
                  {downloadLabel}
                </a>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-black text-white transition hover:border-[var(--spike-accent)] hover:text-[var(--spike-accent)]"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-[calc(92vh-4.5rem)] overflow-auto p-3 sm:p-4">
              <Image
                alt={alt}
                className="h-auto w-full rounded-[0.9rem] border border-white/10 bg-[#0a0a0a]"
                height={900}
                src={downloadHref}
                width={1600}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
