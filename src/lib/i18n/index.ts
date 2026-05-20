export const locales = ["uk", "en"] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE =
  process.env.NEXT_PUBLIC_INDEX_TENANT === "spike-ua"
    ? "spike_index_locale"
    : "uga_locale";

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
    descriptionBeforeLink: string;
    descriptionLinkText: string;
    descriptionAfterLink: string;
    ugaHref: string;
    whyLabel: string;
    whyTitle: string;
    whyBody: string[];
    whyFeatures: Array<{ title: string; description: string }>;
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
    coreLabel: string;
    coreTitle: string;
    coreNarrative: string[];
    facts: Array<{ value: string; label: string }>;
    flowTitle: string;
    flow: Array<{ title: string; description: string }>;
    pdfTitle: string;
    pdfDescription: string;
    pdfDownload: string;
    pdfOpen: string;
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
    demo: string;
    partners: string;
    disclaimer: string;
    navigationTitle: string;
    contactsTitle: string;
    addressTitle: string;
    address: string[];
    phonesTitle: string;
    phones: string[];
    emailTitle: string;
    email: string;
    socialTitle: string;
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
        "Щоденний індекс експортних спотових цін України для ключових зернових та олійних культур на базисі CPT Black Sea Panamax Ports (POC).",
      boardTitle: "UGA Index / Експортні ціни",
      boardDescription:
        "Ринковий бенчмарк справедливих експортних цін України у USD/t. CPT Black Sea Panamax Ports (POC), T+30, щоденна публікація після EOD-перевірки.",
      heroSubtitle:
        "Щоденні значення для ключових зернових та олійних культур України на базисі CPT Black Sea Panamax Ports (POC).",
      heroMeta: "CPT Black Sea Panamax Ports (POC) · T+30 · USD/т · публікація після EOD-перевірки",
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
        "Експорт денного пакета індексу для презентації та внутрішнього огляду.",
      reportAction: "PDF / Excel",
      statusLabel: "Статус оновлення",
      updatedLabel: "Оновлено",
      basisLabel: "Базис",
      deliveryPeriodLabel: "Період поставки",
      marketOpen: "Опубліковано",
      cardsLabel: "Поточні значення",
      chartsLabel: "Тижнева динаміка",
      chartsTitle: "Зведений місячний графік",
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
      label: "Про індекс",
      title:
        "Публічний бенчмарк експортних цін українського зернового ринку",
      descriptionBeforeLink: "UGA Index — це окрема платформа ",
      descriptionLinkText: "Української зернової асоціації",
      descriptionAfterLink:
        " для щоденної публікації індексів спотових експортних цін на ключові українські зернові та олійні культури. Індекс створений, щоб дати ринку зрозумілий, порівнюваний і методологічно визначений орієнтир цін на базисі CPT Black Sea Panamax Ports (POC) з періодом поставки T+30.",
      ugaHref: "https://uga.ua/",
      whyLabel: "Чому це важливо",
      whyTitle: "Український ціновий орієнтир для експортного ринку",
      whyBody: [
        "Україна є одним із важливих світових ринків експорту зернових та олійних культур. Формування внутрішніх цін залежить не лише від локального попиту й пропозиції, а й від світових товарних ринків, логістики, доступу до портів, фрахту, страхування, валютного середовища та щоденного торгового потоку.",
        "Для такого ринку публічний український бенчмарк зменшує фрагментацію цінової інформації. Замість орієнтації лише на приватні котирування, двосторонні переговори або розрізнені індикативи, учасники ринку можуть використовувати щоденне агреговане значення, розраховане за прозорою методологією.",
        "UGA Index є першим в Україні публічним бенчмарком такого формату для спотових експортних цін на ринку зернових та олійних культур. Індекс створений під брендом УЗА за підтримки членів асоціації та партнерів проєкту і призначений для виробників, експортерів, трейдерів, переробників, аналітиків та інституційних учасників, яким потрібен спільний ціновий орієнтир.",
      ],
      whyFeatures: [
        {
          title: "Прозоре ціноутворення",
          description:
            "Щоденно опубліковані значення допомагають ринку порівнювати рівні цін за ключовими культурами та умовами поставки.",
        },
        {
          title: "Репрезентативні ринкові дані",
          description:
            "Індекс базується на даних респондентів із компаній, які беруть активну участь в українських аграрних експортних потоках.",
        },
        {
          title: "Методологічна публікація",
          description:
            "Значення агрегуються, перевіряються та публікуються за визначеними правилами, включно з медіанною перевіркою, фільтром викидів і мінімальною кількістю респондентів.",
        },
      ],
      respondentsLabel: "Респонденти",
      respondentsTitle: "Компанії-респонденти у поточній корзині",
      respondentsDescription:
        "Корзина респондентів відображає найбільш активні компанії, що займають значну частку експорту аграрної продукції України та представлені у щоденному процесі збору цінових даних за ключовими експортними культурами. Основні респонденти індексу є членами УЗА, але корзина не обмежується лише членами асоціації. Індивідуальні щоденні значення компаній не публікуються; у відкритому доступі відображаються лише агреговані значення індексу.",
      disclaimerTitle: "Важливе інформаційне повідомлення",
      disclaimer:
        "Значення UGA Index публікуються виключно з інформаційною та аналітичною метою. Вони не є інвестиційною порадою, публічною офертою або рекомендацією купувати чи продавати будь-який товар. Значення агрегуються з даних респондентів і публікуються відповідно до методології індексу; індивідуальні дані компаній не розкриваються. УЗА, партнери проєкту та технологічні провайдери не несуть відповідальності за рішення, прийняті на основі цих даних.",
    },
    methodology: {
      label: "Методологія",
      title: "Як розраховується UGA Index",
      description:
        "UGA Index використовує повторюваний щоденний процес, який перетворює цінові індикативи респондентів на перевірені та зафіксовані значення індексу для кожної культури, базису поставки та дати розрахунку.",
      coreLabel: "Підхід до розрахунку",
      coreTitle: "Від EOD-цін респондентів до опублікованого бенчмарку",
      coreNarrative: [
        "UGA Index розраховується на основі щоденних цінових оцінок, які надає репрезентативна група респондентів ринку. Кожне подане значення має відображати справедливий ринковий рівень на кінець торгового дня для реально виконуваної експортної угоди з визначеною культурою, базисом поставки та періодом поставки.",
        "Стандартним базисом є CPT Чорноморські панамакс морські порти (Одеса, Чорноморськ та Південний), а періодом поставки — T+30. Ціни збираються для кожної культури та дати розрахунку, після чого проходять валідацію перед публікацією. Спочатку система визначає медіанне значення у вибірці респондентів. Значення, що відхиляються від медіани більш ніж на ±2%, виключаються з розрахунку як потенційні викиди.",
        "Після очищення вибірки значення індексу розраховується як середнє арифметичне валідних цін. Корзина може бути опублікована лише тоді, коли після фільтрації залишається щонайменше 5 валідних цін респондентів. Якщо даних недостатньо, система може показувати зовнішні ринкові індикативи окремо, але вони не публікуються автоматично як значення UGA Index.",
        "До публікації значення можуть перевірятися, уточнюватися та мати декілька версій. Після публікації фінальне значення фіксується. Система зберігає зміни, перерахунки та події публікації в журналі аудиту.",
      ],
      facts: [
        { value: "CPT UA Black Sea", label: "Стандартний базис поставки" },
        { value: "T+30", label: "Стандартний період поставки" },
        { value: "5+", label: "Мінімум валідних респондентів" },
        { value: "EOD", label: "Оцінка ціни на кінець торгового дня" },
        { value: "±2%", label: "Фільтр викидів відносно медіани" },
        { value: "Фіксація", label: "Фінальне значення після публікації" },
      ],
      flowTitle: "Послідовність розрахунку",
      flow: [
        {
          title: "Збір цін респондентів",
          description:
            "Респонденти подають EOD-оцінки справедливої ціни для відповідної культури, базису та періоду поставки.",
        },
        {
          title: "Валідація вибірки",
          description:
            "Система розраховує медіану та перевіряє всі подані значення відносно центрального ринкового рівня.",
        },
        {
          title: "Виключення викидів",
          description:
            "Ціни, що відхиляються від медіани більш ніж на ±2%, виключаються з очищеної вибірки.",
        },
        {
          title: "Розрахунок індексу",
          description:
            "Опубліковане значення є середнім арифметичним очищеної вибірки за умови виконання мінімальної кількості респондентів.",
        },
        {
          title: "Перевірка та фіксація",
          description:
            "До публікації значення можуть переглядатися та версіонуватися. Після публікації фінальне значення фіксується і записується в audit log.",
        },
      ],
      pdfTitle: "Офіційний PDF методології",
      pdfDescription:
        "Завантажте документ методології, використаний як основа для сторінки UGA Index. У production-версії цей файл може бути замінений на підписану та затверджену УЗА версію.",
      pdfDownload: "Завантажити PDF",
      pdfOpen: "Відкрити PDF",
      faqTitle: "FAQ",
      faq: [
        {
          question: "Що таке UGA Index?",
          answer:
            "UGA Index — це щоденний бенчмарк експортних цін української аграрної продукції. Він публікує агреговані значення індексу для обраних культур та умов поставки.",
        },
        {
          question: "Хто надає дані?",
          answer:
            "Дані збираються від визначеного пулу респондентів ринку. Індивідуальні значення окремих компаній не розкриваються у публічних матеріалах.",
        },
        {
          question: "Як обробляються викиди?",
          answer:
            "Система розраховує медіану вибірки респондентів і виключає значення, що відхиляються від неї більш ніж на ±2%, перед розрахунком фінального середнього.",
        },
        {
          question: "Що відбувається, якщо даних недостатньо?",
          answer:
            "Якщо після фільтрації залишається менше ніж 5 валідних цін респондентів, корзина не може бути опублікована як значення UGA Index. Зовнішні індикативи можуть відображатися лише як окремі довідкові дані.",
        },
        {
          question: "Чи можна змінювати опубліковані значення?",
          answer:
            "До публікації значення можуть перевірятися та версіонуватися. Після публікації фінальне значення фіксується, а зміни відображаються через audit trail.",
        },
        {
          question: "Чи може методологія масштабуватися?",
          answer:
            "Так. Методологія підтримує майбутні зважені корзини, додаткові періоди поставки на кшталт T+60 і T+90, а також окремі типи котирувань bid, offer або mid.",
        },
      ],
    },
    analytics: {
      label: "Аналітика",
      title: "Порівняння культур і місячні зміни",
      description:
        "Аналітична сторінка готує основу для порівняння індексів, перегляду трендів та історії публікацій.",
      demoAccess: "Попередній доступ",
      filtersTitle: "Фільтри",
      commodityFilter: "Культура",
      dateRangeFilter: "Період",
      basisFilter: "Базис",
      allCommodities: "Усі культури",
      accessTitle: "Майбутні рівні доступу",
      accessLevels: [
        {
          title: "Публічний відвідувач",
          period: "останні 30 днів",
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
        "Панель показує останні опубліковані значення для всіх культур.",
      dayChangeTitle: "Денні зміни",
      dayChangeDescription:
        "Абсолютна зміна день до дня за останні торгові дні.",
      comparisonTitle: "Порівняння культур",
      comparisonDescription:
        "Останнє значення кожної культури на одному базисі поставки.",
      tableTitle: "Таблиця опублікованих значень",
      tableDescription:
        "Історія значень індексу, змін і кількості респондентів.",
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
      demo: "Платформа для Української зернової асоціації.",
      partners: "Індикативи: Spike Brokers · Технологія: Cropto/MN7R",
      disclaimer:
        "Інформація надається виключно для інформаційних цілей. УЗА не несе відповідальності за збитки, спричинені використанням даних.",
      navigationTitle: "Навігація",
      contactsTitle: "Контакти",
      addressTitle: "Адреса",
      address: [
        "Україна, 01133, Київ,",
        "вул. Євгена Коновальця, 36Д",
        "6 поверх",
      ],
      phonesTitle: "Телефони",
      phones: ["+38 (044) 492-39-68", "+38 (044) 492-39-69"],
      emailTitle: "E-mail",
      email: "inbox@uga.ua",
      socialTitle: "Соціальні мережі",
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
        "Daily Ukrainian spot export price index for core grain and oilseed commodities on a CPT Black Sea Panamax Ports (POC) basis.",
      boardTitle: "UGA Index / Export Pricing",
      boardDescription:
        "Fair Ukrainian export price benchmark in USD/t. CPT Black Sea Panamax Ports (POC), T+30, published daily after EOD review.",
      heroSubtitle:
        "Daily values for key Ukrainian grains and oilseeds on CPT Black Sea Panamax Ports (POC) basis.",
      heroMeta: "CPT Black Sea Panamax Ports (POC) · T+30 · USD/t · published after EOD review",
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
        "Export of the daily index pack for presentations and internal review.",
      reportAction: "PDF / Excel",
      statusLabel: "Update status",
      updatedLabel: "Updated",
      basisLabel: "Basis",
      deliveryPeriodLabel: "Delivery period",
      marketOpen: "Published",
      cardsLabel: "Current index values",
      chartsLabel: "Weekly movement",
      chartsTitle: "Combined monthly chart",
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
        "Compare commodities, monthly movement, and publication history on the analytics page.",
      readMore: "Open methodology",
      viewAnalytics: "View analytics",
    },
    about: {
      label: "About",
      title: "A public benchmark for Ukrainian grain export prices",
      descriptionBeforeLink: "UGA Index is a dedicated platform by the ",
      descriptionLinkText: "Ukrainian Grain Association",
      descriptionAfterLink:
        " for publishing daily spot export price benchmarks for key Ukrainian grains and oilseeds. The index is designed to give the market a clear, comparable and methodology-based reference for CPT Black Sea Panamax Ports (POC), T+30 price levels.",
      ugaHref: "https://uga.ua/en/",
      whyLabel: "Why it matters",
      whyTitle: "A country-level price reference for an export-driven market",
      whyBody: [
        "Ukraine is one of the world’s important grain and oilseed export markets. Domestic price formation depends not only on local supply and demand, but also on global commodity prices, logistics, port access, freight, insurance, currency conditions and daily deal flow.",
        "In such a market, a public country-level benchmark helps reduce fragmentation. Instead of relying only on private quotes, bilateral conversations or scattered indicative levels, market participants can refer to a daily aggregated value calculated under a transparent methodology.",
        "UGA Index is intended to become Ukraine’s first public benchmark of this kind for spot export prices in the grain and oilseed market. It is created under the UGA brand with the support of association members and project partners, and is built for producers, exporters, traders, processors, analysts and institutional stakeholders who need a common pricing reference.",
      ],
      whyFeatures: [
        {
          title: "Transparent price discovery",
          description:
            "Daily published values help the market compare price levels across key commodities and delivery conditions.",
        },
        {
          title: "Representative market input",
          description:
            "The index is based on respondent data from companies active in Ukrainian agricultural export flows.",
        },
        {
          title: "Methodology-based publication",
          description:
            "Values are aggregated, validated and published according to defined rules, including median checks, outlier filtering and minimum respondent thresholds.",
        },
      ],
      respondentsLabel: "Respondents",
      respondentsTitle: "Respondent companies in the current basket",
      respondentsDescription:
        "The respondent basket reflects the most active companies representing a significant share of Ukraine’s agricultural exports and participating in the daily price collection workflow for the core export commodities. The main index respondents are UGA members, but the basket is not limited only to association members. Individual daily submissions are not published; the public index displays aggregated values only.",
      disclaimerTitle: "Important information notice",
      disclaimer:
        "UGA Index values are published for informational and analytical purposes only. They are not investment advice, a public offer, or a recommendation to buy or sell any commodity. Values are aggregated from respondent data and published according to the index methodology; individual company submissions are not disclosed. UGA, project partners and technology providers are not liable for decisions made on the basis of these data.",
    },
    methodology: {
      label: "Methodology",
      title: "How UGA Index is calculated",
      description:
        "UGA Index uses a repeatable daily process to turn respondent price indicatives into verified and locked index values for each commodity, delivery basis and calculation date.",
      coreLabel: "Calculation approach",
      coreTitle: "From respondent EOD prices to a published benchmark",
      coreNarrative: [
        "UGA Index is calculated from daily price assessments submitted by a representative group of market respondents. Each submitted value should reflect a fair end-of-day market level for an executable export transaction, using the defined commodity, delivery basis and delivery period.",
        "The standard basis is CPT Black Sea Panamax Ports (Odesa, Chornomorsk and Pivdennyi), and the delivery period is T+30. Prices are collected for each commodity and calculation date, then validated before publication. The calculation first identifies the median value in the respondent sample. Prices that deviate by more than ±2% from the median are excluded from the calculation as potential outliers.",
        "The index value is then calculated as the arithmetic average of the cleaned respondent sample. A basket is publishable only when at least 5 valid respondent prices remain after filtering. If the data are insufficient, the system may display external market indicatives separately, but they are not silently published as UGA Index values.",
        "Before publication, values can be reviewed, corrected and versioned. After publication, the final value is locked. The system records changes, recalculations and publication events in an audit log.",
      ],
      facts: [
        { value: "CPT UA Black Sea", label: "Standard delivery basis" },
        { value: "T+30", label: "Standard delivery period" },
        { value: "5+", label: "Minimum valid respondents" },
        { value: "EOD", label: "End-of-day price assessment" },
        { value: "±2%", label: "Median-based outlier filter" },
        { value: "Locked", label: "Final value after publication" },
      ],
      flowTitle: "Calculation flow",
      flow: [
        {
          title: "Collect respondent prices",
          description:
            "Respondents submit fair EOD price assessments for the relevant commodity, basis and delivery period.",
        },
        {
          title: "Validate the sample",
          description:
            "The system calculates the median and checks all submitted values against the central market level.",
        },
        {
          title: "Exclude outliers",
          description:
            "Prices deviating by more than ±2% from the median are excluded from the cleaned sample.",
        },
        {
          title: "Calculate the index",
          description:
            "The published value is the arithmetic average of the cleaned sample, provided the minimum respondent count is met.",
        },
        {
          title: "Verify and lock",
          description:
            "Before publication, values may be reviewed and versioned. Once published, the final value is locked and recorded in the audit log.",
        },
      ],
      pdfTitle: "Official methodology PDF",
      pdfDescription:
        "Download the methodology document used as the basis for the UGA Index page. The production site can replace this file with the signed and stamped version approved by UGA.",
      pdfDownload: "Download PDF",
      pdfOpen: "Open PDF",
      faqTitle: "FAQ",
      faq: [
        {
          question: "What is UGA Index?",
          answer:
            "UGA Index is a daily benchmark for Ukrainian agricultural export prices. It publishes aggregated index values for selected commodities and delivery conditions.",
        },
        {
          question: "Who provides data?",
          answer:
            "Data are collected from a defined pool of market respondents. Individual company submissions are not disclosed in public outputs.",
        },
        {
          question: "How are outliers handled?",
          answer:
            "The system calculates the median of the respondent sample and excludes values that deviate by more than ±2% from that median before calculating the final average.",
        },
        {
          question: "What happens if there is insufficient data?",
          answer:
            "If fewer than 5 valid respondent prices remain after filtering, the basket is not publishable as a UGA Index value. External indicatives may be shown only as separate reference data.",
        },
        {
          question: "Can published values be changed?",
          answer:
            "Before publication, values can be reviewed and versioned. After publication, the final value is locked and changes are recorded through the audit trail.",
        },
        {
          question: "Can the methodology scale?",
          answer:
            "Yes. The methodology supports future weighted baskets, additional delivery periods such as T+60 and T+90, and separate bid, offer or mid quote types.",
        },
      ],
    },
    analytics: {
      label: "Analytics",
      title: "Commodity comparison and monthly change",
      description:
        "The analytics page prepares the surface for comparing index values, reviewing trends, and reading publication history.",
      demoAccess: "Access preview",
      filtersTitle: "Filters",
      commodityFilter: "Commodity",
      dateRangeFilter: "Date range",
      basisFilter: "Basis",
      allCommodities: "All commodities",
      accessTitle: "Future access levels",
      accessLevels: [
        {
          title: "Public visitor",
          period: "last 30 days",
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
        "The panel shows recently published values for all commodities.",
      dayChangeTitle: "Day-over-day changes",
      dayChangeDescription:
        "Absolute movement from the previous trading day.",
      comparisonTitle: "Commodity comparison",
      comparisonDescription:
        "Latest value for each commodity on the same delivery basis.",
      tableTitle: "Published values table",
      tableDescription:
        "History of index values, changes, and respondent counts.",
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
      demo: "Platform for the Ukrainian Grain Association.",
      partners: "Indicatives: Spike Brokers · Technology: Cropto/MN7R",
      disclaimer:
        "Information is provided for informational purposes only. UGA is not liable for losses caused by use of the data.",
      navigationTitle: "Navigation",
      contactsTitle: "Contacts",
      addressTitle: "Address",
      address: [
        "Ukraine, 01133, Kyiv,",
        "36D Yevhena Konovaltsia St.",
        "6th floor",
      ],
      phonesTitle: "Phones",
      phones: ["+38 (044) 492-39-68", "+38 (044) 492-39-69"],
      emailTitle: "E-mail",
      email: "inbox@uga.ua",
      socialTitle: "Social",
    },
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale) {
  if (getActiveTenantId() === "spike-ua") {
    return getSpikeDictionary(locale, dictionaries[locale]);
  }

  return dictionaries[locale];
}

function getActiveTenantId() {
  return process.env.NEXT_PUBLIC_INDEX_TENANT ?? process.env.INDEX_TENANT;
}

function getSpikeDictionary(locale: Locale, base: Dictionary): Dictionary {
  if (locale === "uk") {
    return {
      ...base,
      home: {
        ...base.home,
        partnerLine: "Spike Brokers · партнери ринку · Cropto/MN7R",
        title: "SPIKE Spot Commodity Index Ukraine",
        description:
          "Щоденний спотовий індекс Spike Brokers для ключових експортних і переробних позицій українського аграрного ринку.",
        boardTitle: "SPIKE Index / Спотові ціни",
        boardDescription:
          "Ринковий бенчмарк у USD/т для CPT Одеса та CPT parity Одеса, що публікується після щоденної перевірки даних партнерів.",
        heroSubtitle:
          "Щоденні значення для експортних і переробних базисів України від Spike Brokers.",
        heroMeta: "CPT Одеса · spot · USD/т · публікація після EOD-перевірки",
        heroAttribution:
          "Публікується Spike Brokers. Дані: партнери ринку. Технологія: Cropto/MN7R.",
        heroAttributionShort: "Spike Brokers · партнери ринку · Cropto/MN7R",
        heroTrustStrip:
          "Дані партнерів Spike Brokers · медіанна валідація · +/-2% фільтр викидів · мінімум 5 респондентів · фіксація після публікації",
        heroTrustStripShort: "партнери Spike · медіана · +/-2% · 5+ · фіксація",
        partnersTitle: "Ролі в екосистемі SPIKE Spot Commodity Index Ukraine",
        partnersDescription:
          "Spike Brokers відповідає за бренд, публікацію та ринкову експертизу; партнери-респонденти надають щоденні цінові оцінки; Cropto/MN7R забезпечує технологічну платформу.",
      },
      about: {
        ...base.about,
        title:
          "Спотовий бенчмарк Spike Brokers для українського аграрного ринку",
        descriptionBeforeLink:
          "SPIKE Spot Commodity Index Ukraine — це окрема індексна платформа ",
        descriptionLinkText: "Spike Brokers",
        descriptionAfterLink:
          " для щоденної публікації агрегованих спотових цін за ключовими експортними та переробними позиціями України. Індекс створений, щоб дати ринку прозорий і порівнюваний орієнтир для CPT Одеса та CPT parity Одеса.",
        ugaHref: "https://spike.broker/",
        whyTitle: "Операційний ціновий орієнтир для угод, логістики та переробки",
        whyBody: [
          "Український аграрний ринок щодня реагує на попит експортерів, переробників, логістику, портову інфраструктуру, валюту, фрахт і якісні параметри продукції. Для роботи з такими потоками учасникам потрібен спільний орієнтир, прив'язаний до реальних торгових базисів.",
          "SPIKE Spot Commodity Index Ukraine агрегує ринкові оцінки партнерів Spike Brokers і перетворює їх на зіставні значення для публікації. Індекс не розкриває індивідуальні подання компаній, а показує очищений агрегований результат.",
          "Платформа охоплює експортні позиції CPT Одеса та переробні позиції CPT parity Одеса. Для сої ГМО та соняшнику публічні значення відображаються з ПДВ, відповідно до логіки ринку переробки.",
        ],
        whyFeatures: [
          {
            title: "Спотовий ринковий орієнтир",
            description:
              "Щоденні значення допомагають порівнювати рівні цін для експортних і переробних потоків.",
          },
          {
            title: "Дані партнерів Spike Brokers",
            description:
              "Індекс базується на щоденних оцінках респондентів, які працюють з українськими аграрними товарами.",
          },
          {
            title: "Єдина методологія",
            description:
              "Значення проходять медіанну перевірку, фільтрацію викидів і публікуються тільки за достатнього покриття респондентів.",
          },
        ],
        respondentsTitle: "Партнери-респонденти у поточній корзині",
        respondentsDescription:
          "Корзина респондентів відображає партнерів Spike Brokers, представлених у щоденному зборі цінових даних. Індивідуальні подання не публікуються; у відкритому доступі відображаються лише агреговані значення індексу.",
        disclaimer:
          "Значення SPIKE Spot Commodity Index Ukraine публікуються виключно з інформаційною та аналітичною метою. Вони не є інвестиційною порадою, публічною офертою або рекомендацією купувати чи продавати будь-який товар. Значення агрегуються з даних партнерів-респондентів і публікуються відповідно до методології; індивідуальні дані компаній не розкриваються. Spike Brokers, партнери проєкту та технологічні провайдери не несуть відповідальності за рішення, прийняті на основі цих даних.",
      },
      methodology: {
        ...base.methodology,
        title: "Як розраховується SPIKE Spot Commodity Index Ukraine",
        description:
          "SPIKE Spot Commodity Index Ukraine використовує повторюваний щоденний процес, який перетворює цінові оцінки партнерів-респондентів на перевірені та зафіксовані значення індексу для кожної позиції, базису та дати розрахунку.",
        coreTitle: "Від EOD-оцінок партнерів до опублікованого спотового бенчмарку",
        coreNarrative: [
          "Індекс розраховується на основі щоденних цінових оцінок, які надає визначена група партнерів-респондентів Spike Brokers. Кожне подане значення має відображати справедливий ринковий рівень на кінець торгового дня для відповідної культури та базису.",
          "Поточні публічні базиси: CPT Одеса, Україна для експортних позицій і CPT parity Одеса, Україна для позицій переробки. Ціни збираються для кожної позиції та дати розрахунку, після чого проходять валідацію. Система визначає медіану вибірки, а значення, що відхиляються від медіани більш ніж на +/-2%, виключаються як потенційні викиди.",
          "Після очищення вибірки значення індексу розраховується як середнє арифметичне валідних цін. Корзина може бути опублікована лише тоді, коли після фільтрації залишається щонайменше 5 валідних цін респондентів. Окремого зовнішнього індикативу Spike Brokers у цьому інстансі немає, оскільки Spike Brokers є видавцем індексу.",
          "До публікації значення можуть перевірятися, уточнюватися та мати декілька версій. Після публікації фінальне значення фіксується. Система зберігає зміни, перерахунки та події публікації в журналі аудиту.",
        ],
        facts: [
          { value: "CPT Odesa", label: "Базис для експортних позицій" },
          { value: "CPT parity", label: "Базис для позицій переробки" },
          { value: "5+", label: "Мінімум валідних респондентів" },
          { value: "EOD", label: "Оцінка ціни на кінець торгового дня" },
          { value: "+/-2%", label: "Фільтр викидів відносно медіани" },
          { value: "Фіксація", label: "Фінальне значення після публікації" },
        ],
        pdfDescription:
          "Завантажте документ методології, використаний як основа для SPIKE Spot Commodity Index Ukraine. Production-версія може бути замінена на затверджену Spike Brokers редакцію.",
        faq: [
          {
            question: "Що таке SPIKE Spot Commodity Index Ukraine?",
            answer:
              "Це щоденний спотовий бенчмарк Spike Brokers для ключових українських аграрних позицій на експортних і переробних базисах.",
          },
          {
            question: "Хто надає дані?",
            answer:
              "Дані збираються від визначеного пулу партнерів-респондентів Spike Brokers. Індивідуальні значення окремих компаній не розкриваються у публічних матеріалах.",
          },
          ...base.methodology.faq.slice(2, 3),
          {
            question: "Що відбувається, якщо даних недостатньо?",
            answer:
              "Якщо після фільтрації залишається менше ніж 5 валідних цін респондентів, корзина не може бути опублікована як офіційне значення індексу.",
          },
          ...base.methodology.faq.slice(4),
        ],
      },
      analytics: {
        ...base.analytics,
        title: "Аналітика SPIKE Spot Commodity Index Ukraine",
        description:
          "Аналітична сторінка готує основу для порівняння спотових позицій, перегляду трендів та історії публікацій Spike Brokers.",
        accessLevels: base.analytics.accessLevels.map((level) =>
          level.title === "Член UGA"
            ? { ...level, title: "Партнер Spike Brokers" }
            : level,
        ),
      },
      footer: {
        ...base.footer,
        demo: "Платформа для Spike Brokers.",
        partners: "Дані: партнери Spike Brokers · Технологія: Cropto/MN7R",
        disclaimer:
          "Інформація надається виключно для інформаційних цілей. Spike Brokers не несе відповідальності за збитки, спричинені використанням даних.",
        address: ["Україна, 04070, Київ", "вул. Іллінська, 8", "БЦ «Іллінський»"],
        phones: ["+380 63 412 86 33"],
        email: "info@spike.broker",
      },
    };
  }

  return {
    ...base,
    home: {
      ...base.home,
      partnerLine: "Spike Brokers · market partners · Cropto/MN7R",
      title: "SPIKE Spot Commodity Index Ukraine",
      description:
        "Daily Spike Brokers spot index for core Ukrainian export and processing commodity positions.",
      boardTitle: "SPIKE Index / Spot Pricing",
      boardDescription:
        "USD/t market benchmark for CPT Odesa and CPT parity Odesa, published after daily partner-data review.",
      heroSubtitle:
        "Daily values for Ukrainian export and processing bases from Spike Brokers.",
      heroMeta: "CPT Odesa · spot · USD/t · published after EOD review",
      heroAttribution:
        "Published by Spike Brokers. Data: market partners. Technology: Cropto/MN7R.",
      heroAttributionShort: "Spike Brokers · market partners · Cropto/MN7R",
      heroTrustStrip:
        "Spike Brokers partner data · median validation · +/-2% outlier filter · minimum 5 respondents · locked publication",
      heroTrustStripShort: "Spike partners · median · +/-2% · 5+ · locked",
      partnersTitle: "Roles in the SPIKE Spot Commodity Index Ukraine ecosystem",
      partnersDescription:
        "Spike Brokers owns the brand, publication and market expertise; respondent partners provide daily price assessments; Cropto/MN7R powers the technology platform.",
    },
    about: {
      ...base.about,
      title: "A Spike Brokers spot benchmark for Ukrainian agricultural markets",
      descriptionBeforeLink:
        "SPIKE Spot Commodity Index Ukraine is a dedicated index platform by ",
      descriptionLinkText: "Spike Brokers",
      descriptionAfterLink:
        " for publishing daily aggregated spot prices across selected Ukrainian export and processing positions. The index gives the market a transparent and comparable reference for CPT Odesa and CPT parity Odesa levels.",
      ugaHref: "https://spike.broker/en/",
      whyTitle: "An operational price reference for trade, logistics and processing",
      whyBody: [
        "Ukraine's agricultural market reacts daily to exporter and processor demand, logistics, port infrastructure, currency, freight and product quality. Market participants need a shared reference linked to executable trading bases.",
        "SPIKE Spot Commodity Index Ukraine aggregates market assessments from Spike Brokers partners and turns them into comparable public values. The index does not disclose individual company submissions; it shows a cleaned aggregated result.",
        "The platform covers CPT Odesa export positions and CPT parity Odesa processing positions. GMO soybean and sunflower seed public values are shown VAT-included, reflecting processing-market convention.",
      ],
      whyFeatures: [
        {
          title: "Spot market reference",
          description:
            "Daily values help compare price levels across export and processing flows.",
        },
        {
          title: "Spike Brokers partner data",
          description:
            "The index is based on daily respondent assessments from partners active in Ukrainian agricultural commodities.",
        },
        {
          title: "Single methodology",
          description:
            "Values go through median validation, outlier filtering and publication only when respondent coverage is sufficient.",
        },
      ],
      respondentsTitle: "Respondent partners in the current basket",
      respondentsDescription:
        "The respondent basket reflects Spike Brokers partners represented in the daily price collection workflow. Individual submissions are not published; the public index displays aggregated values only.",
      disclaimer:
        "SPIKE Spot Commodity Index Ukraine values are published for informational and analytical purposes only. They are not investment advice, a public offer, or a recommendation to buy or sell any commodity. Values are aggregated from respondent-partner data and published according to the index methodology; individual company submissions are not disclosed. Spike Brokers, project partners and technology providers are not liable for decisions made on the basis of these data.",
    },
    methodology: {
      ...base.methodology,
      title: "How SPIKE Spot Commodity Index Ukraine is calculated",
      description:
        "SPIKE Spot Commodity Index Ukraine uses a repeatable daily process to turn respondent-partner price assessments into verified and locked index values for each position, basis and calculation date.",
      coreTitle: "From partner EOD assessments to a published spot benchmark",
      coreNarrative: [
        "The index is calculated from daily price assessments submitted by a defined group of Spike Brokers respondent partners. Each submitted value should reflect a fair end-of-day market level for the relevant commodity and basis.",
        "Current public bases are CPT Odesa, Ukraine for export positions and CPT parity Odesa, Ukraine for processing positions. Prices are collected for each position and calculation date, then validated. The system identifies the median value in the respondent sample and excludes prices deviating by more than +/-2% from the median as potential outliers.",
        "The index value is calculated as the arithmetic average of the cleaned respondent sample. A basket is publishable only when at least 5 valid respondent prices remain after filtering. This tenant does not use a separate Spike Brokers external indicative because Spike Brokers is the index publisher.",
        "Before publication, values can be reviewed, corrected and versioned. After publication, the final value is locked. The system records changes, recalculations and publication events in an audit log.",
      ],
      facts: [
        { value: "CPT Odesa", label: "Export-position basis" },
        { value: "CPT parity", label: "Processing-position basis" },
        { value: "5+", label: "Minimum valid respondents" },
        { value: "EOD", label: "End-of-day price assessment" },
        { value: "+/-2%", label: "Median-based outlier filter" },
        { value: "Locked", label: "Final value after publication" },
      ],
      pdfDescription:
        "Download the methodology document used as the basis for SPIKE Spot Commodity Index Ukraine. The production site can replace this file with the approved Spike Brokers version.",
      faq: [
        {
          question: "What is SPIKE Spot Commodity Index Ukraine?",
          answer:
            "It is a daily Spike Brokers spot benchmark for selected Ukrainian agricultural export and processing positions.",
        },
        {
          question: "Who provides data?",
          answer:
            "Data are collected from a defined pool of Spike Brokers respondent partners. Individual company submissions are not disclosed in public outputs.",
        },
        ...base.methodology.faq.slice(2, 3),
        {
          question: "What happens if there is insufficient data?",
          answer:
            "If fewer than 5 valid respondent prices remain after filtering, the basket is not publishable as an official index value.",
        },
        ...base.methodology.faq.slice(4),
      ],
    },
    analytics: {
      ...base.analytics,
      title: "SPIKE Spot Commodity Index Ukraine analytics",
      description:
        "The analytics page prepares the surface for comparing spot positions, reviewing trends and reading Spike Brokers publication history.",
      accessLevels: base.analytics.accessLevels.map((level) =>
        level.title === "UGA member"
          ? { ...level, title: "Spike Brokers partner" }
          : level,
      ),
    },
    footer: {
      ...base.footer,
      demo: "Platform for Spike Brokers.",
      partners: "Data: Spike Brokers partners · Technology: Cropto/MN7R",
      disclaimer:
        "Information is provided for informational purposes only. Spike Brokers is not liable for losses caused by use of the data.",
      address: ["Ukraine, 04070, Kyiv", "8 Illinska St.", "Illinskyi Business Center"],
      phones: ["+380 63 412 86 33"],
      email: "info@spike.broker",
    },
  };
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
