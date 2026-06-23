"use client";

import { useMemo, useState, type FormEvent } from "react";
import type {
  RespondentSurveyData,
  SurveyLocale,
  RespondentSurveyLabels,
} from "@/lib/respondent-survey";

type RespondentSurveyFormProps = {
  data: RespondentSurveyData;
  labels: RespondentSurveyLabels;
  locale: SurveyLocale;
  editHref: string;
  isTelegramFlow: boolean;
};

type SubmissionStatus = "idle" | "submitting" | "success" | "draftSaved" | "error";

type SavedItem = {
  category: string;
  commodityId: string;
  commodityName: string;
  price: number;
};

const CURRENCY_LABEL = "USD/t";

export function RespondentSurveyForm({
  data,
  labels,
  locale,
  editHref,
  isTelegramFlow,
}: RespondentSurveyFormProps) {
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>("idle");
  const [errorText, setErrorText] = useState("");
  const [summaryItems, setSummaryItems] = useState<SavedItem[]>([]);

  const submitLabel = useMemo(() => {
    if (submissionStatus !== "submitting") {
      return labels.submit;
    }

    return labels.submitLoading;
  }, [submissionStatus, labels.submit, labels.submitLoading]);

  const isSubmitting = submissionStatus === "submitting";

  const getSummaryFromForm = (formData: FormData): SavedItem[] => {
    return data.commodities
      .map((commodity) => {
        const raw = formData.get(`price:${commodity.id}`);
        if (typeof raw !== "string") {
          return null;
        }

        const price = Number(raw);
        if (!Number.isFinite(price) || price <= 0) {
          return null;
        }

        return {
          category: commodity.category,
          commodityId: commodity.id,
          commodityName: commodity.name,
          price,
        };
      })
      .filter((item): item is SavedItem => item !== null);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorText("");
    setSubmissionStatus("submitting");

    const formData = new FormData(event.currentTarget);
    const nativeEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeEvent.submitter as HTMLButtonElement | null;
    const intent: "draft" | "submit" =
      submitter?.getAttribute("name") === "intent" &&
      submitter?.getAttribute("value") === "draft"
        ? "draft"
        : "submit";

    try {
      const response = await fetch("/api/respondent/submit", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error((payload as { error?: string })?.error || "Submit failed");
      }

      setSummaryItems(getSummaryFromForm(formData));

      setSubmissionStatus(intent === "draft" ? "draftSaved" : "success");
    } catch {
      setErrorText(labels.submitError);
      setSubmissionStatus("error");
    }
  }

  function handleEditSubmitted() {
    window.location.assign(editHref);
  }

  if (submissionStatus === "success") {
    return (
      <section className="border border-black bg-white p-5">
        <h2 className="text-2xl font-black uppercase tracking-normal">
          {locale === "uk" ? "Дякуємо!" : "Thank you!"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-black/80">
          {labels.submitSuccessTitle}
        </p>

        <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-uga-dark">
          {labels.submitSuccessIntro}
        </h3>
        <div className="mt-4 grid gap-2">
          {summaryItems.length === 0 ? (
            <p className="text-sm text-black/70">
              {locale === "uk"
                ? "Немає даних для відображення."
                : "No submitted values to display."}
            </p>
          ) : (
            summaryItems.map((item) => (
              <div
                key={item.commodityId}
                className="grid min-w-0 grid-cols-[1fr_auto] gap-4 border border-black/10 bg-uga-mist px-4 py-3 text-sm"
              >
                <span className="font-semibold text-uga-dark">
                  {item.commodityName}
                </span>
                <span className="font-semibold text-black/75">
                  {Math.round(item.price * 100) / 100} {CURRENCY_LABEL}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="mt-5 text-sm font-semibold text-uga-dark">
          {labels.submitSuccessFooter}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            className="rounded-[3px] border border-black bg-uga-dark px-5 py-3 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
            type="button"
            onClick={handleEditSubmitted}
          >
            {labels.editSubmitted}
          </button>
          {isTelegramFlow ? <CloseButton /> : null}
        </div>
      </section>
    );
  }

  return (
    <form
      className="border border-black bg-white p-5"
      method="post"
      onSubmit={handleSubmit}
      action="/api/respondent/submit"
    >
      <input name="date" type="hidden" value={data.date} />
      <input name="locale" type="hidden" value={locale} />
      {isTelegramFlow ? (
        <input name="respondentChannel" type="hidden" value="telegram" />
      ) : null}
      <div className="grid gap-4">
        {data.commodities.map((commodity) => (
          <div key={commodity.id}>
            {data.commodities.findIndex((item) => item.id === commodity.id) === 0 ||
            data.commodities[data.commodities.findIndex((item) => item.id === commodity.id) - 1]
              ?.category !== commodity.category ? (
              <div className="mb-3 mt-2 border-b border-black pb-2">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
                  {formatCategoryLabel(commodity.category, locale)}
                </p>
              </div>
            ) : null}
            <label className="grid min-w-0 gap-3 border-b border-black/10 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] sm:items-center">
              <span className="min-w-0">
                <span className="block text-base font-semibold text-uga-dark">
                  {commodity.name}
                </span>
                <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                  {commodity.code} · {commodity.basisLabel}
                </span>
              </span>
              <span className="grid min-w-0 gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                  {labels.price}
                </span>
                <span className="grid gap-0.5 text-[0.68rem] font-semibold leading-4 text-black/50">
                  {labels.priceHintLines.map((line) => (
                    <span key={line}>• {line}</span>
                  ))}
                </span>
                <input
                  className="box-border w-full min-w-0 border border-black/20 px-3 py-2.5 text-base font-semibold focus:border-uga-green focus:ring-uga-green"
                  defaultValue={commodity.price ?? ""}
                  inputMode="decimal"
                  name={`price:${commodity.id}`}
                  placeholder="USD/t"
                  type="text"
                  required={false}
                />
              </span>
            </label>
          </div>
        ))}
      </div>

      {submissionStatus === "error" ? (
        <p className="mt-5 border border-red-700 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorText || labels.submitError}
        </p>
      ) : null}
      {submissionStatus === "draftSaved" ? (
        <p className="mt-5 border border-uga-green bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-dark">
          {locale === "uk"
            ? "Чернетку збережено."
            : "Draft saved."}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          className="rounded-[3px] border border-black px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green disabled:cursor-not-allowed disabled:opacity-55"
          name="intent"
          type="submit"
          value="draft"
          disabled={isSubmitting}
        >
          {labels.saveDraft}
        </button>
        <button
          className="rounded-[3px] bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-dark disabled:cursor-not-allowed disabled:opacity-65"
          name="intent"
          type="submit"
          value="submit"
          disabled={isSubmitting}
        >
          {submitLabel}
        </button>
      </div>
      {isSubmitting ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-black/55">
          {locale === "uk" ? "Очікуйте..." : "Please wait..."}
        </p>
      ) : null}
    </form>
  );
}

function formatCategoryLabel(category: string, locale: SurveyLocale) {
  if (category === "processors") {
    return locale === "uk" ? "Oilseeds crush" : "Oilseeds crush";
  }

  if (category === "seasonal-export") {
    return locale === "uk" ? "Oilseeds Export" : "Oilseeds Export";
  }

  return locale === "uk" ? "All Seasons" : "All Seasons";
}

function CloseButton() {
  function close() {
    const webApp = (window as { Telegram?: { WebApp?: { close?: () => void } } }).Telegram?.WebApp;
    webApp?.close?.();
  }

  return (
    <button
      className="rounded-[3px] border border-black bg-white px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green"
      onClick={close}
      type="button"
    >
      Закрити
    </button>
  );
}
