"use client";

import { useState, type FormEvent } from "react";

type SubmissionState = "idle" | "submitting" | "sent" | "failed";

export function ContactForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");
  const isLight = tone === "light";

  const fieldClass = isLight
    ? "h-11 rounded-xl border border-black/15 bg-black/[0.035] px-4 text-base text-black outline-none transition placeholder:text-black/35 focus:border-black"
    : "h-11 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]";
  const labelClass = isLight
    ? "grid gap-2 text-sm font-semibold text-black/70"
    : "grid gap-2 text-sm font-semibold text-white/78";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/platform-contact", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "The message could not be sent.");
      }

      form.reset();
      setState("sent");
      setMessage(payload.message ?? "Message sent. We will reply shortly.");
    } catch (error) {
      setState("failed");
      setMessage(
        error instanceof Error
          ? error.message
          : "The message could not be sent.",
      );
    }
  }

  return (
    <div>
      <button
        aria-expanded={expanded}
        className={
          isLight
            ? "flex w-full items-center justify-between gap-4 rounded-[1.25rem] border border-black/10 bg-black/[0.035] px-4 py-4 text-left transition hover:border-black/35"
            : "flex w-full items-center justify-between gap-4 border border-white/15 bg-white/[0.06] px-4 py-4 text-left transition hover:border-[#d6ff58]"
        }
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>
          <span
            className={`block text-base font-black ${
              isLight ? "text-black" : "text-white"
            }`}
          >
            Partnership inquiry
          </span>
          <span
            className={`mt-1 block text-sm leading-5 ${
              isLight ? "text-black/55" : "text-white/58"
            }`}
          >
            Open the form to describe the market, partner profile and launch
            scope.
          </span>
        </span>
        <span
          className={`text-2xl font-light ${
            isLight ? "text-black" : "text-[#d6ff58]"
          }`}
          aria-hidden="true"
        >
          {expanded ? "-" : "+"}
        </span>
      </button>

      {expanded ? (
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Name
              <input
                className={fieldClass}
                name="name"
                placeholder="Your name"
                required
              />
            </label>
            <label className={labelClass}>
              Email
              <input
                className={fieldClass}
                name="email"
                placeholder="name@company.com"
                required
                type="email"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Company
              <input
                className={fieldClass}
                name="company"
                placeholder="Company or institution"
              />
            </label>
            <label className={labelClass}>
              Market
              <input
                className={fieldClass}
                name="market"
                placeholder="Country, commodity or region"
              />
            </label>
          </div>
          <label className={labelClass}>
            Message
            <textarea
              className={
                isLight
                  ? "min-h-28 resize-y rounded-xl border border-black/15 bg-black/[0.035] px-4 py-3 text-base text-black outline-none transition placeholder:text-black/35 focus:border-black"
                  : "min-h-28 resize-y border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
              }
              name="message"
              placeholder="Tell us what you would like to build."
              required
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className={
                isLight
                  ? "h-11 rounded-full border border-black bg-black px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                  : "h-11 border border-[#d6ff58] bg-[#d6ff58] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#08100c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              }
              disabled={state === "submitting"}
              type="submit"
            >
              {state === "submitting" ? "Sending..." : "Start a conversation"}
            </button>
            {message ? (
              <p
                className={`text-sm font-semibold ${
                  state === "failed"
                    ? isLight
                      ? "text-red-700"
                      : "text-red-200"
                    : isLight
                      ? "text-black"
                      : "text-[#d6ff58]"
                }`}
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <div
          className={`mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
            isLight ? "text-black/55" : "text-white/55"
          }`}
        >
          <span>
            Typical response: partnership fit, market scope and launch path.
          </span>
          <a
            className={`font-black transition ${
              isLight ? "text-black hover:text-black/60" : "text-[#d6ff58] hover:text-white"
            }`}
            href="mailto:partnerships@1d3x.com"
          >
            partnerships@1d3x.com
          </a>
        </div>
      )}
    </div>
  );
}
