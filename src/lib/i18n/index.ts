export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "uga_locale";

type Dictionary = {
  nav: {
    home: string;
    about: string;
    methodology: string;
    analytics: string;
    login: string;
  };
  home: {
    partnerLine: string;
    title: string;
    description: string;
    boardTitle: string;
    boardDescription: string;
    heroSubtitle: string;
    heroMeta: string;
    heroAttribution: string;
    heroAttributionShort: string;
    heroTrustStrip: string;
    heroTrustStripShort: string;
    currentValuesTitle: string;
    liveStatus: string;
    selectorTitle: string;
    reportTitle: string;
    reportDescription: string;
    reportAction: string;
    statusLabel: string;
    updatedLabel: string;
    basisLabel: string;
    deliveryPeriodLabel: string;
    marketOpen: string;
    cardsLabel: string;
    chartsLabel: string;
    chartsTitle: string;
    chartsDescription: string;
    quotesLabel: string;
    quotesTitle: string;
    quotesDescription: string;
    table: {
      commodity: string;
      basis: string;
      price: string;
      change: string;
      respondents: string;
    };
    partnersLabel: string;
    partnersTitle: string;
    partnersDescription: string;
    methodologyCtaTitle: string;
    methodologyCtaDescription: string;
    analyticsCtaTitle: string;
    analyticsCtaDescription: string;
    readMore: string;
    viewAnalytics: string;
  };
  about: {
    label: string;
    title: string;
    description: string;
    partners: Array<{ name: string; role: string }>;
    rolesTitle: string;
    rolesHeading: string;
    respondentsLabel: string;
    respondentsTitle: string;
    respondentsDescription: string;
    disclaimerTitle: string;
    disclaimer: string;
  };
  methodology: {
    label: string;
    title: string;
    description: string;
    metrics: Array<{ value: string; label: string }>;
    sections: Array<{ title: string; description: string }>;
    signedPdfTitle: string;
    signedPdfDescription: string;
    signedPdfAction: string;
    faqTitle: string;
    faq: Array<{ question: string; answer: string }>;
  };
  analytics: {
    label: string;
    title: string;
    description: string;
    demoAccess: string;
    filtersTitle: string;
    commodityFilter: string;
    dateRangeFilter: string;
    basisFilter: string;
    allCommodities: string;
    accessTitle: string;
    accessLevels: Array<{ title: string; period: string; description: string }>;
    historicalTitle: string;
    historicalDescription: string;
    dayChangeTitle: string;
    dayChangeDescription: string;
    comparisonTitle: string;
    comparisonDescription: string;
    tableTitle: string;
    tableDescription: string;
    table: {
      date: string;
      commodity: string;
      basis: string;
      value: string;
      dayChange: string;
      respondents: string;
      status: string;
    };
  };
  footer: {
    rights: string;
    partners: string;
    disclaimer: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  uk: {
    nav: {
      home: "Головна",
      about: "Про індекс",
      methodology: "Методологія",
      analytics: "Аналітика",
      login: "Вхід",
    },
    home: {
      partnerLine: "UGA · Spike Brokers · Cropto/MN7R",
      title: "UGA Index",
      description:
        "Щоденний індекс експортних спотових цін України для ключових зернових та олійних культур на базисі FOB Black Sea.",
      boardTitle: "UGA Index / Експортні ціни",
      boardDescription:
        "Ринковий бенчмарк справедливих експортних цін України у USD/t. FOB Black Sea, T+30, щоденна публікація після EOD-перевірки.",
      heroSubtitle:
        "Щоденний експортний ціновий бенчмарк для українських зернових та олійних культур.",
      heroMeta: "FOB Чорне море · T+30 · USD/т · публікація після EOD-перевірки",
      heroAttribution:
        "Публікується УЗА. Ринкові індикативи: Spike Brokers. Технологія: Cropto/MN7R.",
      heroAttributionShort: "UGA · Spike Brokers · Cropto/MN7R",
      heroTrustStrip:
        "EOD-дані респондентів · медіанна валідація · ±2% фільтр викидів · мінімум 5 респондентів · фіксація після публікації",
      heroTrustStripShort: "EOD · медіана · ±2% · 5+ · фіксація",
      currentValuesTitle: "Поточні значення індексу",
      liveStatus: "live index",
      selectorTitle: "Культури",
      reportTitle: "Завантажити звіт",
      reportDescription:
        "Демо-експорт денного пакета індексу для презентації та внутрішнього огляду.",
      reportAction: "PDF / Excel демо",
      statusLabel: "Статус оновлення",
      updatedLabel: "Оновлено",
      basisLabel: "Базис",
      deliveryPeriodLabel: "Період поставки",
      marketOpen: "Опубліковано для демо",
      cardsLabel: "Поточні значення",
      chartsLabel: "Тижнева динаміка",
      chartsTitle: "Зведений тижневий графік",
      chartsDescription:
        "Великий графік порівнює рух усіх чотирьох культур за останні торгові сесії.",
      quotesLabel: "Котирування",
      quotesTitle: "Останні опубліковані значення",
      quotesDescription:
        "Таблиця показує ціну, зміну та кількість респондентів для кожної культури.",
      table: {
        commodity: "Культура",
        basis: "Базис",
        price: "Ціна",
        change: "Зміна",
        respondents: "Респонденти",
      },
      partnersLabel: "Партнери",
      partnersTitle: "Ролі в екосистемі UGA Index",
      partnersDescription:
        "UGA відповідає за бренд і публікацію, Spike Brokers надає ринкові індикативи, Cropto/MN7R забезпечує технологічну платформу.",
      methodologyCtaTitle: "Як розраховується індекс",
      methodologyCtaDescription:
        "Перегляньте правила медіани, фільтрації відхилень, мінімальної кількості респондентів і фіксації публікацій.",
      analyticsCtaTitle: "Перейти до аналітики",
      analyticsCtaDescription:
        "Порівнюйте культури, динаміку та історію публікацій на окремій аналітичній сторінці.",
      readMore: "Відкрити методологію",
      viewAnalytics: "Дивитися аналітику",
    },
    about: {
      label: "Про продукт",
      title: "Публічний індекс під брендом Української зернової асоціації",
      description:
        "UGA Index створений як демонстраційна платформа для публікації щоденного ринкового бенчмарку справедливих експортних цін, збору індикативів та прозорої методології.",
      partners: [
        {
          name: "UGA",
          role: "Незалежний адміністратор, власник бренду та публічний видавець індексу.",
        },
        {
          name: "Spike Brokers",
          role: "Партнер, що надає ринкові індикативи для демонстраційного процесу.",
        },
        {
          name: "Cropto/MN7R",
          role: "Технологічний партнер, відповідальний за платформу, локалізацію та віджет.",
        },
      ],
      rolesTitle: "Ролі партнерів",
      rolesHeading: "Екосистема UGA Index",
      respondentsLabel: "Респонденти",
      respondentsTitle: "Компанії, що беруть участь у демонстраційному кошику",
      respondentsDescription:
        "Демо відображає структуру щоденного опитування респондентів для ключових експортних культур.",
      disclaimerTitle: "Інформаційний характер даних",
      disclaimer:
        "Публічні значення UGA Index мають виключно інформаційний характер. Вони не є інвестиційною рекомендацією, офертою або зобов'язанням укласти угоду; УЗА не несе відповідальності за збитки, спричинені використанням цих даних.",
    },
    methodology: {
      label: "Методологія",
      title: "Від індикативів респондентів до зафіксованого значення індексу",
      description:
        "Демо використовує простий і відтворюваний процес розрахунку для кожної дати, культури та базису поставки.",
      metrics: [
        { value: "FOB", label: "Black Sea" },
        { value: "T+30", label: "період поставки" },
        { value: "5+", label: "респондентів" },
      ],
      sections: [
        {
          title: "Що таке UGA Index",
          description:
            "UGA Index - це щоденний ринковий бенчмарк справедливої експортної ціни української аграрної продукції під брендом Української зернової асоціації.",
        },
        {
          title: "Кошики респондентів",
          description:
            "Для кожної культури, базису поставки, дати та періоду поставки система збирає ціни від визначеного кошика респондентів. Демо використовує один кошик FOB Black Sea з вагою 1, але модель підтримує майбутні зважені кошики.",
        },
        {
          title: "Логіка ціни EOD",
          description:
            "Кожна ціна є оцінкою справедливої ринкової ціни на кінець торгового дня та має відповідати рівню реально виконуваної угоди, за яким респондент готовий купити або продати.",
        },
        {
          title: "Період поставки T+30",
          description:
            "Індекс орієнтований на поставку протягом 30 днів від дати котирування. Це робить значення порівнюваними між респондентами та торговими днями.",
        },
        {
          title: "Медіана, фільтр +/-2% та очищене середнє",
          description:
            "Система розраховує медіану валідних цін, виключає значення з відхиленням понад +/-2% від медіани, а потім публікує арифметичне середнє очищеної вибірки.",
        },
        {
          title: "Мінімум 5 респондентів",
          description:
            "Кошик може бути опублікований лише тоді, коли після фільтрації залишається щонайменше 5 валідних цін респондентів. Якщо даних недостатньо, Spike показується тільки як зовнішній індикатив.",
        },
        {
          title: "Аудит і зафіксовані значення",
          description:
            "Після публікації значення індексу блокується. Зміни вхідних даних, перерахунки та публікації мають відображатися в аудит-лозі з попереднім і новим станом.",
        },
        {
          title: "Верифікація та версійність",
          description:
            "До публікації розрахунок може мати версії v1, v2 тощо та проходить незалежну партнерську верифікацію. Після публікації фіксується фінальна версія, а зміни заборонені.",
        },
        {
          title: "Майбутнє масштабування",
          description:
            "Методологія передбачає volume-weighted модель, forward індекси T+60/T+90, а також окремі типи котирувань bid, offer і mid.",
        },
      ],
      signedPdfTitle: "Підписана методологія PDF",
      signedPdfDescription:
        "У фінальній версії тут буде розміщено підписаний PDF-файл з офіційною методологією UGA Index.",
      signedPdfAction: "Очікує на завантаження",
      faqTitle: "Поширені питання",
      faq: [
        {
          question: "Що таке UGA Index?",
          answer:
            "Це щоденний індекс спотових експортних цін України для ключових зернових та олійних культур на базисі FOB Black Sea.",
        },
        {
          question: "Хто надає дані?",
          answer:
            "Дані надходять від респондентів кошика: експортерів та інших репрезентативних учасників ринку. Spike Brokers підтримує процес зовнішніми ринковими індикативами.",
        },
        {
          question: "Як обробляються викиди?",
          answer:
            "Після розрахунку медіани система виключає ціни, що відхиляються більш ніж на +/-2% від медіани, і рахує середнє очищеної вибірки.",
        },
        {
          question: "Що відбувається, якщо даних недостатньо?",
          answer:
            "Індекс не публікується автоматично. Spike може відображатися тільки як зовнішній індикатив, без заміни розрахункового значення.",
        },
        {
          question: "Як часто публікується індекс?",
          answer:
            "Демо передбачає щоденну публікацію після завершення збору та перевірки даних за торговий день.",
        },
        {
          question: "Що доступно публічно, а що для членів UGA?",
          answer:
            "Публічно доступні останні значення, методологія та базова аналітика. Для членів UGA може бути розширена історія, додаткові зрізи та внутрішні матеріали.",
        },
      ],
    },
    analytics: {
      label: "Аналітика",
      title: "Порівняння культур і тижневі зміни",
      description:
        "Аналітична сторінка готує основу для порівняння індексів, перегляду трендів та історії публікацій.",
      demoAccess: "Демо-доступ",
      filtersTitle: "Фільтри",
      commodityFilter: "Культура",
      dateRangeFilter: "Період",
      basisFilter: "Базис",
      allCommodities: "Усі культури",
      accessTitle: "Майбутні рівні доступу",
      accessLevels: [
        {
          title: "Публічний відвідувач",
          period: "останні 7 днів",
          description: "Базові значення індексу та коротка динаміка.",
        },
        {
          title: "Зареєстрований користувач",
          period: "останній 1 рік",
          description: "Розширена історія для регулярного моніторингу.",
        },
        {
          title: "Член UGA",
          period: "повний період",
          description: "Повна історія та майбутні членські зрізи.",
        },
        {
          title: "Платний доступ",
          period: "повний період",
          description: "Повний період для комерційних аналітичних сценаріїв.",
        },
      ],
      historicalTitle: "Історичний графік за культурами",
      historicalDescription:
        "Демо показує останні опубліковані значення для всіх культур.",
      dayChangeTitle: "Денні зміни",
      dayChangeDescription:
        "Абсолютна зміна день до дня за останні торгові дні.",
      comparisonTitle: "Порівняння культур",
      comparisonDescription:
        "Останнє значення кожної культури на одному базисі поставки.",
      tableTitle: "Таблиця опублікованих значень",
      tableDescription:
        "Демо-історія значень індексу, змін і кількості респондентів.",
      table: {
        date: "Дата",
        commodity: "Культура",
        basis: "Базис",
        value: "Значення",
        dayChange: "Зміна за день",
        respondents: "Респонденти",
        status: "Статус",
      },
    },
    footer: {
      rights: "Демо для Української зернової асоціації.",
      partners: "Індикативи: Spike Brokers · Технології: Cropto/MN7R",
      disclaimer:
        "Інформація надається виключно для інформаційних цілей. УЗА не несе відповідальності за збитки, спричинені використанням даних.",
    },
  },
  en: {
    nav: {
      home: "Home",
      about: "About",
      methodology: "Methodology",
      analytics: "Analytics",
      login: "Login",
    },
    home: {
      partnerLine: "UGA · Spike Brokers · Cropto/MN7R",
      title: "UGA Index",
      description:
        "Daily Ukrainian spot export price index for core grain and oilseed commodities on a FOB Black Sea basis.",
      boardTitle: "UGA Index / Export Pricing",
      boardDescription:
        "Fair Ukrainian export price benchmark in USD/t. FOB Black Sea, T+30, published daily after EOD review.",
      heroSubtitle:
        "Daily export pricing benchmark for Ukrainian grains and oilseeds.",
      heroMeta: "FOB Black Sea · T+30 · USD/t · published after EOD review",
      heroAttribution:
        "Published by UGA. Market indicatives: Spike Brokers. Technology: Cropto/MN7R.",
      heroAttributionShort: "UGA · Spike Brokers · Cropto/MN7R",
      heroTrustStrip:
        "Respondent EOD data · median validation · ±2% outlier filter · minimum 5 respondents · locked after publication",
      heroTrustStripShort: "EOD · median · ±2% · 5+ · locked",
      currentValuesTitle: "Current index values",
      liveStatus: "live index",
      selectorTitle: "Commodities",
      reportTitle: "Download report",
      reportDescription:
        "Demo export of the daily index pack for presentations and internal review.",
      reportAction: "PDF / Excel demo",
      statusLabel: "Update status",
      updatedLabel: "Updated",
      basisLabel: "Basis",
      deliveryPeriodLabel: "Delivery period",
      marketOpen: "Published for demo",
      cardsLabel: "Current index values",
      chartsLabel: "Weekly movement",
      chartsTitle: "Combined weekly chart",
      chartsDescription:
        "A larger chart compares movement across all four commodities over recent trading sessions.",
      quotesLabel: "Quotations",
      quotesTitle: "Latest published values",
      quotesDescription:
        "The table shows price, change, and respondent count for every commodity.",
      table: {
        commodity: "Commodity",
        basis: "Basis",
        price: "Price",
        change: "Change",
        respondents: "Respondents",
      },
      partnersLabel: "Partners",
      partnersTitle: "Roles in the UGA Index ecosystem",
      partnersDescription:
        "UGA owns the brand and publication, Spike Brokers provides market indicatives, and Cropto/MN7R powers the technology platform.",
      methodologyCtaTitle: "How the index is calculated",
      methodologyCtaDescription:
        "Review the median, outlier filter, minimum respondent count, and publication locking rules.",
      analyticsCtaTitle: "Open analytics",
      analyticsCtaDescription:
        "Compare commodities, weekly movement, and publication history on the analytics page.",
      readMore: "Open methodology",
      viewAnalytics: "View analytics",
    },
    about: {
      label: "About",
      title: "A public index under the Ukrainian Grain Association brand",
      description:
        "UGA Index is a demo platform for publishing a daily market benchmark for fair Ukrainian export prices, collecting indicatives, and explaining the methodology transparently.",
      partners: [
        {
          name: "UGA",
          role: "Independent administrator, brand owner, and public publisher of the index.",
        },
        {
          name: "Spike Brokers",
          role: "Market indicatives partner for the demonstration workflow.",
        },
        {
          name: "Cropto/MN7R",
          role: "Technology partner for the platform, localization, and embeddable widget.",
        },
      ],
      rolesTitle: "Partner roles",
      rolesHeading: "UGA Index ecosystem",
      respondentsLabel: "Respondents",
      respondentsTitle: "Companies represented in the demo basket",
      respondentsDescription:
        "The demo mirrors a daily respondent survey structure for the core export commodities.",
      disclaimerTitle: "Informational data notice",
      disclaimer:
        "Public UGA Index values are informational only. They are not investment advice, an offer, or a commitment to transact; UGA is not liable for losses caused by use of the data.",
    },
    methodology: {
      label: "Methodology",
      title: "From respondent indicatives to locked index values",
      description:
        "The demo uses a simple and repeatable calculation process for every date, commodity, and delivery basis.",
      metrics: [
        { value: "FOB", label: "Black Sea" },
        { value: "T+30", label: "delivery period" },
        { value: "5+", label: "respondents" },
      ],
      sections: [
        {
          title: "What UGA Index is",
          description:
            "UGA Index is a daily market benchmark for fair Ukrainian agricultural export prices under the Ukrainian Grain Association brand.",
        },
        {
          title: "Respondent baskets",
          description:
            "For each commodity, delivery basis, calculation date, and delivery period, the system collects prices from a defined respondent basket. The demo uses one FOB Black Sea basket with weight 1, while the model supports future weighted baskets.",
        },
        {
          title: "EOD price logic",
          description:
            "Each price is an end-of-day fair market assessment and should represent an executable level where the respondent is ready to buy or sell.",
        },
        {
          title: "T+30 delivery period",
          description:
            "The index is oriented around delivery within 30 days from the quotation date. This keeps values comparable across respondents and trading days.",
        },
        {
          title: "Median, +/-2% filter, and trimmed average",
          description:
            "The system calculates the median of valid prices, excludes prices deviating by more than +/-2% from that median, then publishes the arithmetic average of the cleaned sample.",
        },
        {
          title: "Minimum 5 respondents",
          description:
            "A basket is publishable only when at least 5 valid respondent prices remain after filtering. If data is insufficient, Spike is displayed only as an external indicative.",
        },
        {
          title: "Audit log and locked values",
          description:
            "After publication, the index value is locked. Source edits, recalculations, and publication events should be recorded in the audit log with before and after state.",
        },
        {
          title: "Verification and versioning",
          description:
            "Before publication, calculations can have v1, v2, and later versions and pass independent partner verification. Publication fixes the final version and blocks further changes.",
        },
        {
          title: "Future scaling",
          description:
            "The methodology supports a future volume-weighted model, T+60/T+90 forward indices, and separate bid, offer, and mid quote types.",
        },
      ],
      signedPdfTitle: "Signed methodology PDF",
      signedPdfDescription:
        "The production page will host the signed PDF with the official UGA Index methodology.",
      signedPdfAction: "Pending upload",
      faqTitle: "FAQ",
      faq: [
        {
          question: "What is UGA Index?",
          answer:
            "It is a daily Ukrainian spot export price index for core grain and oilseed commodities on a FOB Black Sea basis.",
        },
        {
          question: "Who provides data?",
          answer:
            "Data comes from basket respondents: exporters and other representative market participants. Spike Brokers supports the process with external market indicatives.",
        },
        {
          question: "How are outliers handled?",
          answer:
            "After the median is calculated, prices deviating by more than +/-2% from the median are excluded before the cleaned average is calculated.",
        },
        {
          question: "What happens if there is insufficient data?",
          answer:
            "The index is not silently published. Spike can be shown as an external indicative only, not as a fallback index value.",
        },
        {
          question: "How often is the index published?",
          answer:
            "The demo is designed for daily publication after end-of-day data collection and review.",
        },
        {
          question: "What is available publicly vs for UGA members?",
          answer:
            "The public site shows latest values, methodology, and basic analytics. UGA members can later receive deeper history, additional cuts, and internal materials.",
        },
      ],
    },
    analytics: {
      label: "Analytics",
      title: "Commodity comparison and weekly change",
      description:
        "The analytics page prepares the surface for comparing index values, reviewing trends, and reading publication history.",
      demoAccess: "Demo access",
      filtersTitle: "Filters",
      commodityFilter: "Commodity",
      dateRangeFilter: "Date range",
      basisFilter: "Basis",
      allCommodities: "All commodities",
      accessTitle: "Future access levels",
      accessLevels: [
        {
          title: "Public visitor",
          period: "last 7 days",
          description: "Core index values and short movement view.",
        },
        {
          title: "Registered user",
          period: "last 1 year",
          description: "Extended history for regular monitoring.",
        },
        {
          title: "UGA member",
          period: "full period",
          description: "Full history and future member-only cuts.",
        },
        {
          title: "Paid access",
          period: "full period",
          description: "Full-period access for commercial analytics workflows.",
        },
      ],
      historicalTitle: "Historical line chart by commodity",
      historicalDescription:
        "The demo shows recently published values for all commodities.",
      dayChangeTitle: "Day-over-day changes",
      dayChangeDescription:
        "Absolute movement from the previous trading day.",
      comparisonTitle: "Commodity comparison",
      comparisonDescription:
        "Latest value for each commodity on the same delivery basis.",
      tableTitle: "Published values table",
      tableDescription:
        "Demo history of index values, changes, and respondent counts.",
      table: {
        date: "Date",
        commodity: "Commodity",
        basis: "Basis",
        value: "Value",
        dayChange: "Day change",
        respondents: "Respondents",
        status: "Status",
      },
    },
    footer: {
      rights: "Demo for the Ukrainian Grain Association.",
      partners: "Indicatives: Spike Brokers · Technology: Cropto/MN7R",
      disclaimer:
        "Information is provided for informational purposes only. UGA is not liable for losses caused by use of the data.",
    },
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function detectLocaleFromCountry(country: string | null): Locale {
  return country?.toUpperCase() === "UA" ? "uk" : DEFAULT_LOCALE;
}

export function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null,
): Locale | null {
  if (!acceptLanguage) {
    return null;
  }

  const requested = acceptLanguage
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  if (requested.some((language) => language === "uk" || language === "uk-ua")) {
    return "uk";
  }

  if (requested.some((language) => language === "en" || language?.startsWith("en-"))) {
    return "en";
  }

  return null;
}
