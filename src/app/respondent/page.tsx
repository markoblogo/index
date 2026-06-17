import Link from "next/link";
import { RespondentSurveyForm } from "@/components/respondent/survey-form";
import { requireDemoRole } from "@/lib/demo-auth";
import { todayInputDate } from "@/lib/admin-daily-inputs";
import {
  getRespondentSurveyData,
  getSurveyLabels,
  normalizeSurveyLocale,
  type RespondentSurveyData,
} from "@/lib/respondent-survey";

type RespondentPageProps = {
  searchParams: Promise<{
    channel?: string;
    inTelegram?: string;
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
  const isTelegramFlow =
    params.channel === "telegram" || params.inTelegram === "1" || params.inTelegram === "true";
  const isSubmitted = data.status === "submitted";
  const isEditingSubmitted = isSubmitted && params.edit === "1";
  const hasSubmitQuery = params.saved === "submitted";
  const showSubmittedConfirmation =
    !isEditingSubmitted && ((isSubmitted && !isEditingSubmitted) || hasSubmitQuery);
  const editHref = `/respondent?locale=${locale}&edit=1${isTelegramFlow ? "&channel=telegram&inTelegram=1" : ""}`;
  const statusLabel =
    data.status === "submitted"
      ? labels.statusSubmitted
      : data.status === "draft"
        ? labels.statusDraft
        : labels.statusEmpty;

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
              ? labels.submittedSuccess
              : labels.draftSaved}
          </div>
        ) : null}
        {isEditingSubmitted ? (
          <div className="mt-5 border border-uga-green bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-green">
            {locale === "uk"
              ? "Ви редагуєте вже подані значення. Після повторного подання система оновить ваші дані."
              : "You are editing already submitted values. Submitting again will update your data."}
          </div>
        ) : hasSubmitQuery ? (
          <div className="mt-5 border border-uga-green bg-uga-mist px-4 py-3 text-sm font-semibold text-uga-dark">
            {labels.submittedSuccess}
          </div>
        ) : showSubmittedConfirmation ? (
          <div className="mt-5 border border-black bg-white px-4 py-3 text-sm font-semibold text-uga-dark">
            {labels.submittedLocked}
          </div>
        ) : null}
      </div>

      {showSubmittedConfirmation ? null : (
        <RespondentSurveyForm
          data={data}
          editHref={editHref}
          isTelegramFlow={isTelegramFlow}
          labels={labels}
          locale={locale}
        />
      )}

      {showSubmittedConfirmation ? (
        <SubmittedValues
          data={data}
          editHref={editHref}
          editLabel={labels.editSubmitted}
          title={labels.submittedMessage}
        />
      ) : null}
      {showSubmittedConfirmation && hasSubmitQuery && isTelegramFlow ? (
        <section className="border border-uga-green bg-uga-mist p-5">
          <p className="text-sm font-semibold text-uga-dark">
            {labels.telegramSubmittedNotice}
          </p>
        </section>
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
        <a
          className="rounded-[3px] border border-black bg-uga-dark px-5 py-3 text-sm font-semibold text-white transition hover:border-uga-green hover:text-uga-green"
          href={editHref}
        >
          {editLabel}
        </a>
      </div>
    </section>
  );
}
