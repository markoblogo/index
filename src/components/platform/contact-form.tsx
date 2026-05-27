"use client";

import { useState, type FormEvent } from "react";

type SubmissionState = "idle" | "submitting" | "sent" | "failed";

export function ContactForm() {
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
      setMessage(error instanceof Error ? error.message : "The message could not be sent.");
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Name
          <input
            className="h-12 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
            name="name"
            placeholder="Your name"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Email
          <input
            className="h-12 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
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
            className="h-12 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
            name="company"
            placeholder="Company or institution"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-white/78">
          Market
          <input
            className="h-12 border border-white/15 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
            name="market"
            placeholder="Country, commodity or region"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-white/78">
        Message
        <textarea
          className="min-h-36 resize-y border border-white/15 bg-white/[0.06] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#d6ff58]"
          name="message"
          placeholder="Tell us what you would like to build."
          required
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="h-12 border border-[#d6ff58] bg-[#d6ff58] px-6 text-sm font-black uppercase tracking-[0.12em] text-[#08100c] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}

