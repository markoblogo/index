import type { Locale } from "@/lib/i18n";

export type IndexTenantId = "uga-ua" | "spike-ua";

export const MN7R_MONITOR_RESPONDENT_ID = "MN7R_MONITOR";
export const SPIKE_ADMIN_FALLBACK_RESPONDENT_ID = "SPIKE_ADMIN_FALLBACK";

export type IndexCommodityGroup = "export" | "processing";
export type SpikeCommodityCategory =
  | "all-seasons"
  | "processors"
  | "seasonal-export";
export type MediaHubWindow = "daily" | "weekly" | "monthly";
export type MediaHubMarketScope = "ukraine" | "global";
export type MediaHubSourceLanguage = "uk" | "en";

export type MediaHubLocalePolicy = {
  locale: Locale;
  marketScope: MediaHubMarketScope;
  sourceLanguage: MediaHubSourceLanguage;
  summaryLanguage: MediaHubSourceLanguage;
  audienceLabel: string;
};

export type MediaHubConfig = {
  enabled: boolean;
  brandName: string;
  publicLabel: Record<Locale, string>;
  windows: MediaHubWindow[];
  localePolicies: MediaHubLocalePolicy[];
};

export type IndexCommodityConfig = {
  id: string;
  code: string;
  dbCode: string;
  deliveryBasisCode?: string;
  marker: string;
  name: Record<Locale, string>;
  shortName: Record<Locale, string>;
  group: IndexCommodityGroup;
  category?: SpikeCommodityCategory;
  sortOrder: number;
  basePrice: number;
  absoluteChange: number;
  percentChange: number;
  sparkline: number[];
  vatIncluded?: boolean;
  detailMetrics?: Array<{
    label: Record<Locale, string>;
    value: Record<Locale, string>;
  }>;
};

export type IndexConfig = {
  id: IndexTenantId;
  name: string;
  legalName: Record<Locale, string>;
  publicSiteUrl: string;
  brandUrl: string;
  logoPath?: string;
  logoHeaderPath?: string;
  defaultDeliveryBasis: string;
  heroDeliveryBasis?: string;
  defaultDeliveryPeriod: string;
  currency: "USD";
  unit: "t";
  localeCookie: string;
  storagePrefix: string;
  methodologyPdfPath: string;
  features: {
    externalIndicative: boolean;
    memberArea: boolean;
  };
  mediaHub: MediaHubConfig;
  theme: {
    dataAttribute: string;
  };
  home: {
    subtitle: Record<Locale, string>;
    trustStrip: Record<Locale, string>;
    heroTitle: Record<Locale, string>;
    editorialLine: Record<Locale, string>;
    boardKicker: Record<Locale, string>;
    facts: Record<Locale, Array<{ value: string; label: string }>>;
    officialNotice: Record<Locale, string>;
    footerDemo: Record<Locale, string>;
    partnersLine: Record<Locale, string>;
  };
  contacts: {
    address: Record<Locale, string[]>;
    phones: string[];
    email: string;
    social: Array<{ label: string; href: string; mark: string }>;
  };
  deliveryBases: Array<{
    code: string;
    name: string;
    region: string;
    basketCode: string;
    basketName: string;
  }>;
  respondents: Array<{
    collectionMode?: "self_service" | "telegram_request" | "manual_outreach";
    id: string;
    legalName: string;
    seedAuthContact?: boolean;
  }>;
  commodities: IndexCommodityConfig[];
};

const ugaCommodities: IndexCommodityConfig[] = [
  {
    id: "corn",
    code: "CORN",
    dbCode: "CORN",
    marker: "C",
    name: { uk: "Кукурудза", en: "Corn" },
    shortName: { uk: "Кукурудза", en: "Corn" },
    group: "export",
    sortOrder: 1,
    basePrice: 214,
    absoluteChange: 2,
    percentChange: 0.8,
    sparkline: [209, 211, 210, 213, 214],
  },
  {
    id: "wheat-115",
    code: "WHT 11.5",
    dbCode: "WHT_115",
    marker: "W",
    name: { uk: "Пшениця 11.5pro", en: "Wheat 11.5% protein" },
    shortName: { uk: "Пшениця", en: "Wheat" },
    group: "export",
    sortOrder: 2,
    basePrice: 231,
    absoluteChange: 3,
    percentChange: 1.2,
    sparkline: [226, 228, 229, 230, 231],
  },
  {
    id: "feed-wheat",
    code: "FEED WHT",
    dbCode: "FEED_WHT",
    marker: "F",
    name: { uk: "Пшениця фураж", en: "Feed wheat" },
    shortName: { uk: "Фураж", en: "Feed" },
    group: "export",
    sortOrder: 3,
    basePrice: 206,
    absoluteChange: -1,
    percentChange: -0.4,
    sparkline: [209, 208, 207, 207, 206],
  },
  {
    id: "gmo-soybean",
    code: "GMO SOY",
    dbCode: "GMO_SOY",
    marker: "S",
    name: { uk: "Соя ГМО", en: "GMO soybean" },
    shortName: { uk: "Соя", en: "Soy" },
    group: "processing",
    sortOrder: 4,
    basePrice: 418,
    absoluteChange: 2,
    percentChange: 0.5,
    sparkline: [414, 415, 417, 416, 418],
  },
];

const spikeCommodities: IndexCommodityConfig[] = [
  {
    id: "corn",
    code: "CORN",
    dbCode: "CORN",
    marker: "C",
    name: { uk: "Кукурудза", en: "Corn" },
    shortName: { uk: "Кукурудза", en: "Corn" },
    group: "export",
    category: "all-seasons",
    sortOrder: 1,
    basePrice: 229,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [225, 226, 227, 228, 229, 229, 229],
    detailMetrics: [
      { label: { uk: "Якість", en: "Quality" }, value: { uk: "експорт", en: "export" } },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Одеса", en: "CPT Odesa" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "wheat-115",
    code: "WHT 11.5",
    dbCode: "WHT_115",
    marker: "W",
    name: { uk: "Продовольча пшениця", en: "Milling Wheat" },
    shortName: { uk: "Продовольча пшениця", en: "Milling Wheat" },
    group: "export",
    category: "all-seasons",
    sortOrder: 2,
    basePrice: 222,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [221, 221, 222, 222, 222, 222, 222],
    detailMetrics: [
      { label: { uk: "Якість", en: "Quality" }, value: { uk: "11.5% білок", en: "11.5% protein" } },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Одеса", en: "CPT Odesa" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "feed-wheat",
    code: "FEED WHT",
    dbCode: "FEED_WHT",
    marker: "F",
    name: { uk: "Пшениця фураж", en: "Feed wheat" },
    shortName: { uk: "Фураж", en: "Feed" },
    group: "export",
    category: "all-seasons",
    sortOrder: 3,
    basePrice: 219,
    absoluteChange: 1,
    percentChange: 0.5,
    sparkline: [216, 217, 217, 218, 218, 219, 219],
    detailMetrics: [
      { label: { uk: "Якість", en: "Quality" }, value: { uk: "експорт", en: "export" } },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Одеса", en: "CPT Odesa" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "corn-fca-chop",
    code: "CORN FCA CHOP",
    dbCode: "CORN_FCA_CHOP",
    deliveryBasisCode: "FCA_CHOP_EXPORT",
    marker: "C",
    name: { uk: "Кукурудза FCA Чоп", en: "Corn FCA Chop" },
    shortName: { uk: "Кукурудза Чоп", en: "Corn Chop" },
    group: "export",
    category: "all-seasons",
    sortOrder: 4,
    basePrice: 216,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [214, 215, 215, 216, 216, 216, 216],
    detailMetrics: [
      { label: { uk: "Якість", en: "Quality" }, value: { uk: "експорт", en: "export" } },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "FCA Чоп", en: "FCA Chop" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "кордон експорт", en: "border export" } },
    ],
  },
  {
    id: "gmo-soybean",
    code: "GMO SOY",
    dbCode: "GMO_SOY",
    marker: "S",
    name: { uk: "Соя ГМО", en: "GMO soybean" },
    shortName: { uk: "Соя", en: "Soy" },
    group: "processing",
    category: "processors",
    sortOrder: 5,
    basePrice: 504,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [501, 502, 503, 504, 504, 504, 504],
    vatIncluded: true,
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "37% білка, ГМО, на суху речовину",
          en: "37% protein, GMO, dry matter",
        },
      },
      {
        label: { uk: "Базис", en: "Basis" },
        value: { uk: "СРТ завод", en: "CPT Crush" },
      },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "переробка", en: "processing" } },
    ],
  },
  {
    id: "sunflower",
    code: "SUN",
    dbCode: "SUNFLOWER",
    marker: "SF",
    name: { uk: "Соняшник", en: "Sunflower seed" },
    shortName: { uk: "Соняшник", en: "Sunflower" },
    group: "processing",
    category: "processors",
    sortOrder: 6,
    basePrice: 739,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [733, 735, 736, 738, 739, 739, 739],
    vatIncluded: true,
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "48% олії, на суху речовину",
          en: "48% oil, dry matter",
        },
      },
      {
        label: { uk: "Базис", en: "Basis" },
        value: { uk: "СРТ завод", en: "CPT Crush" },
      },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "переробка", en: "processing" } },
    ],
  },
  {
    id: "rapeseed-processing",
    code: "RAPESEED NON-GMO",
    dbCode: "RAPESEED_NON_GMO_PROCESSING",
    marker: "R",
    name: { uk: "Ріпак не ГМО", en: "Rapeseed non-GMO" },
    shortName: { uk: "Ріпак", en: "Rapeseed" },
    group: "processing",
    category: "processors",
    sortOrder: 7,
    basePrice: 522,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [519, 520, 521, 521, 522, 522, 522],
    vatIncluded: true,
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "48% олії, не ГМО, на суху речовину",
          en: "48% oil, NON-GMO, dry matter",
        },
      },
      {
        label: { uk: "Базис", en: "Basis" },
        value: { uk: "СРТ завод", en: "CPT Crush" },
      },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "переробка", en: "processing" } },
    ],
  },
  {
    id: "gmo-soybean-export",
    code: "GMO SOY CPT",
    dbCode: "GMO_SOY_EXPORT",
    marker: "S",
    name: { uk: "Соя ГМО CPT Port", en: "GMO soybean CPT Port" },
    shortName: { uk: "Соя ГМО CPT", en: "GMO soy CPT" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 8,
    basePrice: 472,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [468, 469, 470, 471, 472, 472, 472],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "33% білка, ГМО, на сиру речовину",
          en: "33% protein, GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Port", en: "CPT Port" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "gmo-soybean-fca-chop",
    code: "GMO SOY FCA CHOP",
    dbCode: "GMO_SOY_FCA_CHOP",
    deliveryBasisCode: "FCA_CHOP_EXPORT",
    marker: "S",
    name: { uk: "Соя ГМО FCA Чоп", en: "GMO soybean FCA Chop" },
    shortName: { uk: "Соя ГМО Чоп", en: "GMO soy Chop" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 9,
    basePrice: 466,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [462, 463, 464, 465, 466, 466, 466],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "33% білка, ГМО, на сиру речовину",
          en: "33% protein, GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "FCA Чоп", en: "FCA Chop" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "кордон експорт", en: "border export" } },
    ],
  },
  {
    id: "non-gmo-soybean-export",
    code: "SOY NON-GMO CPT",
    dbCode: "SOYBEAN_NON_GMO_EXPORT",
    marker: "SN",
    name: { uk: "Соя не ГМО CPT Port", en: "Soybean non-GMO CPT Port" },
    shortName: { uk: "Соя не ГМО CPT", en: "Non-GMO soy CPT" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 10,
    basePrice: 488,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [484, 485, 486, 487, 488, 488, 488],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "33% білка, не ГМО, на сиру речовину",
          en: "33% protein, NON-GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Port", en: "CPT Port" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "non-gmo-soybean-fca-chop",
    code: "SOY NON-GMO FCA CHOP",
    dbCode: "SOYBEAN_NON_GMO_FCA_CHOP",
    deliveryBasisCode: "FCA_CHOP_EXPORT",
    marker: "SN",
    name: { uk: "Соя не ГМО FCA Чоп", en: "Soybean non-GMO FCA Chop" },
    shortName: { uk: "Соя не ГМО Чоп", en: "Non-GMO soy Chop" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 11,
    basePrice: 481,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [477, 478, 479, 480, 481, 481, 481],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "33% білка, не ГМО, на сиру речовину",
          en: "33% protein, NON-GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "FCA Чоп", en: "FCA Chop" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "кордон експорт", en: "border export" } },
    ],
  },
  {
    id: "rapeseed-export",
    code: "RAPESEED NON-GMO CPT",
    dbCode: "RAPESEED_NON_GMO_EXPORT",
    marker: "R",
    name: { uk: "Ріпак не ГМО CPT Port", en: "Rapeseed non-GMO CPT Port" },
    shortName: { uk: "Ріпак CPT", en: "Rapeseed CPT" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 12,
    basePrice: 501,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [497, 498, 499, 500, 501, 501, 501],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "42% олії, не ГМО, на сиру речовину",
          en: "42% oil, NON-GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Port", en: "CPT Port" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "порт експорт", en: "port export" } },
    ],
  },
  {
    id: "rapeseed-fca-chop",
    code: "RAPESEED NON-GMO FCA CHOP",
    dbCode: "RAPESEED_NON_GMO_FCA_CHOP",
    deliveryBasisCode: "FCA_CHOP_EXPORT",
    marker: "R",
    name: { uk: "Ріпак не ГМО FCA Чоп", en: "Rapeseed non-GMO FCA Chop" },
    shortName: { uk: "Ріпак Чоп", en: "Rapeseed Chop" },
    group: "export",
    category: "seasonal-export",
    sortOrder: 13,
    basePrice: 494,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [490, 491, 492, 493, 494, 494, 494],
    detailMetrics: [
      {
        label: { uk: "Якість", en: "Quality" },
        value: {
          uk: "42% олії, не ГМО, на сиру речовину",
          en: "42% oil, NON-GMO, as is",
        },
      },
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "FCA Чоп", en: "FCA Chop" } },
      { label: { uk: "Напрямок", en: "Direction" }, value: { uk: "кордон експорт", en: "border export" } },
    ],
  },
];

const sharedRespondents = [
  { id: "bunge-ukraine", legalName: "ПІІ «БУНГЕ ЮКРЕЙН»" },
  { id: "adm-ukraine", legalName: "ТОВ «АДМ ЮКРЕЙН»" },
  { id: "hermes-trading", legalName: "ТОВ «Гермес-Трейдінг»" },
  { id: "louis-dreyfus-ukraine", legalName: "ТОВ «Луї Дрейфус Україна»" },
  { id: "kernel-trade", legalName: "ТОВ «Кернел-Трейд»" },
  { id: "cofco-agri-resources-ukraine", legalName: "ТОВ «КОФКО АГРІ РЕСУРСІЗ УКРАЇНА»" },
  { id: "new-world-grain-ukraine", legalName: "ТОВ «Нью Ворлд Грейн Юкрейн»" },
  { id: "nibulon", legalName: "ТОВ СП «НІБУЛОН»" },
];

export const INDEX_CONFIGS: Record<IndexTenantId, IndexConfig> = {
  "uga-ua": {
    id: "uga-ua",
    name: "UGA Index",
    legalName: { uk: "Українська зернова асоціація", en: "Ukrainian Grain Association" },
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://index.uga.ua",
    brandUrl: "https://uga.ua/",
    logoPath: "/brand/uga-logo.png",
    logoHeaderPath: "/brand/uga-logo-header.png",
    defaultDeliveryBasis: "CPT UA Black Sea",
    heroDeliveryBasis: "CPT Black Sea Panamax Ports (POC)",
    defaultDeliveryPeriod: "T+30",
    currency: "USD",
    unit: "t",
    localeCookie: "uga_locale",
    storagePrefix: "uga",
    methodologyPdfPath: getTenantAssetUrl("uga.methodology.pdf"),
    features: { externalIndicative: true, memberArea: true },
    mediaHub: {
      enabled: false,
      brandName: "1D3X Context",
      publicLabel: { uk: "Context", en: "Context" },
      windows: [],
      localePolicies: [],
    },
    theme: { dataAttribute: "uga" },
    home: {
      subtitle: {
        uk: "Щоденні значення для ключових зернових та олійних культур України на базисі CPT Black Sea Panamax Ports (POC).",
        en: "Daily values for core Ukrainian grain and oilseed commodities on CPT Black Sea Panamax Ports (POC) basis.",
      },
      trustStrip: {
        uk: "EOD-дані респондентів · медіанна валідація · +/-2% фільтр викидів · мінімум 5 респондентів · фіксація після публікації",
        en: "Respondent EOD data · median validation · +/-2% outlier filter · minimum 5 respondents · locked publication",
      },
      heroTitle: { uk: "UGA Index", en: "UGA Index" },
      editorialLine: { uk: "/ експортний ціновий бенчмарк", en: "/ export pricing benchmark" },
      boardKicker: { uk: "Щоденний бюлетень", en: "Daily bulletin" },
      facts: {
        uk: [
          { value: "4", label: "культури" },
          { value: "8", label: "респондентів" },
          { value: "EOD", label: "перевірка" },
        ],
        en: [
          { value: "4", label: "commodities" },
          { value: "8", label: "respondents" },
          { value: "EOD", label: "review" },
        ],
      },
      officialNotice: {
        uk: "Офіційні значення: USD/т. UAH та EUR - перерахунок для відображення.",
        en: "Official values: USD/t. UAH and EUR are display conversions.",
      },
      footerDemo: { uk: "Платформа:", en: "Platform for the" },
      partnersLine: {
        uk: "",
        en: "",
      },
    },
    contacts: {
      address: {
        uk: ["Україна, 01133, Київ", "вул. Євгена Коновальця, 36Д", "6 поверх"],
        en: ["Ukraine, 01133, Kyiv", "36D Yevhena Konovaltsia St.", "6th floor"],
      },
      phones: ["+38 (044) 492-39-68", "+38 (044) 492-39-69"],
      email: "inbox@uga.ua",
      social: [
        { label: "X", href: "#", mark: "X" },
        { label: "LinkedIn", href: "#", mark: "in" },
        { label: "Telegram", href: "#", mark: "tg" },
      ],
    },
    deliveryBases: [
      {
        code: "FOB_BLACK_SEA",
        name: "CPT UA Black Sea",
        region: "UA Black Sea",
        basketCode: "FOB_BLACK_SEA_DEMO",
        basketName: "CPT UA Black Sea Basket",
      },
    ],
    respondents: sharedRespondents,
    commodities: ugaCommodities,
  },
  "spike-ua": {
    id: "spike-ua",
    name: "SPIKE SPOT INDEX",
    legalName: { uk: "Spike Brokers", en: "Spike Brokers" },
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://spike.1d3x.com",
    brandUrl: "https://spike.broker/en/",
    logoPath: "/brand/spike-logo-full.png",
    logoHeaderPath: "/brand/spike-logo-full.png",
    defaultDeliveryBasis: "CPT Odesa / CPT Crush / FCA Chop",
    defaultDeliveryPeriod: "spot",
    currency: "USD",
    unit: "t",
    localeCookie: "spike_index_locale",
    storagePrefix: "spike-index",
    methodologyPdfPath: getTenantAssetUrl("spike.methodology.pdf"),
    features: { externalIndicative: false, memberArea: true },
    mediaHub: {
      enabled: true,
      brandName: "1D3X Context",
      publicLabel: { uk: "Context", en: "Context" },
      windows: ["daily", "weekly", "monthly"],
      localePolicies: [
        {
          locale: "uk",
          marketScope: "ukraine",
          sourceLanguage: "uk",
          summaryLanguage: "uk",
          audienceLabel: "Ukraine-focused Ukrainian-language editorials and summaries",
        },
        {
          locale: "en",
          marketScope: "ukraine",
          sourceLanguage: "en",
          summaryLanguage: "en",
          audienceLabel: "Ukraine-focused English-language editorials and summaries",
        },
      ],
    },
    theme: { dataAttribute: "spike" },
    home: {
      subtitle: {
        uk: "AI-native спотовий бенчмарк цін для українського аграрного ринку.",
        en: "AI-native spot price benchmark for the Ukrainian agricultural market.",
      },
      trustStrip: {
        uk: "Дані партнерів Spike Brokers · медіанна валідація · +/-2% фільтр викидів · мінімум 5 респондентів · фіксація після публікації",
        en: "Spike Brokers partner data · median validation · +/-2% outlier filter · minimum 5 respondents · locked publication",
      },
      heroTitle: {
        uk: "SPIKE SPOT INDEX",
        en: "SPIKE SPOT INDEX",
      },
      editorialLine: {
        uk: "/ CPT Одеса · FCA Чоп · експорт і переробка",
        en: "/ CPT Odesa · FCA Chop · export and processing",
      },
      boardKicker: { uk: "Оновлення ринку", en: "Market update" },
      facts: {
        uk: [
          { value: "13", label: "товарів" },
          { value: "3", label: "напрямки" },
          { value: "3", label: "категорії" },
        ],
        en: [
          { value: "13", label: "commodities" },
          { value: "3", label: "directions" },
          { value: "3", label: "categories" },
        ],
      },
      officialNotice: {
        uk: "Офіційні значення публікуються у USD/т. Для внутрішніх переробних індексів ціна включає ПДВ.",
        en: "Official values are published in USD/t. OILSEEDS CRUSH indices are shown VAT-included.",
      },
      footerDemo: { uk: "Платформа:", en: "Platform for" },
      partnersLine: {
        uk: "Дані: партнери Spike Brokers · Технологія: Cropto/MN7R",
        en: "Data: Spike Brokers partners · Technology: Cropto/MN7R",
      },
    },
    contacts: {
      address: {
        uk: ["Україна, Київ"],
        en: ["Ukraine, Kyiv"],
      },
      phones: ["+380 50 386 29 91"],
      email: "info@spike.broker",
      social: [
        { label: "Substack", href: "https://mn7r.substack.com/", mark: "Substack" },
        { label: "Bluesky", href: "https://bsky.app/profile/mn7r.bsky.social", mark: "Bluesky" },
        { label: "Telegram", href: "https://t.me/spike_brokers", mark: "Telegram" },
        { label: "LinkedIn", href: "#", mark: "LinkedIn" },
      ],
    },
    deliveryBases: [
      {
        code: "CPT_ODESA_EXPORT",
        name: "CPT Odesa, Ukraine (export)",
        region: "Odesa, Ukraine",
        basketCode: "CPT_ODESA_EXPORT_SPIKE",
        basketName: "CPT Odesa Export Spike Basket",
      },
      {
        code: "CPT_PARITY_ODESA_PROCESSING",
        name: "CPT Crush, Ukraine (processing)",
        region: "Odesa, Ukraine",
        basketCode: "CPT_PARITY_ODESA_PROCESSING_SPIKE",
        basketName: "CPT Crush Processing Spike Basket",
      },
      {
        code: "FCA_CHOP_EXPORT",
        name: "FCA Chop, Ukraine (export)",
        region: "Chop, Ukraine",
        basketCode: "FCA_CHOP_EXPORT_SPIKE",
        basketName: "FCA Chop Export Spike Basket",
      },
    ],
    respondents: [
      {
        id: MN7R_MONITOR_RESPONDENT_ID,
        legalName: "MN7R Monitor",
        collectionMode: "manual_outreach",
      },
      {
        id: SPIKE_ADMIN_FALLBACK_RESPONDENT_ID,
        legalName: "Admin market fallback",
        collectionMode: "manual_outreach",
      },
      { id: "fop-solovey", legalName: "ФОП Соловей" },
      {
        id: "kernel",
        legalName: "Кернел",
        collectionMode: "manual_outreach",
        seedAuthContact: false,
      },
      {
        id: "mhp",
        legalName: "МХП",
        collectionMode: "manual_outreach",
        seedAuthContact: false,
      },
      {
        id: "brooklyn",
        legalName: "Бруклін",
        collectionMode: "manual_outreach",
        seedAuthContact: false,
      },
      {
        id: "continental",
        legalName: "Контінентал",
        collectionMode: "manual_outreach",
        seedAuthContact: false,
      },
      {
        id: "lnz",
        legalName: "ЛНЗ",
        collectionMode: "manual_outreach",
        seedAuthContact: false,
      },
    ],
    commodities: spikeCommodities,
  },
};

export function getActiveIndexConfig(requestHost?: string) {
  return INDEX_CONFIGS[getActiveTenantId(requestHost)];
}

export function getActiveTenantId(requestHost?: string): IndexTenantId {
  const requested =
    process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT ?? "";
  const normalizedRequested = requested.trim().toLowerCase();

  if (normalizedRequested === "spike-ua") return "spike-ua";
  if (normalizedRequested === "uga-ua") return "uga-ua";

  const siteHost = getHost(requestHost ?? process.env.NEXT_PUBLIC_SITE_URL);

  if (
    normalizedRequested === "platform" ||
    normalizedRequested === "1d3x" ||
    normalizedRequested === "spike" ||
    normalizedRequested === "pop" ||
    siteHost.includes("spike") ||
    siteHost.includes("pop")
  ) {
    return "spike-ua";
  }

  if (siteHost.includes("uga") || siteHost.includes("index-uga") || siteHost.includes("index.uga")) {
    return "uga-ua";
  }

  return "spike-ua";
}

function getHost(value?: string) {
  if (!value) return "";

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getSpikeCommodityCategories(locale: Locale) {
  return [
    {
      id: "all-seasons" as const,
      label: locale === "uk" ? "Зернові експорт" : "Grains Export",
      description:
        locale === "uk"
          ? "Зернові експортні індекси CPT Port та FCA Чоп."
          : "Grain export indices across CPT Port and FCA Chop bases.",
    },
    {
      id: "processors" as const,
      label: locale === "uk" ? "Олійні переробка" : "Oilseeds crush",
      description:
        locale === "uk"
          ? "Переробка: соя ГМО 37 протеїн; соняшник 48% сухої олії; ріпак 48% сухої олії, не ГМО. USD/t з ПДВ."
          : "Processing: soybean 37 pro, GMO; Sunflower Seeds 48% dry oil; Rapeseed 48% dry oil, NON-GMO. USD/t VAT-included.",
    },
    {
      id: "seasonal-export" as const,
      label: locale === "uk" ? "Олійні експорт" : "Oilseeds Export",
      description:
        locale === "uk"
          ? "Сезонні експортні позиції сої та ріпаку."
          : "Seasonal export positions for soybeans and rapeseed.",
    },
  ];
}

export function getCommodityCategory(
  commodity: Pick<IndexCommodityConfig, "category">,
) {
  return commodity.category ?? "all-seasons";
}
import { getTenantAssetUrl } from "@/lib/tenant-assets";
