"use client";

import { useState, type FormEvent } from "react";

type SubmissionState = "idle" | "submitting" | "sent" | "failed";

export function ContactForm() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<SubmissionState>("idle");
  const [message, setMessage] = useState("");

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
        className="flex w-full items-center justify-between gap-4 border border-white/15 bg-white/[0.06] px-4 py-4 text-left transition hover:border-[#d6ff58]"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>
          <span className="block text-base font-black text-white">
            Partnership inquiry
          </span>
          <span className="mt-1 block text-sm leading-5 text-white/58">
            Open the form to describe the market, partner profile and launch
            scope.
          </span>
        </span>
        <span className="text-2xl font-light text-[#d6ff58]" aria-hidden="true">
          {expanded ? "-" : "+"}
        </span>
      </button>

      {expanded ? (
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-white/78">
              Name
              <input
                className="h-11 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
                name="name"
                placeholder="Your name"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/78">
              Email
              <input
                className="h-11 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-white/78">
              Company
              <input
                className="h-11 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
                name="company"
                placeholder="Company or institution"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white/78">
              Market
              <input
                className="h-11 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
                name="market"
                placeholder="Country, commodity or region"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-white/78">
            Message
            <textarea
              className="min-h-28 resize-y border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
              name="message"
              placeholder="Tell us what you would like to build."
              required
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="h-11 border border-[#d6ff58] bg-[#d6ff58] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#08100c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={state === "submitting"}
              type="submit"
            >
              {state === "submitting" ? "Sending..." : "Start a conversation"}
            </button>
            {message ? (
              <p
                className={`text-sm font-semibold ${
                  state === "failed" ? "text-red-200" : "text-[#d6ff58]"
                }`}
                role="status"
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-col gap-3 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Typical response: partnership fit, market scope and launch path.
          </span>
          <a
            className="font-black text-[#d6ff58] transition hover:text-white"
            href="mailto:partnerships@1d3x.com"
          >
            partnerships@1d3x.com
          </a>
        </div>
      )}
    </div>
  );
}
