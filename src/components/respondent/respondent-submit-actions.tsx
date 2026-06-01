"use client";

import { useFormStatus } from "react-dom";

type RespondentSubmitActionsProps = {
  saveDraftLabel: string;
  submitLabel: string;
  submittingLabel: string;
};

export function RespondentSubmitActions({
  saveDraftLabel,
  submitLabel,
  submittingLabel,
}: RespondentSubmitActionsProps) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
      <button
        className="rounded-[3px] border border-black px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        name="intent"
        type="submit"
        value="draft"
      >
        {saveDraftLabel}
      </button>
      <button
        className="rounded-[3px] bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-dark disabled:cursor-wait disabled:opacity-75"
        disabled={pending}
        name="intent"
        type="submit"
        value="submit"
      >
        {pending ? submittingLabel : submitLabel}
      </button>
      {pending ? (
        <p aria-live="polite" className="sr-only">
          {submittingLabel}
        </p>
      ) : null}
    </div>
  );
}
