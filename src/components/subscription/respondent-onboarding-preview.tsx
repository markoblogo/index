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
      <div className="max-w-full rounded-[1rem] border border-white/14 bg-[linear-gradient(135deg,rgba(248,248,242,0.07),rgba(248,248,242,0.025))] p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-center">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
              {eyebrow}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-white/64">
              {hint}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                className="inline-flex max-w-full justify-center rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505]"
                download
                href={downloadHref}
              >
                {downloadLabel}
              </a>
              <button
                className="inline-flex max-w-full justify-center rounded-full border border-[#f8f8f2]/30 bg-[#050505] px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505]"
                onClick={() => setIsOpen(true)}
                type="button"
              >
                {previewLabel}
              </button>
            </div>
          </div>

          <button
            className="group relative block h-[8.5rem] w-full overflow-hidden rounded-[0.8rem] border border-white/14 bg-[#123548] text-left shadow-[0_14px_30px_rgba(0,0,0,0.24)] transition hover:border-[var(--spike-accent)] sm:ml-auto sm:max-w-[13rem]"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#071017]/84 via-transparent to-transparent" />
            <Image
              alt={alt}
              className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
              height={1024}
              priority={false}
              src={downloadHref}
              width={1536}
            />
            <span className="absolute bottom-2 right-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/72 text-white transition group-hover:border-[var(--spike-accent)] group-hover:text-[var(--spike-accent)]">
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
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--spike-accent)]">
                  Respondent onboarding
                </p>
                <p className="mt-1 text-sm font-semibold text-white/86 [overflow-wrap:anywhere]">
                  {alt}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  className="inline-flex rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505] sm:px-4 sm:text-[11px]"
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
