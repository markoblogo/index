import type { Locale } from "@/lib/i18n";

export type IndexTenantId = "uga-ua" | "spike-ua";

export type IndexCommodityGroup = "export" | "processing";

export type IndexCommodityConfig = {
  id: string;
  code: string;
  dbCode: string;
  marker: string;
  name: Record<Locale, string>;
  shortName: Record<Locale, string>;
  group: IndexCommodityGroup;
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
  respondents: Array<{ id: string; legalName: string }>;
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
    sortOrder: 1,
    basePrice: 229,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [225, 226, 227, 228, 229, 229, 229],
    detailMetrics: [
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Одеса", en: "CPT Odesa" } },
      { label: { uk: "Напрям", en: "Flow" }, value: { uk: "експорт", en: "export" } },
    ],
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
    basePrice: 222,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [221, 221, 222, 222, 222, 222, 222],
    detailMetrics: [
      { label: { uk: "Протеїн", en: "Protein" }, value: { uk: "11.5%", en: "11.5%" } },
      { label: { uk: "Напрям", en: "Flow" }, value: { uk: "експорт", en: "export" } },
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
    sortOrder: 3,
    basePrice: 219,
    absoluteChange: 1,
    percentChange: 0.5,
    sparkline: [216, 217, 217, 218, 218, 219, 219],
    detailMetrics: [
      { label: { uk: "Базис", en: "Basis" }, value: { uk: "CPT Одеса", en: "CPT Odesa" } },
      { label: { uk: "Напрям", en: "Flow" }, value: { uk: "експорт", en: "export" } },
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
    sortOrder: 4,
    basePrice: 504,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [501, 502, 503, 504, 504, 504, 504],
    vatIncluded: true,
    detailMetrics: [
      { label: { uk: "ПДВ", en: "VAT" }, value: { uk: "включено", en: "included" } },
      { label: { uk: "Напрям", en: "Flow" }, value: { uk: "переробка", en: "processing" } },
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
    sortOrder: 5,
    basePrice: 739,
    absoluteChange: 0,
    percentChange: 0,
    sparkline: [733, 735, 736, 738, 739, 739, 739],
    vatIncluded: true,
    detailMetrics: [
      { label: { uk: "ПДВ", en: "VAT" }, value: { uk: "включено", en: "included" } },
      { label: { uk: "Напрям", en: "Flow" }, value: { uk: "переробка", en: "processing" } },
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
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    brandUrl: "https://uga.ua/",
    logoPath: "/brand/uga-logo.png",
    logoHeaderPath: "/brand/uga-logo-header.png",
    defaultDeliveryBasis: "FOB Black Sea",
    defaultDeliveryPeriod: "T+30",
    currency: "USD",
    unit: "t",
    localeCookie: "uga_locale",
    storagePrefix: "uga",
    methodologyPdfPath: "/files/uga-index-methodology.pdf",
    features: { externalIndicative: true, memberArea: true },
    theme: { dataAttribute: "uga" },
    home: {
      subtitle: {
        uk: "Щоденні значення для ключових зернових та олійних культур України на базисі FOB Black Sea.",
        en: "Daily values for core Ukrainian grain and oilseed commodities on FOB Black Sea basis.",
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
      footerDemo: { uk: "Демо для", en: "Demo for the" },
      partnersLine: {
        uk: "Індикативи: Spike Brokers · Технологія: Cropto/MN7R",
        en: "Indicatives: Spike Brokers · Technology: Cropto/MN7R",
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
        name: "FOB Black Sea",
        region: "Black Sea",
        basketCode: "FOB_BLACK_SEA_DEMO",
        basketName: "FOB Black Sea Demo Basket",
      },
    ],
    respondents: sharedRespondents,
    commodities: ugaCommodities,
  },
  "spike-ua": {
    id: "spike-ua",
    name: "SPIKE Spot Commodity Index Ukraine",
    legalName: { uk: "Spike Brokers", en: "Spike Brokers" },
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://spike-index.cr0pto.com",
    brandUrl: "https://spike.broker/en/",
    defaultDeliveryBasis: "CPT Odesa / CPT parity Odesa",
    defaultDeliveryPeriod: "spot",
    currency: "USD",
    unit: "t",
    localeCookie: "spike_index_locale",
    storagePrefix: "spike-index",
    methodologyPdfPath: "/files/spike-index-methodology.pdf",
    features: { externalIndicative: false, memberArea: true },
    theme: { dataAttribute: "spike" },
    home: {
      subtitle: {
        uk: "Щоденні спотові індекси Spike Brokers для експортних і переробних базисів України.",
        en: "Daily Spike Brokers spot indices for Ukrainian export and processing bases.",
      },
      trustStrip: {
        uk: "Дані партнерів Spike Brokers · медіанна валідація · +/-2% фільтр викидів · мінімум 5 респондентів · фіксація після публікації",
        en: "Spike Brokers partner data · median validation · +/-2% outlier filter · minimum 5 respondents · locked publication",
      },
      heroTitle: {
        uk: "SPIKE Spot Commodity Index Ukraine",
        en: "SPIKE Spot Commodity Index Ukraine",
      },
      editorialLine: {
        uk: "/ CPT Одеса · експорт і переробка",
        en: "/ CPT Odesa · export and processing",
      },
      boardKicker: { uk: "Market update", en: "Market update" },
      facts: {
        uk: [
          { value: "5", label: "позицій" },
          { value: "2", label: "базиси" },
          { value: "spot", label: "ринок" },
        ],
        en: [
          { value: "5", label: "positions" },
          { value: "2", label: "bases" },
          { value: "spot", label: "market" },
        ],
      },
      officialNotice: {
        uk: "Офіційні значення публікуються у USD/т. Для сої ГМО та соняшнику ціна включає ПДВ.",
        en: "Official values are published in USD/t. GMO soybean and sunflower include VAT.",
      },
      footerDemo: { uk: "Платформа для", en: "Platform for" },
      partnersLine: {
        uk: "Дані: партнери Spike Brokers · Технологія: Cropto/MN7R",
        en: "Data: Spike Brokers partners · Technology: Cropto/MN7R",
      },
    },
    contacts: {
      address: {
        uk: ["Україна, 04070, Київ", "вул. Іллінська, 8", "БЦ «Іллінський»"],
        en: ["Ukraine, 04070, Kyiv", "8 Illinska St.", "Illinskyi Business Center"],
      },
      phones: ["+380 63 412 86 33"],
      email: "info@spike.broker",
      social: [
        { label: "Facebook", href: "https://www.facebook.com/spikebrokers", mark: "fb" },
        { label: "LinkedIn", href: "https://www.linkedin.com/company/spike-brokers/", mark: "in" },
        { label: "Telegram", href: "https://t.me/spike_brokers", mark: "tg" },
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
        name: "CPT parity Odesa, Ukraine (processing)",
        region: "Odesa, Ukraine",
        basketCode: "CPT_PARITY_ODESA_PROCESSING_SPIKE",
        basketName: "CPT parity Odesa Processing Spike Basket",
      },
    ],
    respondents: [
      { id: "spike-partner-1", legalName: "Spike Brokers Partner 1" },
      { id: "spike-partner-2", legalName: "Spike Brokers Partner 2" },
      { id: "spike-partner-3", legalName: "Spike Brokers Partner 3" },
      { id: "spike-partner-4", legalName: "Spike Brokers Partner 4" },
      { id: "spike-partner-5", legalName: "Spike Brokers Partner 5" },
      { id: "spike-partner-6", legalName: "Spike Brokers Partner 6" },
      { id: "spike-partner-7", legalName: "Spike Brokers Partner 7" },
      { id: "spike-partner-8", legalName: "Spike Brokers Partner 8" },
    ],
    commodities: spikeCommodities,
  },
};

export function getActiveIndexConfig() {
  return INDEX_CONFIGS[getActiveTenantId()];
}

export function getActiveTenantId(): IndexTenantId {
  const requested =
    process.env.INDEX_TENANT ?? process.env.NEXT_PUBLIC_INDEX_TENANT ?? "uga-ua";

  return requested === "spike-ua" ? "spike-ua" : "uga-ua";
}
