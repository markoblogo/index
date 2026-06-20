import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";
import { getTenantAssetUrl } from "@/lib/tenant-assets";
import { RespondentOnboardingPreview } from "@/components/subscription/respondent-onboarding-preview";

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const copy = getSubscriptionCopy(locale);
  const isSpike = getActiveIndexConfig().id === "spike-ua";

  return (
    <main
      className={
        isSpike
          ? "spike-subscription-page overflow-hidden bg-[#050505] text-[#f8f8f2]"
          : ""
      }
    >
      <section className="border-b border-black bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {copy.eyebrow}
          </p>
          <div>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.98] tracking-normal text-black sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-4xl text-base font-semibold leading-7 text-black/70 sm:text-lg">
              {copy.body}
            </p>
          </div>
        </div>
      </section>

      {isSpike ? <RespondentBlock locale={locale} /> : null}

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <AccessNotice copy={copy} />
      </section>

      {isSpike ? <AiSubscriptionBlock locale={locale} /> : null}

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-8">
        <SubscriptionTiers copy={copy} />
      </section>

      <section className="border-y border-black bg-uga-mist">
        <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-12">
          <ApiPanel copy={copy} />
          <AccessMatrix copy={copy} />
        </div>
      </section>
    </main>
  );
}

function AiSubscriptionBlock({ locale }: { locale: Locale }) {
  const copy =
    locale === "uk"
      ? {
          body: "Після публікації індексу AI Market Brief перетворює verified spot data на короткий market intelligence note: рухи за 1D/7D/30D/90D, волатильність, спреди, покриття респондентів і caution notes. Це working preview майбутнього комерційного AI-модуля.",
          eyebrow: "AI module",
          items: [
            "daily AI Market Brief",
            "volatility and spread notes",
            "methodology-grounded scenario notes",
            "auditable input data hash",
          ],
          title: "AI market intelligence layer",
        }
      : {
          body: "After index publication, the AI Market Brief turns verified spot data into a compact market intelligence note: 1D/7D/30D/90D moves, volatility, spreads, respondent coverage and caution notes. This is a working preview of a future commercial AI module.",
          eyebrow: "AI module",
          items: [
            "daily AI Market Brief",
            "volatility and spread notes",
            "methodology-grounded scenario notes",
            "auditable input data hash",
          ],
          title: "AI market intelligence layer",
        };

  return (
    <section className="border-y border-white/10 bg-[#101010]">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 lg:grid-cols-[0.74fr_1.26fr] lg:px-8 lg:py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase leading-none tracking-normal text-white">
            {copy.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/64">{copy.body}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {copy.items.map((item) => (
            <div
              className="rounded-[1rem] border border-white/10 bg-[#f8f8f2] p-4 text-sm font-black uppercase leading-5 text-[#050505]"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RespondentBlock({ locale }: { locale: Locale }) {
  const isUk = locale === "uk";
  const pdfHref = isUk
    ? getTenantAssetUrl("spike.respondentsDeck.uk.pdf")
    : getTenantAssetUrl("spike.partnerDeck.en.pdf");
  const onboardingDownloadHref = getTenantAssetUrl("spike.onboarding.uk.png");
  const videoId = isUk ? "scZm2uFZdPQ" : "T_SHKLwRZRA";
  const youtubeSrc = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`;
  const copy = isUk
    ? {
        eyebrow: "Співпраця",
        subtitle:
          "Допоможіть формувати benchmark українського аграрного ринку на основі реальних щоденних цін.",
        title: "Стати респондентом Spike Spot Index",
        download: "Завантажити презентацію",
        onboardingDownload: "Завантажити onboarding",
        onboardingEyebrow: "Onboarding",
        onboardingHint:
          "Коротка схема підключення респондента: від заявки до щоденного цінового фіду.",
        onboardingZoom: "Збільшити схему",
        watch: "Передивитись презентацію",
        videoTitle: "Spike Spot Index Respondents Presentation",
      }
    : {
        eyebrow: "Cooperation",
        subtitle:
          "A presentation for potential international partners, clients, investors and franchise partners interested in building local benchmark indices.",
        title: "Become a Spike Spot Index partner",
        download: "Download presentation pdf",
        onboardingDownload: "",
        onboardingEyebrow: "",
        onboardingHint: "",
        onboardingZoom: "",
        watch: "View presentation",
        videoTitle: "Spike Spot Index Global Partner Deck",
      };

  return (
    <section className="border-y border-white/10 bg-[#090909]">
      <div className="mx-auto grid max-w-[1900px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.16fr)] lg:px-8 lg:py-14">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--spike-accent)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 max-w-full text-[clamp(1.55rem,8vw,2.65rem)] font-black uppercase leading-[0.98] tracking-normal text-white [overflow-wrap:anywhere] sm:text-[clamp(1.75rem,4.5vw,2.65rem)]">
            {copy.title}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/68">
            {copy.subtitle}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              className="inline-flex max-w-full justify-center rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505] sm:px-5 sm:text-sm"
              download
              href={pdfHref}
            >
              {copy.download}
            </a>
            <a
              className="inline-flex max-w-full justify-center rounded-full border border-[#f8f8f2]/45 bg-[#050505] px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.12em] text-[#f8f8f2] transition hover:border-[var(--spike-accent)] hover:bg-[var(--spike-accent)] hover:text-[#050505] sm:px-5 sm:text-sm"
              href={pdfHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.watch}
            </a>
          </div>
          {isUk ? (
            <div className="mt-4 max-w-[42rem]">
              <RespondentOnboardingPreview
                alt="Схема онбордингу респондента Spike Spot Index"
                downloadHref={onboardingDownloadHref}
                downloadLabel={copy.onboardingDownload}
                eyebrow={copy.onboardingEyebrow}
                hint={copy.onboardingHint}
                previewLabel={copy.onboardingZoom}
              />
            </div>
          ) : null}
        </div>
        <div className="min-w-0 overflow-hidden rounded-[1rem] border border-white/16 bg-black/55">
          <iframe
            className="aspect-video w-full"
            src={youtubeSrc}
            title={copy.videoTitle}
            allowFullScreen
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          />
        </div>
      </div>
    </section>
  );
}

function SubscriptionTiers({ copy }: { copy: SubscriptionCopy }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {copy.tiers.map((tier) => (
        <article className="border border-black bg-white p-5" key={tier.title}>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
            {tier.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-black uppercase text-black">
            {tier.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-black/65">
            {tier.description}
          </p>
          <div className="mt-4 grid border border-black">
            {tier.features.map((feature) => (
              <div
                className="border-b border-black px-3 py-2 text-sm font-black text-black last:border-b-0"
                key={feature}
              >
                {feature}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function AccessNotice({ copy }: { copy: SubscriptionCopy }) {
  return (
    <div className="grid border border-black bg-white lg:grid-cols-[1fr_auto]">
      <div className="p-4 lg:p-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
          {copy.previewLabel}
        </p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-normal text-black">
          {copy.accessTitle}
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-black/65">
          {copy.accessText}
        </p>
      </div>
      <div className="grid border-t border-black lg:min-w-[25rem] lg:border-l lg:border-t-0">
        {copy.accessLabels.map((label) => (
          <div
            className="border-b border-black px-4 py-2.5 text-xs font-black uppercase tracking-[0.08em] text-black/70 last:border-b-0"
            key={label}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApiPanel({ copy }: { copy: SubscriptionCopy }) {
  return (
    <article className="min-w-0 border border-black bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
        API
      </p>
      <h2 className="mt-3 text-2xl font-black uppercase text-black">
        {copy.apiTitle}
      </h2>
      <p className="mt-3 text-sm leading-6 text-black/65">{copy.apiText}</p>
      <div className="mt-4 grid border border-black">
        {copy.apiBullets.map((bullet) => (
          <div
            className="border-b border-black px-3 py-2 text-sm font-black text-black last:border-b-0"
            key={bullet}
          >
            {bullet}
          </div>
        ))}
      </div>
    </article>
  );
}

function AccessMatrix({ copy }: { copy: SubscriptionCopy }) {
  return (
    <article className="min-w-0 border border-black bg-white p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-uga-green">
        {copy.accessMatrixEyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black uppercase text-black">
        {copy.accessMatrixTitle}
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-black text-xs uppercase tracking-[0.12em] text-black/55">
            <tr>
              {copy.accessMatrixHeaders.map((header) => (
                <th className="py-2 pr-3 font-black" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/20">
            {copy.accessMatrixRows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td
                    className="py-2 pr-3 font-semibold text-black/70"
                    key={cell}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

type SubscriptionCopy = ReturnType<typeof getSubscriptionCopy>;

function getSubscriptionCopy(locale: Locale) {
  const activeIndex = getActiveIndexConfig();

  if (locale === "uk") {
    const copy = {
      accessLabels: [
        "Перший рік безкоштовно",
        "Платна аналітика планується",
        "API планується",
      ],
      accessMatrixEyebrow: "Доступ",
      accessMatrixHeaders: ["Рівень", "Історія", "Аналітика", "API"],
      accessMatrixRows: [
        ["Public preview", "30 днів", "обмежена", "ні"],
        ["Registered preview", "1 рік", "стандартна", "ні"],
        ["UGA member", "повний період", "розширена", "планується"],
        ["Paid/API", "повний період", "розширена", "так"],
      ],
      accessMatrixTitle: "Модель доступу",
      accessText:
        "Аналітична панель доступна безкоштовно протягом першого року роботи UGA Index. З 15.06.2027 розширена аналітика та API-доступ плануються у форматі платної підписки.",
      accessTitle: "Попередній доступ до аналітики",
      apiBullets: [
        "Історія опублікованих індексів",
        "Аналітика трендів за культурами",
        "Значення з валютним перерахунком",
        "Результати сценарних моделей",
      ],
      apiText:
        "Майбутній платний доступ планується з API-ендпоінтами для історії опублікованих індексів, аналітики за культурами, валютного відображення та сценарних результатів.",
      apiTitle: "Планується API для аналітики",
      body: "У цьому розділі зібрані майбутні формати співпраці, підписки, API-доступу та розширеної аналітики UGA Index.",
      eyebrow: "Співпраця",
      previewLabel: "Попередній доступ",
      tiers: [
        {
          description:
            "Базовий рівень для користувачів, яким потрібна історія індексів, таблиці, спреди та стандартна аналітика без сценарного моделювання.",
          eyebrow: "Підписка",
          features: [
            "Повна історія опублікованих індексів",
            "Аналітика динаміки та волатильності",
            "Спреди та цінові діапазони",
            "Експорт даних і API за планом доступу",
          ],
          title: "Аналітика без AI-моделі",
        },
        {
          description:
            "Розширений рівень для сценарного моделювання культур і спредів із демонстраційною AI-моделлю, яка будує можливі діапазони руху.",
          eyebrow: "AI option",
          features: [
            "AI-сценарії за культурою",
            "AI-сценарії за конкретним спредом",
            "Горизонти 30 / 60 / 90 / 180 днів",
            "Сценарний діапазон: базовий, верхній і нижній",
          ],
          title: "Аналітика з AI-моделлю",
        },
      ],
      title: "Співпраця та підписка",
    };

    if (activeIndex.id !== "spike-ua") {
      return copy;
    }

    return {
      ...copy,
      accessMatrixRows: copy.accessMatrixRows.map((row) =>
        row[0] === "UGA member"
          ? ["Spike partner", row[1], row[2], row[3]]
          : row,
      ),
      accessText:
        "Аналітична панель доступна як preview для SPIKE SPOT INDEX. Розширена історія, API-доступ і комерційні аналітичні зрізи можуть бути оформлені як окремі рівні доступу після запуску.",
      apiBullets: [
        "Історія опублікованих індексів",
        "Аналітика трендів за культурами",
        "Значення з валютним перерахунком",
        "Аналітика спредів",
        "AI-assisted scenario outputs",
        "Доступ до generated market briefs",
      ],
      apiText:
        "Майбутній платний доступ планується з API-ендпоінтами для історії опублікованих індексів, commodity-level analytics, FX-adjusted display values, spread data та AI-assisted scenario outputs.",
      body: "У цьому розділі зібрані майбутні формати співпраці, subscription access, API access, розширена аналітика SPIKE SPOT INDEX та AI-assisted market intelligence options.",
      tiers: [
        {
          description:
            "Базовий рівень для користувачів, яким потрібні історія індексу, таблиці, спреди, volatility views і standard analytics без AI-assisted scenario modelling або generated market briefs.",
          eyebrow: "Підписка",
          features: [
            "Повна історія опублікованих індексів",
            "Trend and volatility analytics",
            "Спреди та цінові діапазони",
            "Експорт даних і API за планом доступу",
            "Methodology-based market views",
          ],
          title: "Standard analytics",
        },
        {
          description:
            "Розширений рівень для користувачів, яким потрібна AI-assisted інтерпретація опублікованих даних SPIKE SPOT INDEX, включно зі scenario ranges, volatility notes, spread interpretation та structured market briefs.",
          eyebrow: "AI option",
          features: [
            "AI-assisted market briefs",
            "Scenario ranges by commodity",
            "Scenario ranges by specific spread",
            "Volatility and movement summaries",
            "30 / 60 / 90 / 180-day analytical horizons",
            "Base, upper and lower scenario ranges",
            "Methodology-grounded interpretation",
          ],
          title: "AI-assisted market intelligence",
        },
      ],
      title: "Співпраця та підписка SPIKE SPOT INDEX",
    };
  }

  const copy = {
    accessLabels: ["Free first year", "Paid analytics planned", "API planned"],
    accessMatrixEyebrow: "Access",
    accessMatrixHeaders: ["Access level", "History", "Analytics", "API"],
    accessMatrixRows: [
      ["Public preview", "30 days", "limited", "no"],
      ["Registered preview", "1 year", "standard", "no"],
      ["UGA member", "full period", "extended", "planned"],
      ["Paid/API", "full period", "extended", "yes"],
    ],
    accessMatrixTitle: "Access model",
    accessText:
      "The analytics dashboard is available free of charge during the first year of UGA Index operation. From 15.06.2027, extended analytics and API access are planned to move to a paid subscription model.",
    accessTitle: "Analytics access preview",
    apiBullets: [
      "Published index history",
      "Commodity trend analytics",
      "Currency-adjusted values",
      "Scenario model outputs",
    ],
    apiText:
      "Future paid access is planned to include API endpoints for published index history, commodity-level analytics, FX-adjusted display values and scenario outputs.",
    apiTitle: "Analytics API planned",
    body: "This section collects future cooperation formats, subscription access, API access, and extended UGA Index analytics options.",
    eyebrow: "Cooperation",
    previewLabel: "Preview access",
    tiers: [
      {
        description:
          "Base level for users who need index history, tables, spreads and standard analytics without scenario modelling.",
        eyebrow: "Subscription",
        features: [
          "Full published index history",
          "Trend and volatility analytics",
          "Spreads and price ranges",
          "Data export and API by access plan",
        ],
        title: "Analytics without AI model",
      },
      {
        description:
          "Extended level for scenario modelling by commodity and spread with a demo AI model that draws possible movement ranges.",
        eyebrow: "AI option",
        features: [
          "AI scenarios by commodity",
          "AI scenarios by specific spread",
          "30 / 60 / 90 / 180-day horizons",
          "Scenario range: base, upper and lower",
        ],
        title: "Analytics with AI model",
      },
    ],
    title: "Cooperation and subscription",
  };

  if (activeIndex.id !== "spike-ua") {
    return copy;
  }

  return {
    ...copy,
    accessMatrixRows: copy.accessMatrixRows.map((row) =>
      row[0] === "UGA member" ? ["Spike partner", row[1], row[2], row[3]] : row,
    ),
    accessText:
      "The analytics dashboard is available as a preview for SPIKE SPOT INDEX. Extended history, API access and commercial analytics views can be introduced as separate access levels after launch.",
    apiBullets: [
      "Published index history",
      "Commodity trend analytics",
      "Currency-adjusted values",
      "Spread analytics",
      "AI-assisted scenario outputs",
      "Generated market brief access",
    ],
    apiText:
      "Future paid access is planned to include API endpoints for published index history, commodity-level analytics, FX-adjusted display values, spread data and AI-assisted scenario outputs.",
    body: "This section collects future cooperation formats, subscription access, API access, extended SPIKE SPOT INDEX analytics and AI-assisted market intelligence options.",
    tiers: [
      {
        description:
          "Base level for users who need index history, tables, spreads, volatility views and standard analytics without AI-assisted scenario modelling or generated market briefs.",
        eyebrow: "Subscription",
        features: [
          "Full published index history",
          "Trend and volatility analytics",
          "Spreads and price ranges",
          "Data export and API by access plan",
          "Methodology-based market views",
        ],
        title: "Standard analytics",
      },
      {
        description:
          "Extended level for users who need AI-assisted interpretation of published SPIKE SPOT INDEX data, including scenario ranges, volatility notes, spread interpretation and structured market briefs.",
        eyebrow: "AI option",
        features: [
          "AI-assisted market briefs",
          "Scenario ranges by commodity",
          "Scenario ranges by specific spread",
          "Volatility and movement summaries",
          "30 / 60 / 90 / 180-day analytical horizons",
          "Base, upper and lower scenario ranges",
          "Methodology-grounded interpretation",
        ],
        title: "AI-assisted market intelligence",
      },
    ],
    title: "SPIKE SPOT INDEX cooperation and subscription",
  };
}
