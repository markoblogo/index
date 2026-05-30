import type { Locale } from "@/lib/i18n";

export type BlogPost = {
  body: string[];
  coverImage: string;
  excerpt: string;
  language: BlogPostLanguage;
  publishedAt: string;
  readingMinutes: number;
  seoDescription: string;
  seoTitle: string;
  slug: string;
  tags: string[];
  title: string;
};

export type BlogPostLanguage = "en" | "uk";

export const spikeBlogPosts: BlogPost[] = [
  {
    body: [
      "Ми додали на сайт SPIKE Spot Index новий матеріал у розділ About: безкоштовну книгу Spot Market Handbook: How Ukrainian Agricultural Prices Actually Work.",
      "Spot Market Handbook: практичний гід по українському фізичному аграрному ринку",
      "Це практичний гід українською мовою про те, як насправді формується ціна на фізичному аграрному ринку України: від локальних котирувань і базисів поставки до спотових індексів, логістики, ліквідності та майбутньої індексної торгівлі.",
      "Книгу можна завантажити у двох форматах:",
      "PDF: https://spike.1d3x.com/files/spot-market-handbook-ua.pdf",
      "EPUB: https://spike.1d3x.com/files/spot-market-handbook-ua.epub",
      "Чому ця книга важлива",
      "Український аграрний ринок не працює як проста біржова таблиця.",
      "Одна й та сама культура може мати різну ціну залежно від базису поставки, маршруту, порту, логістичних витрат, доступу до ліквідності, валюти, ризику виконання та поточного попиту з боку експортерів або переробників.",
      "Саме тому фраза “ціна на кукурудзу” майже ніколи не є достатньо точною.",
      "Потрібно розуміти: де ця ціна формується, на якому базисі, за яким маршрутом, з якою ліквідністю і наскільки вона є репрезентативною для ринку.",
      "Spot Market Handbook пояснює цю логіку простою мовою.",
      "Про що книга",
      "У книзі розглянуто ключові поняття фізичного commodity market:",
      "- чому локальний ринок не дорівнює біржі.",
      "- як працюють FOB, CPT, farmgate та інші базиси.",
      "- що таке spot market на практиці.",
      "- чим відрізняються indicative, bid, offer та executed trade.",
      "- чому ринок без індексу живе в інформаційному шумі.",
      "- як респондентська модель допомагає ринку говорити сам про себе.",
      "- чому медіана часто корисніша за середнє арифметичне.",
      "- як працює фільтрація викидів.",
      "- чому “немає даних” іноді є важливою ринковою інформацією.",
      "- що таке basis risk.",
      "- як спотовий індекс поступово стає частиною ринкової інфраструктури.",
      "- як індекси можуть розвиватися у напрямку API, аналітики, сценарних моделей та індексної торгівлі.",
      "Окрему увагу приділено практичним кейсам: коли Chicago Futures зростають, а FOB Black Sea слабшає; як обмеження портового доступу розширює basis; чому маршрути через Дунай і Велику Одесу мають різну економіку; як медіана захищає benchmark від аномальної котирки; і чому зрілий індекс іноді краще не публікувати, якщо ринок занадто тонкий.",
      "Як це пов’язано зі SPIKE Spot Index",
      "SPIKE Spot Index створений саме для того, щоб зробити український фізичний аграрний ринок більш читабельним.",
      "Його завдання не в тому, щоб замінити трейдера, брокера або ринкову експертизу.",
      "Його завдання — дати ринку структуровану щоденну reference point.",
      "Спотовий індекс допомагає бачити не лише окрему ціну, а й напрямок руху ринку, динаміку базисів, спредів, ліквідності та локальної ринкової структури.",
      "Для трейдерів це операційний шар щоденної роботи.",
      "Для аналітиків — база для історичних порівнянь і сценарних моделей.",
      "Для компаній — потенційна основа для контрактів, risk management, API-інтеграцій і майбутньої індексної торгівлі.",
      "Навіщо читати цей гід",
      "Ця книга буде корисною для трейдерів, брокерів, експортерів, переробників, агровиробників, аналітиків, інвесторів і всіх, хто хоче краще зрозуміти, як працює український фізичний ринок зернових та олійних культур.",
      "Вона не є академічним підручником.",
      "Це практичний текст про реальний ринок, де ціна народжується не в одному місці, а на перетині логістики, ліквідності, ризику, переговорів і даних.",
      "І саме тому спотові індекси стають важливими.",
      "Вони не прибирають ризик.",
      "Вони роблять його видимим.",
      "Завантажити книгу:",
      "PDF: https://spike.1d3x.com/files/spot-market-handbook-ua.pdf",
      "EPUB: https://spike.1d3x.com/files/spot-market-handbook-ua.epub",
    ],
    coverImage:
      "/blog/spot-market-handbook-practical-guide-ukrainian-physical-agri-market.png",
    excerpt:
      "Практичний гід українською про те, як формується ціна на фізичному аграрному ринку України та чому спотові індекси стають важливими.",
    language: "uk",
    publishedAt: "2026-05-31",
    readingMinutes: 10,
    seoDescription:
      "Практичний гід про механіку формування цін на українському фізичному аграрному ринку та роль спотових індексів для трейдерів і аналітики.",
    seoTitle: "Spot Market Handbook: практичний гід по українському фізичному аграрному ринку",
    slug: "spot-market-handbook-practical-guide-ukrainian-physical-agri-market",
    tags: [
      "Spot Market Handbook",
      "spot index",
      "market data",
      "Ukraine",
      "grain market",
      "Spike Brokers",
    ],
    title:
      "Spot Market Handbook: практичний гід по українському фізичному аграрному ринку",
  },
  {
    body: [
      "На українському зерновому ринку щодня з’являються сотні котирувань. Частина з них відображає реальну готовність купити або продати. Частина є лише індикативом. Частина виникає з переговорної тактики, локального дефіциту, логістичного обмеження або бажання “посунути” ринок у потрібний бік.",
      "Саме тому досвідчений трейдер або закупівельник після обіду не дивиться на одну цифру. Він піднімає телефон, проходить 10-20 контактів, зіставляє базиси, якість, строки поставки, обсяги, репутацію контрагента і лише після цього формує робоче уявлення про ринок.",
      "Проблема в тому, що така інформація часто залишається хаотичною. Вона є, але не структурована. Вона корисна, але її важко порівнювати день до дня. Саме тут виникає потреба у спотовому індексі: не як у “чарівній ціні”, а як у систематизованій референтній точці.",
      "Чому простого середнього недостатньо",
      "На перший погляд, найпростіший спосіб розрахувати індекс — взяти всі подані ціни й порахувати середнє арифметичне. Але в реальному ринку це слабке місце.",
      "Якщо більшість респондентів показує близький рівень, а одна ціна різко відрізняється, середнє арифметичне одразу зміщується. Один екстремальний рівень може “потягнути” фінальне значення вгору або вниз, навіть якщо решта ринку такого руху не підтверджує.",
      "Медіана працює інакше. Вона показує центральну точку вибірки, а не середнє всіх значень. Якщо одна ціна занадто висока або занадто низька, медіана залишається стійкішою. Для спотового індексу це критично, тому що його завдання — показати ринковий центр, а не піддатися одній крайній заявці.",
      "Навіщо потрібен фільтр ±2%",
      "Медіана сама по собі вже допомагає побачити, де знаходиться основна маса ринку. Але для індексу цього мало. Потрібно ще зрозуміти, які значення не повинні впливати на публікацію.",
      "Саме для цього використовується фільтрація відхилень. Якщо подана ціна відрізняється від медіани більш ніж на встановлений поріг, наприклад ±2%, вона не потрапляє до фінального розрахунку. Після цього індекс рахується вже не по “сирій” вибірці, а по очищених даних.",
      "Це не складна академічна статистика заради статистики. Це проста практична логіка трейдера, перенесена в систему: спочатку зрозуміти, де ринковий центр, потім відкинути очевидні крайнощі, а вже потім рахувати фінальне значення.",
      "Що робити з різким відхиленням",
      "Коли одна з цін різко відрізняється від медіани, це не завжди означає маніпуляцію. Іноді це може бути реальна угода: останній трейд дня, нетиповий обсяг, специфічна якість, термінова потреба покупця або локальна логістична перевага.",
      "Але для публічного індексу важливо інше питання: чи підтверджує це весь ринок?",
      "Якщо більшість респондентів стоїть близько один до одного, а одна ціна випадає далеко за межі вибірки, індекс не повинен автоматично “падати” або “злітати” через це значення. Медіана плюс фільтр викидів дають відповідь: це може бути цікава ринкова подія, але не обов’язково новий ринковий рівень.",
      "У цьому сенсі фільтр не приховує ринок. Навпаки, він показує, наскільки ринок згуртований навколо певного рівня.",
      "Чому корзина не завжди публікується",
      "Окрема важлива тема — вузькі ринки. Не всі базиси, культури і лоти однаково ліквідні. На одних напрямках щодня є активний потік заявок і угод. На інших ринок може бути фактично “тонким”: мало учасників, мало реальних котирувань, слабка торгова активність.",
      "Якщо на певному базисі немає мінімальної кількості валідних респондентів, корзина не повинна публікуватися як повноцінний індекс. Це не недолік системи. Це ознака чесності.",
      "Краще не опублікувати значення, ніж створити ілюзію ліквідного ринку там, де даних недостатньо. Для користувача це теж важливий сигнал: тут або ринок не торгується достатньо активно, або поки немає достатнього масиву даних для надійної публікації.",
      "Для чого це респондентам і трейдерам",
      "Сильний індекс будується не на одній-двох “унікальних” цифрах. Він будується на дисципліні подання даних, повторюваності методології і достатній кількості респондентів.",
      "Для респондентів це означає просту річ: важливо подавати не бажану, не тактичну і не випадкову ціну, а реальний ринковий рівень, який компанія готова захищати як свою оцінку дня.",
      "Для трейдерів це означає інше: індекс варто читати не як заміну власному market view, а як якір для перевірки цього view. Якщо ваш ринковий рівень сильно відрізняється від індексу, це не завжди означає, що ви помиляєтесь. Але це точно означає, що варто поставити додаткові запитання.",
      "Саме тому медіана, фільтр викидів і мінімальна кількість респондентів роблять спотовий індекс сильнішим. Вони не дозволяють індексу “впасти у слабких руках” однієї випадкової ціни, але залишають його достатньо чутливим до реального ринкового руху.",
      "У нормальному ринку дані мають не просто існувати. Вони мають бути структуровані, перевірені і зрозумілі. Саме це і є головна функція щоденного спотового індексу.",
    ],
    coverImage: "/blog/median-vs-average-spot-indices.png",
    excerpt:
      "На хаотичному ринку одна “дивна” ціна може зламати картину. Медіанна фільтрація допомагає відділити ринковий сигнал від шуму.",
    language: "uk",
    publishedAt: "2026-05-27",
    readingMinutes: 8,
    seoDescription:
      "Пояснення, чому медіана, фільтр викидів і мінімальна кількість респондентів роблять спотовий індекс стійкішим до випадкових цін.",
    seoTitle:
      "Медіана vs середнє арифметичне: чому спотові індекси не падають у слабких руках",
    slug: "median-vs-average-spot-indices",
    tags: [
      "spot index",
      "медіана",
      "зерновий ринок",
      "Україна",
      "commodity data",
      "price discovery",
      "Spike Brokers",
    ],
    title:
      "Медіана vs середнє арифметичне: чому спотові індекси не падають у слабких руках",
  },
  {
    body: [
      "Війна зробила український зерновий експорт значно менш передбачуваним. Те, що раніше було відносно зрозумілою логістичною моделлю, сьогодні постійно змінюється: доступність портів, маршрути через Дунай, Балтику або західні переходи, вартість фрахту, страхування, черги, ризики затримок і щоденні операційні обмеження.",
      "У таких умовах ринок особливо потребує не стільки прогнозу, скільки надійної точки відліку. Саме тут daily spot index стає корисним інструментом. Він не обіцяє сказати, якою буде ціна завтра. Його завдання інше: показати, де ринок знаходиться сьогодні, на основі зіставних щоденних даних.",
      "Для трейдера важливо бачити не лише одну поточну ціну, а й її рух у динаміці. Порівняння значення індексу з попередніми 3-5 торговими днями допомагає відрізнити короткий шум від реального тренду. Якщо разове значення виглядає різким, але кілька днів поспіль підтверджують напрямок, це вже інший рівень сигналу.",
      "Окремо важливо питання аномалій. Якщо спотовий індекс різко падає або зростає, ринок одразу ставить логічне запитання: це справжній ціновий сигнал чи випадкове відхилення? Методологія з медіанною перевіркою, фільтром відхилень і мінімальною кількістю респондентів фактично дає першу відповідь ще до публікації значення.",
      "Саме тому платні спот-дані залишаються цінними навіть у період максимальної невизначеності. Вони не прибирають ризик, але зменшують інформаційний хаос. Для трейдерів, експортерів, переробників і фінансових контрагентів це може бути різницею між рішенням “на відчутті” і рішенням, прив’язаним до зрозумілого ринкового орієнтира.",
      "Публічний індекс має ще одну важливу функцію: він може бути корисним як нейтральна референтна база у контрактах, переговорах, спорах, арбітражі або внутрішньому ризик-менеджменті. Коли сторони використовують один і той самий прозорий індикатор, їм простіше пояснювати логіку ціноутворення.",
      "У воєнний час ринок не стає менш ринковим. Він стає складнішим. І саме тому якісні щоденні спот-дані стають не додатковою зручністю, а частиною робочої інфраструктури торгівлі.",
    ],
    coverImage: "/blog/why-traders-pay-for-spot-data-during-war.png",
    excerpt:
      "У період високої невизначеності daily spot index стає не прогнозом, а робочою референтною точкою для ринку.",
    language: "uk",
    publishedAt: "2026-05-27",
    readingMinutes: 4,
    seoDescription:
      "Чому daily spot index залишається важливою референтною точкою для трейдерів українського аграрного ринку у воєнний час.",
    seoTitle:
      "Чому трейдери продовжують платити за спот-дані під час воєнного часу",
    slug: "why-traders-pay-for-spot-data-during-war",
    tags: [
      "spot index",
      "grain market",
      "Ukraine",
      "commodity trading",
      "price data",
      "Spike Brokers",
    ],
    title:
      "Чому трейдери продовжують платити за спот-дані під час воєнного часу",
  },
  {
    body: [
      "Ukraine's agricultural export market moves quickly. Prices are influenced by global commodity trends, port logistics, freight costs, currency movements, local supply, farmer selling activity and daily trade flow.",
      "In such an environment, market participants need more than scattered quotes or one-off conversations. They need a clear daily reference point that helps them compare price levels across commodities, bases and market segments.",
      "The SPIKE SPOT INDEX is designed to provide that reference. It brings together spot market information into a structured daily format, showing index values for key Ukrainian agricultural commodities across relevant export and processing bases.",
      "The purpose is not to replace negotiation or individual market judgment. Instead, the index gives producers, traders, processors, analysts and institutions a common benchmark for reading the market.",
      "A transparent daily index can help reduce information gaps, improve price discovery and make market discussion more disciplined. For a market as important and dynamic as Ukraine's, this kind of reference is becoming increasingly necessary.",
    ],
    coverImage: "/blog/why-ukraine-needs-daily-spot-commodity-index.png",
    excerpt:
      "A daily spot index helps market participants read Ukrainian grain and oilseed price levels with more structure, transparency and consistency.",
    language: "en",
    publishedAt: "2026-05-22",
    readingMinutes: 3,
    seoDescription:
      "A short overview of why daily spot commodity indices matter for Ukrainian grain and oilseed markets.",
    seoTitle: "Why Ukraine Needs a Daily Spot Index",
    slug: "why-ukraine-needs-daily-spot-commodity-index",
    tags: [
      "Market index",
      "Ukraine",
      "Grain market",
      "Price discovery",
      "Spike Brokers",
    ],
    title: "Why Ukraine Needs a Daily Spot Index",
  },
  {
    body: [
      "Commodity markets generate a large amount of daily information: bids, offers, indicative levels, completed trades, logistics updates and currency movements. Without structure, this information can be difficult to compare.",
      "A spot index helps turn daily market signals into a more readable format. By publishing values for selected commodities and bases, the index gives users a clearer view of where the market stands at a specific point in time.",
      "For Ukrainian grain and oilseed markets, this is especially useful because price formation depends on several moving parts at once. Export demand, port availability, delivery basis, quality parameters and processing demand can all affect the final price level.",
      "The value of a spot index is in consistency. When the same methodology is applied every day, market participants can track movement over time, compare commodities and identify changes in direction more easily.",
      "The SPIKE SPOT INDEX is built to support this kind of daily market reading. It provides a compact view of current values while leaving space for deeper analytics, historical comparison and future data products.",
      "As with any market data, index values should be used as information, not as a trading instruction. The strongest use case is as a disciplined reference point for analysis, discussion and decision-making.",
    ],
    coverImage: "/blog/how-spot-indices-help-read-daily-grain-market-movement.png",
    excerpt:
      "Spot indices do not predict the market. They help organize daily price information into a clearer benchmark.",
    language: "en",
    publishedAt: "2026-05-22",
    readingMinutes: 4,
    seoDescription:
      "A brief explanation of how spot commodity indices help organize daily Ukrainian grain market information.",
    seoTitle: "How Spot Indices Help Read Daily Grain Market Movement",
    slug: "how-spot-indices-help-read-daily-grain-market-movement",
    tags: [
      "Spot index",
      "Grain prices",
      "Ukraine exports",
      "Commodity analytics",
      "Market data",
    ],
    title: "How Spot Indices Help Read Daily Grain Market Movement",
  },
];

export function getBlogPost(slug: string) {
  return spikeBlogPosts.find((post) => post.slug === slug) ?? null;
}

export function getBlogTags() {
  return [...new Set(spikeBlogPosts.flatMap((post) => post.tags))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getBlogLabels(locale: Locale) {
  if (locale === "uk") {
    return {
      allPosts: "Усі пости",
      blog: "Блог",
      copy: "Копіювати",
      copied: "Скопійовано",
      empty: "Нічого не знайдено. Спробуйте інший запит або тег.",
      latest: "Останні матеріали",
      languageAll: "Усі мови",
      languageEn: "EN",
      languageFilter: "Мова матеріалів",
      languageUk: "UK",
      minutes: "хв читання",
      published: "Опубліковано",
      read: "Читати",
      search: "Пошук",
      searchPlaceholder: "Пошук за темою, тегом або текстом",
      share: "Поділитися",
      subtitle:
        "Market notes, methodology context and practical explanations for the SPIKE SPOT INDEX.",
      tagCloud: "Хмара тегів",
      title: "Блог SPIKE SPOT INDEX",
    } as const;
  }

  return {
    allPosts: "All posts",
    blog: "Blog",
    copy: "Copy",
    copied: "Copied",
    empty: "No posts found. Try another query or tag.",
    latest: "Latest articles",
    languageAll: "All languages",
    languageEn: "EN",
    languageFilter: "Article language",
    languageUk: "UK",
    minutes: "min read",
    published: "Published",
    read: "Read",
    search: "Search",
    searchPlaceholder: "Search by topic, tag or article text",
    share: "Share",
    subtitle:
      "Market notes, methodology context and practical explanations for the SPIKE SPOT INDEX.",
    tagCloud: "Tag cloud",
    title: "SPIKE SPOT INDEX Blog",
  } as const;
}
