import Link from "next/link";
import { requireDemoRole } from "@/lib/demo-auth";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import {
  getRespondentSurveyData,
  getSurveyLabels,
  normalizeSurveyLocale,
  saveRespondentSurvey,
  type RespondentSurveyData,
} from "@/lib/respondent-survey";

type RespondentPageProps = {
  searchParams: Promise<{
    edit?: string;
    locale?: string;
    saved?: string;
  }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RespondentPage({
  searchParams,
}: RespondentPageProps) {
  const user = await requireDemoRole("respondent");
  const params = await searchParams;
  const locale = normalizeSurveyLocale(params.locale);
  const labels = getSurveyLabels(locale);
  const date = todayInputDate();
  const data = await getRespondentSurveyData({
    date,
    locale,
    respondentId: user.respondentId ?? "",
  });
  const isSubmitted = data.status === "submitted";
  const isEditingSubmitted = isSubmitted && params.edit === "1";
  const showSubmittedConfirmation = isSubmitted && !isEditingSubmitted;
  const editHref = `/respondent?locale=${locale}&edit=1`;
  const statusLabel =
    data.status === "submitted"
      ? labels.statusSubmitted
      : data.status === "draft"
        ? labels.statusDraft
        : labels.statusEmpty;

  async function save(formData: FormData) {
    "use server";

    const currentUser = await requireDemoRole("respondent");
    await saveRespondentSurvey(formData, currentUser);
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-5">
      <div className="border border-black bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-uga-green">
              {labels.badge}
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight tracking-normal">
              {labels.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-black/65">
              {labels.intro}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className={
                locale === "uk"
                  ? "rounded-full bg-uga-dark px-3 py-1.5 text-xs font-semibold uppercase text-white"
                  : "rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold uppercase text-black/60"
              }
              href="/respondent?locale=uk"
            >
              uk
            </Link>
            <Link
              className={
                locale === "en"
                  ? "rounded-full bg-uga-dark px-3 py-1.5 text-xs font-semibold uppercase text-white"
                  : "rounded-full border border-black/20 px-3 py-1.5 text-xs font-semibold uppercase text-black/60"
              }
              href="/respondent?locale=en"
            >
              en
            </Link>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 border border-black bg-uga-mist p-4 text-sm sm:grid-cols-2">
          <InfoItem label={labels.company} value={data.companyName} />
          <InfoItem label={labels.date} value={data.date} />
          <InfoItem label={labels.basis} value={data.basisLabel} />
          <InfoItem label={labels.unit} value="USD/t" />
          <InfoItem label={labels.status} value={statusLabel} />
          <InfoItem label={labels.publication} value={labels.notPublished} />
        </dl>

        {params.saved ? (
          <div className="mt-5 border border-uga-green bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {params.saved === "locked"
              ? labels.lockedSubmitted
              : params.saved === "submitted"
              ? labels.submitted
              : labels.draftSaved}
          </div>
        ) : null}
        {isEditingSubmitted ? (
          <div className="mt-5 border border-uga-green bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {locale === "uk"
              ? "Ви редагуєте вже подані значення. Після повторного подання система оновить ваші дані."
              : "You are editing already submitted values. Submitting again will update your data."}
          </div>
        ) : showSubmittedConfirmation ? (
          <div className="mt-5 border border-black bg-white px-4 py-3 text-sm font-semibold text-uga-dark">
            {labels.submittedLocked}
          </div>
        ) : null}
      </div>

      {showSubmittedConfirmation ? null : (
        <form action={save} className="border border-black bg-white p-5">
          <input name="date" type="hidden" value={data.date} />
          <input name="locale" type="hidden" value={locale} />
          <div className="grid gap-4">
            {data.commodities.map((commodity) => (
              <label
                className="grid min-w-0 gap-3 border-b border-black/10 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] sm:items-center"
                key={commodity.id}
              >
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-uga-dark">
                    {commodity.name}
                  </span>
                  <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                    {commodity.code} · {data.basisLabel}
                  </span>
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
                    {labels.price}
                  </span>
                  <input
                    className="box-border w-full min-w-0 border border-black/20 px-3 py-2.5 text-base font-semibold focus:border-uga-green focus:ring-uga-green"
                    defaultValue={commodity.price ?? ""}
                    inputMode="decimal"
                    name={`price:${commodity.id}`}
                    placeholder="USD/t"
                    type="text"
                  />
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              className="rounded-[3px] border border-black px-5 py-3 text-sm font-semibold text-uga-dark transition hover:border-uga-green hover:text-uga-green"
              name="intent"
              type="submit"
              value="draft"
            >
              {labels.saveDraft}
            </button>
            <button
              className="rounded-[3px] bg-uga-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-uga-dark"
              name="intent"
              type="submit"
              value="submit"
            >
              {labels.submit}
            </button>
          </div>
        </form>
      )}

      {showSubmittedConfirmation ? (
        <SubmittedValues
          data={data}
          editHref={editHref}
          editLabel={labels.editSubmitted}
          title={labels.submittedMessage}
        />
      ) : null}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-uga-dark">{value}</dd>
    </div>
  );
}

function SubmittedValues({
  data,
  editHref,
  editLabel,
  title,
}: {
  data: RespondentSurveyData;
  editHref: string;
  editLabel: string;
  title: string;
}) {
  return (
    <section className="border border-black bg-white p-5">
      <h2 className="text-xl font-black uppercase tracking-normal">{title}</h2>
      <div className="mt-4 grid gap-2">
        {data.commodities.map((commodity) => (
          <div
            className="flex items-center justify-between gap-4 border border-black/10 bg-uga-mist px-4 py-3 text-sm"
            key={commodity.id}
          >
            <span className="font-semibold text-uga-dark">{commodity.name}</span>
            <span className="text-black/65">
              {commodity.price === null
                ? "missing"
                : `$${commodity.price.toFixed(2)} USD/t`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Link
          className="rounded-[3px] border border-black bg-uga-dark px-5 py-3 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
          href={editHref}
        >
          {editLabel}
        </Link>
      </div>
    </section>
  );
}
