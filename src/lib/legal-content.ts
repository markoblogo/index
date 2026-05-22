import type { Locale } from "@/lib/i18n";
import { getActiveIndexConfig } from "@/lib/index-platform";

export const legalPages = ["privacy", "terms", "risk-disclosure"] as const;
export type LegalPageSlug = (typeof legalPages)[number];

type LegalSection = {
  title: string;
  paragraphs?: string[];
  paragraphsAfter?: string[];
  bullets?: string[];
};

type LegalPageContent = {
  title: string;
  description: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return legalPages.includes(value as LegalPageSlug);
}

export function getLegalPageContent(
  locale: Locale,
  slug: LegalPageSlug,
): LegalPageContent {
  if (getActiveIndexConfig().id === "spike-ua") {
    return getSpikeLegalPageContent(locale, slug);
  }

  return legalContent[locale][slug];
}

function getSpikeLegalPageContent(
  locale: Locale,
  slug: LegalPageSlug,
): LegalPageContent {
  const base = legalContent[locale][slug];
  const mapped = mapLegalContentText(base, (text) =>
    locale === "uk" ? mapSpikeUkLegalText(text) : mapSpikeEnLegalText(text),
  );

  if (slug === "privacy") {
    return {
      ...mapped,
      description:
        locale === "uk"
          ? "Політика конфіденційності SPIKE Spot Commodity Index Ukraine"
          : "SPIKE Spot Commodity Index Ukraine Privacy Policy",
      intro:
        locale === "uk"
          ? [
              "Ця Політика конфіденційності пояснює, як SPIKE Spot Commodity Index Ukraine збирає, використовує та захищає інформацію під час взаємодії відвідувачів, респондентів, адміністраторів та користувачів аналітики з платформою.",
              "SPIKE Spot Commodity Index Ukraine — це платформа Spike Brokers для публікації агрегованих ринкових значень індексу та пов'язаної аналітики щодо українських аграрних спотових цін.",
            ]
          : [
              "This Privacy Policy explains how SPIKE Spot Commodity Index Ukraine collects, uses and protects information when visitors, respondents, administrators and analytics users interact with the platform.",
              "SPIKE Spot Commodity Index Ukraine is a Spike Brokers platform for publishing aggregated market index values and related analytics for Ukrainian agricultural spot prices.",
            ],
    };
  }

  if (slug === "terms") {
    return {
      ...mapped,
      description:
        locale === "uk"
          ? "Умови використання SPIKE Spot Commodity Index Ukraine"
          : "SPIKE Spot Commodity Index Ukraine Terms of Use",
      intro:
        locale === "uk"
          ? [
              "Ці Умови використання регулюють доступ до платформи SPIKE Spot Commodity Index Ukraine та її використання, включно з публічними значеннями індексу, аналітикою, процесами для респондентів, embedded-віджетами та пов'язаним контентом.",
              "Користуючись платформою, ви погоджуєтеся з цими Умовами.",
            ]
          : [
              "These Terms of Use govern access to and use of SPIKE Spot Commodity Index Ukraine, including public index values, analytics, respondent workflows, embedded widgets and related content.",
              "By using the platform, you agree to these Terms.",
            ],
    };
  }

  return {
    ...mapped,
    description:
      locale === "uk"
        ? "Розкриття ризиків SPIKE Spot Commodity Index Ukraine"
        : "SPIKE Spot Commodity Index Ukraine Risk Disclosure",
    intro:
      locale === "uk"
        ? [
            "Це Розкриття ризиків пояснює важливі обмеження та ризики, пов'язані з використанням значень SPIKE Spot Commodity Index Ukraine, аналітики, сценарних результатів та пов'язаних даних.",
          ]
        : [
            "This Risk Disclosure explains important limitations and risks related to the use of SPIKE Spot Commodity Index Ukraine values, analytics, scenario outputs and related data.",
          ],
  };
}

function mapLegalContentText(
  content: LegalPageContent,
  mapper: (text: string) => string,
): LegalPageContent {
  return {
    ...content,
    description: mapper(content.description),
    intro: content.intro.map(mapper),
    sections: content.sections.map((section) => ({
      ...section,
      paragraphs: section.paragraphs?.map(mapper),
      paragraphsAfter: section.paragraphsAfter?.map(mapper),
      bullets: section.bullets?.map(mapper),
    })),
  };
}

function mapSpikeEnLegalText(text: string) {
  return text
    .replaceAll("UGA Index", "SPIKE Spot Commodity Index Ukraine")
    .replaceAll("the Ukrainian Grain Association", "Spike Brokers")
    .replaceAll("Ukrainian Grain Association", "Spike Brokers")
    .replaceAll("UGA", "Spike Brokers")
    .replaceAll("FOB Black Sea", "CPT Odesa and CPT parity Odesa")
    .replaceAll("T+30", "spot")
    .replaceAll("inbox@uga.ua", "info@spike.broker")
    .replaceAll(
      "Ukraine, 01133, Kyiv,\n36D Yevhena Konovaltsia St.,\n6th floor",
      "Ukraine, 04070, Kyiv,\n8 Illinska St.,\nIllinskyi Business Center",
    )
    .replaceAll(
      "External market indicatives, including partner indicatives, may be displayed as reference information. They should not be treated as official SPIKE Spot Commodity Index Ukraine values unless expressly published as such.",
      "This Spike Brokers tenant does not use a separate Spike external indicative. Any third-party reference values, if introduced later, should be displayed separately and should not be treated as official index values unless expressly published as such.",
    );
}

function mapSpikeUkLegalText(text: string) {
  return text
    .replaceAll("UGA Index", "SPIKE Spot Commodity Index Ukraine")
    .replaceAll("Української зернової асоціації", "Spike Brokers")
    .replaceAll("Українська зернова асоціація", "Spike Brokers")
    .replaceAll("Української зернової асоціації", "Spike Brokers")
    .replaceAll("УЗА", "Spike Brokers")
    .replaceAll("FOB Black Sea", "CPT Одеса та CPT parity Одеса")
    .replaceAll("T+30", "spot")
    .replaceAll("inbox@uga.ua", "info@spike.broker")
    .replaceAll(
      "Україна, 01133, Київ,\nвул. Євгена Коновальця, 36Д,\n6 поверх",
      "Україна, 04070, Київ,\nвул. Іллінська, 8,\nБЦ «Іллінський»",
    )
    .replaceAll(
      "Зовнішні ринкові індикативи, включно з індикативами партнерів, можуть відображатися як довідкова інформація. Вони не повинні вважатися офіційними значеннями SPIKE Spot Commodity Index Ukraine, якщо прямо не опубліковані як такі.",
      "У цьому інстансі Spike Brokers не використовується окремий зовнішній індикатив Spike. Будь-які сторонні довідкові значення, якщо вони будуть додані пізніше, мають відображатися окремо і не повинні вважатися офіційними значеннями індексу, якщо прямо не опубліковані як такі.",
    );
}

const legalContent: Record<Locale, Record<LegalPageSlug, LegalPageContent>> = {
  en: {
    privacy: {
      title: "Privacy Policy",
      description: "UGA Index Privacy Policy",
      lastUpdated: "Last updated: May 2026",
      intro: [
        "This Privacy Policy explains how UGA Index collects, uses and protects information when visitors, respondents, administrators and analytics users interact with the platform.",
        "UGA Index is a platform created for the Ukrainian Grain Association to publish aggregated market index values and related analytics for Ukrainian grain and oilseed export prices.",
      ],
      sections: [
        {
          title: "1. Who we are",
          paragraphs: [
            "UGA Index is operated for the Ukrainian Grain Association.",
            "Contact details:\nUkrainian Grain Association\nUkraine, 01133, Kyiv,\n36D Yevhena Konovaltsia St.,\n6th floor",
            "E-mail:\ninbox@uga.ua",
          ],
        },
        {
          title: "2. Information we may collect",
          paragraphs: [
            "Depending on how you use the platform, we may collect:",
          ],
          bullets: [
            "account and access information, such as name, email, role, company and login metadata;",
            "respondent information, including company name and submitted price indicatives;",
            "technical information, such as IP address, browser type, device type, pages visited and access logs;",
            "preference information, such as selected language, theme and display currency;",
            "communications that you send to us;",
            "analytics or subscription-related information if paid services are introduced in the future.",
          ],
        },
        {
          title: "3. How we use information",
          paragraphs: ["We use information to:"],
          bullets: [
            "operate and secure the UGA Index platform;",
            "collect, validate and manage respondent submissions;",
            "calculate and publish aggregated index values;",
            "provide public market information and analytics;",
            "manage user access and internal workflows;",
            "improve the platform and user experience;",
            "respond to requests and communications;",
            "comply with legal, regulatory and security obligations.",
          ],
        },
        {
          title: "4. Respondent data",
          paragraphs: [
            "Individual respondent submissions are used for index calculation and operational review. Public outputs display aggregated index values only. Individual company submissions are not disclosed publicly unless separately agreed or required by law.",
          ],
        },
        {
          title: "5. Cookies and local storage",
          paragraphs: [
            "The platform may use cookies or local storage for necessary functions, such as language selection, theme selection, display currency and session management. If additional analytics, marketing or payment tools are introduced, this policy may be updated.",
          ],
        },
        {
          title: "6. Sharing of information",
          paragraphs: ["We may share information with:"],
          bullets: [
            "Ukrainian Grain Association personnel and authorized administrators;",
            "technology service providers supporting hosting, infrastructure, security or platform operations;",
            "project partners where necessary for platform operation or verification;",
            "legal or regulatory authorities where required by law.",
          ],
          paragraphsAfter: ["We do not sell personal data."],
        },
        {
          title: "7. Data retention",
          paragraphs: [
            "We keep information only for as long as necessary for the purposes described in this policy, including platform operation, audit trail, security, legal obligations and methodology governance.",
          ],
        },
        {
          title: "8. International processing",
          paragraphs: [
            "The platform may use hosting and technology providers located in different jurisdictions. Where required, appropriate safeguards should be applied for international processing or transfer of personal data.",
          ],
        },
        {
          title: "9. Your rights",
          paragraphs: [
            "Depending on applicable law, you may have the right to request access to, correction of, deletion of, restriction of or objection to the processing of your personal data. To make a request, contact us at inbox@uga.ua.",
          ],
        },
        {
          title: "10. Security",
          paragraphs: [
            "We use reasonable technical and organizational measures to protect information. However, no online platform can guarantee absolute security.",
          ],
        },
        {
          title: "11. Changes to this policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. The updated version will be published on this page with a revised date.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of Use",
      description: "UGA Index Terms of Use",
      lastUpdated: "Last updated: May 2026",
      intro: [
        "These Terms of Use govern access to and use of the UGA Index platform, including public index values, analytics, respondent workflows, embedded widgets and related content.",
        "By using the platform, you agree to these Terms.",
      ],
      sections: [
        {
          title: "1. Purpose of the platform",
          paragraphs: [
            "UGA Index provides informational and analytical materials related to Ukrainian grain and oilseed export price benchmarks. The platform may include public index values, methodology information, analytics, respondent workflows and future API access.",
          ],
        },
        {
          title: "2. Informational use only",
          paragraphs: [
            "All information on the platform is provided for informational and analytical purposes only. It is not investment advice, trading advice, legal advice, tax advice, a public offer or a recommendation to buy or sell any commodity.",
          ],
        },
        {
          title: "3. Index values and methodology",
          paragraphs: [
            "UGA Index values are calculated and published according to the applicable methodology. Public outputs are aggregated. Individual respondent submissions are not published unless separately agreed or required by law.",
          ],
        },
        {
          title: "4. User accounts and access",
          paragraphs: [
            "Certain areas of the platform may require login or assigned access roles. Users are responsible for keeping their access credentials secure and for all activity performed under their account.",
          ],
        },
        {
          title: "5. Respondent submissions",
          paragraphs: [
            "Respondents must be authorized to submit information on behalf of their company. Submitted values should be made in good faith and should reflect relevant market assessment criteria. Any attempt to manipulate, distort or misuse the index process is prohibited.",
          ],
        },
        {
          title: "6. Analytics and API",
          paragraphs: [
            "Analytics and API functionality may be provided as preview, member-only or paid access. Availability, scope, pricing and technical conditions may change over time.",
          ],
        },
        {
          title: "7. Intellectual property",
          paragraphs: [
            "The platform design, content, methodology materials, data presentation, text, graphics and software are protected by intellectual property rights. You may not copy, reproduce, distribute, scrape, resell or commercially exploit the platform or its data without prior written permission, except where expressly allowed.",
          ],
        },
        {
          title: "8. Embedded widgets",
          paragraphs: [
            "If UGA Index provides embed code or widgets, they may be used only in the form provided and with visible attribution. The platform may modify, suspend or revoke widget access.",
          ],
        },
        {
          title: "9. Third-party links",
          paragraphs: [
            "The platform may contain links to third-party websites. UGA Index is not responsible for the content, availability or policies of third-party websites.",
          ],
        },
        {
          title: "10. Availability and changes",
          paragraphs: [
            "We may update, suspend, limit or discontinue any part of the platform at any time. We do not guarantee uninterrupted or error-free operation.",
          ],
        },
        {
          title: "11. Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, UGA Index, the Ukrainian Grain Association, project partners and technology providers are not liable for losses, damages or decisions arising from use of the platform, index values, analytics, scenario outputs or related materials.",
          ],
        },
        {
          title: "12. Governing law",
          paragraphs: [
            "These Terms are intended to be governed by the laws of Ukraine, unless otherwise required by applicable law or agreed in writing.",
          ],
        },
        {
          title: "13. Contact",
          paragraphs: ["For questions about these Terms, contact inbox@uga.ua."],
        },
      ],
    },
    "risk-disclosure": {
      title: "Risk Disclosure",
      description: "UGA Index Risk Disclosure",
      lastUpdated: "Last updated: May 2026",
      intro: [
        "This Risk Disclosure explains important limitations and risks related to the use of UGA Index values, analytics, scenario outputs and related data.",
      ],
      sections: [
        {
          title: "1. Informational purpose",
          paragraphs: [
            "UGA Index values and analytics are provided for informational and analytical purposes only. They are not investment advice, trading advice, a public offer or a recommendation to buy or sell any commodity.",
          ],
        },
        {
          title: "2. Commodity market risk",
          paragraphs: [
            "Agricultural commodity prices may change rapidly due to supply and demand, weather, logistics, port access, freight, insurance, currency conditions, geopolitical events, regulation and global market developments. Past values do not guarantee future price levels.",
          ],
        },
        {
          title: "3. Benchmark limitations",
          paragraphs: [
            "UGA Index values are based on respondent data and methodology rules. Although the methodology is designed to support transparency and consistency, index values may be affected by data availability, respondent coverage, market liquidity, timing, validation rules and operational factors.",
          ],
        },
        {
          title: "4. Data delays and errors",
          paragraphs: [
            "The platform may contain delayed, incomplete or incorrect data. Values may be reviewed before publication. Once published, values are intended to be locked according to the methodology, but technical or operational issues may still occur.",
          ],
        },
        {
          title: "5. External indicatives",
          paragraphs: [
            "External market indicatives, including partner indicatives, may be displayed as reference information. They should not be treated as official UGA Index values unless expressly published as such.",
          ],
        },
        {
          title: "6. Currency conversion risk",
          paragraphs: [
            "Official UGA Index values are published in USD/t. UAH/t and EUR/t values are converted display values based on selected exchange rates. Currency movements may materially change converted values.",
          ],
        },
        {
          title: "7. Scenario analytics",
          paragraphs: [
            "Any AI-assisted or model-based scenario outputs are analytical previews only. They are not guaranteed forecasts and should not be relied upon as predictions of future prices.",
          ],
        },
        {
          title: "8. User responsibility",
          paragraphs: [
            "Users are responsible for their own commercial, trading, financial and risk-management decisions. Before making decisions, users should verify information independently and consider professional advice where appropriate.",
          ],
        },
        {
          title: "9. Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, UGA Index, the Ukrainian Grain Association, project partners and technology providers are not liable for losses or damages arising from reliance on index values, analytics, scenario outputs, currency conversions, API data or other platform materials.",
          ],
        },
      ],
    },
  },
  uk: {
    privacy: {
      title: "Політика конфіденційності",
      description: "Політика конфіденційності UGA Index",
      lastUpdated: "Останнє оновлення: травень 2026",
      intro: [
        "Ця Політика конфіденційності пояснює, як UGA Index збирає, використовує та захищає інформацію під час взаємодії відвідувачів, респондентів, адміністраторів та користувачів аналітики з платформою.",
        "UGA Index — це платформа, створена для Української зернової асоціації з метою публікації агрегованих ринкових значень індексу та пов’язаної аналітики щодо експортних цін на українські зернові та олійні культури.",
      ],
      sections: [
        {
          title: "1. Хто ми",
          paragraphs: [
            "UGA Index функціонує для Української зернової асоціації.",
            "Контакти:\nУкраїнська зернова асоціація\nУкраїна, 01133, Київ,\nвул. Євгена Коновальця, 36Д,\n6 поверх",
            "E-mail:\ninbox@uga.ua",
          ],
        },
        {
          title: "2. Яку інформацію ми можемо збирати",
          paragraphs: [
            "Залежно від способу використання платформи ми можемо збирати:",
          ],
          bullets: [
            "облікові та доступові дані, зокрема ім’я, email, роль, компанію та метадані входу;",
            "інформацію респондентів, включно з назвою компанії та поданими ціновими індикативами;",
            "технічну інформацію, зокрема IP-адресу, тип браузера, тип пристрою, відвідані сторінки та журнали доступу;",
            "налаштування користувача, зокрема мову, тему та валюту відображення;",
            "повідомлення, які ви надсилаєте нам;",
            "інформацію, пов’язану з аналітикою або підпискою, якщо платні сервіси будуть запроваджені в майбутньому.",
          ],
        },
        {
          title: "3. Як ми використовуємо інформацію",
          paragraphs: ["Ми використовуємо інформацію для того, щоб:"],
          bullets: [
            "забезпечувати роботу та безпеку платформи UGA Index;",
            "збирати, перевіряти та адмініструвати подання респондентів;",
            "розраховувати та публікувати агреговані значення індексу;",
            "надавати публічну ринкову інформацію та аналітику;",
            "керувати доступом користувачів та внутрішніми процесами;",
            "покращувати платформу та користувацький досвід;",
            "відповідати на запити та повідомлення;",
            "виконувати юридичні, регуляторні та безпекові вимоги.",
          ],
        },
        {
          title: "4. Дані респондентів",
          paragraphs: [
            "Індивідуальні подання респондентів використовуються для розрахунку індексу та операційної перевірки. У публічному доступі відображаються лише агреговані значення індексу. Індивідуальні дані компаній не розкриваються публічно, якщо інше не погоджено окремо або не вимагається законом.",
          ],
        },
        {
          title: "5. Cookies та local storage",
          paragraphs: [
            "Платформа може використовувати cookies або local storage для необхідних функцій, зокрема вибору мови, теми, валюти відображення та керування сесією. Якщо будуть додані додаткові аналітичні, маркетингові або платіжні інструменти, ця політика може бути оновлена.",
          ],
        },
        {
          title: "6. Передача інформації",
          paragraphs: ["Ми можемо передавати інформацію:"],
          bullets: [
            "співробітникам Української зернової асоціації та уповноваженим адміністраторам;",
            "технологічним провайдерам, які підтримують хостинг, інфраструктуру, безпеку або роботу платформи;",
            "партнерам проєкту, якщо це необхідно для роботи платформи або верифікації;",
            "юридичним або регуляторним органам, якщо це вимагається законом.",
          ],
          paragraphsAfter: ["Ми не продаємо персональні дані."],
        },
        {
          title: "7. Зберігання даних",
          paragraphs: [
            "Ми зберігаємо інформацію лише стільки, скільки необхідно для цілей, описаних у цій політиці, включно з роботою платформи, audit trail, безпекою, юридичними зобов’язаннями та governance методології.",
          ],
        },
        {
          title: "8. Міжнародна обробка",
          paragraphs: [
            "Платформа може використовувати хостинг та технологічних провайдерів у різних юрисдикціях. Там, де це необхідно, мають застосовуватися відповідні гарантії для міжнародної обробки або передачі персональних даних.",
          ],
        },
        {
          title: "9. Ваші права",
          paragraphs: [
            "Залежно від застосовного законодавства, ви можете мати право запитувати доступ до своїх персональних даних, їх виправлення, видалення, обмеження обробки або заперечення проти обробки. Для подання запиту звертайтеся на inbox@uga.ua.",
          ],
        },
        {
          title: "10. Безпека",
          paragraphs: [
            "Ми застосовуємо розумні технічні та організаційні заходи для захисту інформації. Водночас жодна онлайн-платформа не може гарантувати абсолютну безпеку.",
          ],
        },
        {
          title: "11. Зміни до політики",
          paragraphs: [
            "Ми можемо час від часу оновлювати цю Політику конфіденційності. Оновлена версія буде опублікована на цій сторінці із зазначенням нової дати.",
          ],
        },
      ],
    },
    terms: {
      title: "Умови використання",
      description: "Умови використання UGA Index",
      lastUpdated: "Останнє оновлення: травень 2026",
      intro: [
        "Ці Умови використання регулюють доступ до платформи UGA Index та її використання, включно з публічними значеннями індексу, аналітикою, процесами для респондентів, embedded-віджетами та пов’язаним контентом.",
        "Користуючись платформою, ви погоджуєтеся з цими Умовами.",
      ],
      sections: [
        {
          title: "1. Призначення платформи",
          paragraphs: [
            "UGA Index надає інформаційні та аналітичні матеріали щодо бенчмарків експортних цін на українські зернові та олійні культури. Платформа може містити публічні значення індексу, інформацію про методологію, аналітику, процеси для респондентів та майбутній API-доступ.",
          ],
        },
        {
          title: "2. Лише інформаційне використання",
          paragraphs: [
            "Уся інформація на платформі надається виключно з інформаційною та аналітичною метою. Вона не є інвестиційною порадою, торговою порадою, юридичною порадою, податковою порадою, публічною офертою або рекомендацією купувати чи продавати будь-який товар.",
          ],
        },
        {
          title: "3. Значення індексу та методологія",
          paragraphs: [
            "Значення UGA Index розраховуються та публікуються відповідно до застосовної методології. Публічні результати є агрегованими. Індивідуальні подання респондентів не публікуються, якщо інше не погоджено окремо або не вимагається законом.",
          ],
        },
        {
          title: "4. Облікові записи та доступ",
          paragraphs: [
            "Окремі частини платформи можуть вимагати входу або призначеної ролі доступу. Користувачі відповідають за безпеку своїх облікових даних та за всі дії, виконані через їхній обліковий запис.",
          ],
        },
        {
          title: "5. Подання респондентів",
          paragraphs: [
            "Респонденти повинні бути уповноважені подавати інформацію від імені своєї компанії. Подані значення мають надаватися добросовісно та відповідати релевантним критеріям ринкової оцінки. Будь-які спроби маніпулювати, спотворювати або неправомірно використовувати процес індексу заборонені.",
          ],
        },
        {
          title: "6. Аналітика та API",
          paragraphs: [
            "Функціонал аналітики та API може надаватися у форматі попереднього доступу, доступу для членів або платної підписки. Доступність, обсяг, ціни та технічні умови можуть змінюватися з часом.",
          ],
        },
        {
          title: "7. Інтелектуальна власність",
          paragraphs: [
            "Дизайн платформи, контент, матеріали методології, подання даних, тексти, графіка та програмне забезпечення захищені правами інтелектуальної власності. Ви не можете копіювати, відтворювати, поширювати, скрейпити, перепродавати або комерційно використовувати платформу чи її дані без попереднього письмового дозволу, крім випадків, прямо дозволених.",
          ],
        },
        {
          title: "8. Embedded-віджети",
          paragraphs: [
            "Якщо UGA Index надає embed-код або віджети, вони можуть використовуватися лише у наданій формі та з видимою атрибуцією. Платформа може змінити, призупинити або відкликати доступ до віджетів.",
          ],
        },
        {
          title: "9. Сторонні посилання",
          paragraphs: [
            "Платформа може містити посилання на сторонні вебсайти. UGA Index не відповідає за контент, доступність або політики сторонніх вебсайтів.",
          ],
        },
        {
          title: "10. Доступність та зміни",
          paragraphs: [
            "Ми можемо оновлювати, призупиняти, обмежувати або припиняти роботу будь-якої частини платформи в будь-який час. Ми не гарантуємо безперебійну або безпомилкову роботу.",
          ],
        },
        {
          title: "11. Обмеження відповідальності",
          paragraphs: [
            "У максимальному обсязі, дозволеному законом, UGA Index, Українська зернова асоціація, партнери проєкту та технологічні провайдери не несуть відповідальності за збитки, шкоду або рішення, що виникають внаслідок використання платформи, значень індексу, аналітики, сценарних результатів або пов’язаних матеріалів.",
          ],
        },
        {
          title: "12. Застосовне право",
          paragraphs: [
            "Ці Умови передбачають застосування законодавства України, якщо інше не вимагається застосовним правом або не погоджено письмово.",
          ],
        },
        {
          title: "13. Контакти",
          paragraphs: ["З питань щодо цих Умов звертайтеся на inbox@uga.ua."],
        },
      ],
    },
    "risk-disclosure": {
      title: "Розкриття ризиків",
      description: "Розкриття ризиків UGA Index",
      lastUpdated: "Останнє оновлення: травень 2026",
      intro: [
        "Це Розкриття ризиків пояснює важливі обмеження та ризики, пов’язані з використанням значень UGA Index, аналітики, сценарних результатів та пов’язаних даних.",
      ],
      sections: [
        {
          title: "1. Інформаційна мета",
          paragraphs: [
            "Значення UGA Index та аналітика надаються виключно з інформаційною та аналітичною метою. Вони не є інвестиційною порадою, торговою порадою, публічною офертою або рекомендацією купувати чи продавати будь-який товар.",
          ],
        },
        {
          title: "2. Ризики товарного ринку",
          paragraphs: [
            "Ціни на аграрні товари можуть швидко змінюватися через попит і пропозицію, погоду, логістику, доступ до портів, фрахт, страхування, валютне середовище, геополітичні події, регулювання та глобальну ринкову ситуацію. Минулі значення не гарантують майбутніх рівнів цін.",
          ],
        },
        {
          title: "3. Обмеження бенчмарку",
          paragraphs: [
            "Значення UGA Index базуються на даних респондентів та правилах методології. Хоча методологія спрямована на прозорість і сталість, значення індексу можуть залежати від доступності даних, покриття респондентів, ліквідності ринку, часу подання, правил валідації та операційних факторів.",
          ],
        },
        {
          title: "4. Затримки та помилки даних",
          paragraphs: [
            "Платформа може містити затримані, неповні або некоректні дані. Значення можуть перевірятися до публікації. Після публікації значення мають фіксуватися відповідно до методології, проте технічні або операційні проблеми все одно можуть виникати.",
          ],
        },
        {
          title: "5. Зовнішні індикативи",
          paragraphs: [
            "Зовнішні ринкові індикативи, включно з індикативами партнерів, можуть відображатися як довідкова інформація. Вони не повинні вважатися офіційними значеннями UGA Index, якщо прямо не опубліковані як такі.",
          ],
        },
        {
          title: "6. Валютний ризик",
          paragraphs: [
            "Офіційні значення UGA Index публікуються в USD/т. Значення в UAH/т та EUR/т є перерахунком для відображення на основі обраних валютних курсів. Валютні коливання можуть суттєво змінювати перераховані значення.",
          ],
        },
        {
          title: "7. Сценарна аналітика",
          paragraphs: [
            "Будь-які AI-assisted або модельні сценарні результати є лише аналітичним попереднім переглядом. Вони не є гарантованими прогнозами та не повинні використовуватися як передбачення майбутніх цін.",
          ],
        },
        {
          title: "8. Відповідальність користувача",
          paragraphs: [
            "Користувачі самостійно відповідають за свої комерційні, торгові, фінансові та ризик-менеджмент рішення. Перед прийняттям рішень користувачі повинні самостійно перевіряти інформацію та, за потреби, звертатися за професійною консультацією.",
          ],
        },
        {
          title: "9. Обмеження відповідальності",
          paragraphs: [
            "У максимальному обсязі, дозволеному законом, UGA Index, Українська зернова асоціація, партнери проєкту та технологічні провайдери не несуть відповідальності за збитки або шкоду, що виникають через покладання на значення індексу, аналітику, сценарні результати, валютні перерахунки, API-дані або інші матеріали платформи.",
          ],
        },
      ],
    },
  },
};
