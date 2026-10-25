import type { Locale } from "@/lib/i18n";

/** Shared drafting guidance, not a replacement for evidence or delivery validation. */
export function buildSsiWeeklyEditorialContract(locale: Locale) {
  return [
    "SSI weekly editorial contract v2026-10-25 (23 October benchmark comparison).",
    "Apply these weekly-specific editorial rules ahead of conflicting legacy style/templates; preserve the caller's JSON schema, evidence restrictions and publication gates.",
    locale === "uk"
      ? "Write Ukrainian. Public heading: SPIKE BROKERS | Weekly Commodity & Logistics Market. Date: DD.MM.YY. Footer of each part: Spike Brokers – Ваш торговий партнер 🌎. Parts I and II then end with Продовження нижче ⬇️."
      : "Write English. Public heading: SPIKE BROKERS | Weekly Commodity & Logistics Market. Date: DD.MM.YY. End each part with Spike Brokers - Your trading partner; add Continuation below to parts I and II.",
    "Exactly three ordered parts: logistics; grains (SSI overview, corn, wheat); oilseeds/processing (SSI overview, sunflower, rapeseed, soy). Do not add separate AI Market Read, watch-next-week, sources or generic external-context sections. Embed geography and external drivers in the relevant crop.",
    "PREPARE EVIDENCE before prose: for each metric retain material/source identity, sheet/page/cell where supplied, observation period, unit, transport mode, customs/export/internal/transit scope, contract month/year, basis, currency, tax treatment and comparison baseline. A source URL or filename alone is not verified content. Use only evidence actually supplied; do not claim to have read unprovided files or searched the web.",
    "Use observation dates, not upload/print dates, to select the report window. Keep late uploads about the reporting period eligible as evidence when supplied; never move their observations into the upload week. Older reports are structural/narrative references, not current facts.",
    "COMPARISONS: month-to-date versus the SAME calendar dates of the previous month; current seven-day increment versus the preceding seven-day increment, each divided by its own day count; year-on-year only for a matched period/scope. Do not compare a partial month with a full month or a weekly flow with a cumulative average.",
    "SSI weekly movement must compare published snapshots at the current and previous weekly cutoffs. A change field without baseline dates is not evidence of a weekly change; the first observation inside the current week is not automatically the previous Friday. If a comparable baseline is absent, retain the verified level and flag the missing comparison internally instead of substituting zero.",
    "Futures: label venue, delivery month/year, unit and price type. Compare settlement with settlement for the SAME contract; do not silently roll contracts or compare intraday/last trade with settlement. Physical quotes keep their own observation date, basis, currency and delivery period. A combined delivery-period quote cannot supply separate month-on-month baselines without evidence.",
    "PART I coverage, when sourced: total customs agri-export groups 01-24 UKT ZED in tonnes AND value, matched-month absolute/percentage changes, weekly daily pace; grain components/share; oilseed/oil/meal composition and shares. Keep value and tonne sections of spreadsheets separate.",
    "Road: cumulative volume and matched-month change, weekly daily pace, top product mix and grain share. Keep road passage toward Danube ports, cumulative total, pace, destinations and product concentration HERE, not in rail/port-loading statistics. Prioritize product mix and dynamics over a long list of road checkpoints.",
    "Rail: total grain transport and matched m/m/y/y, daily loading, grain/oil/meal exports, land/port shares with explicit denominator. Border: four western directions' total daily grain-wagon transfer and grain-only accumulation. Port subsection: rail delivery to Danube/Odesa; distinguish export from internal Izmail and Reni transit. Neither customs passage nor rail delivery is marine loading; do not add overlapping totals.",
    "PARTS II/III per crop: compact quote rows, then 1-2 concrete global drivers, then Ukrainian exports and physical-market interpretation. Retain useful continuity with the prior final official report, but establish current facts independently. Explain divergent price/flow movements without inventing their cause or a profitable arbitrage.",
    "Corn/wheat: supplied CBOT/MATIF/SSI levels and comparable weekly changes; export-sales/crop/tender facts only when verified; Ukraine cumulative tonnes versus matched previous-month dates, recent daily pace, top destinations and concentration changes. Distinguish customs clearance from shipment or purchase.",
    "Oilseeds need the SAME statistical depth as grains, not only price commentary. Sunflower: seed, oil and meal tonnes, available export values, matched-month changes and top buyers. Rapeseed: seed tonnes/value, buyers and oil exports. Soy: beans tonnes/value, buyers, oil and meal exports. Link these to SSI export/crush bases, oil complex and futures without deriving a crush margin from incomparable VAT/bases.",
    "ARITHMETIC/SEMANTICS PASS before final prose: recompute changes and shares from compatible inputs; widening/narrowing and up/down must agree with the numbers. Do not inherit a reference's contradiction, unverified tender or ambiguous delta. Soymeal short tons are not metric tonnes; identify crude delivery month rather than assuming a continuous nearest contract.",
    "Keep missing fields, conflicts and provenance in internal warnings/evidence metadata supported by the caller; omit unsupported public claims. Never fill gaps with old prices, zero, invented destinations or generic boilerplate. Do not add public Джерела / Sources footers or workflow/methodological commentary.",
    "Telegram output: exactly three messages, one per part, each <=4096 UTF-16 units after HTML entity parsing, including heading/date/footer; target 3700-3900. Preserve complete HTML tags and sentences. Compress repeated commentary first, then lower-priority details; retain supported comparisons and the seed/oil/meal chain. No fourth message and no mechanical mid-sentence truncation. Use compact bullets for figures and short analytical paragraphs; bold headings/key figures, not every number.",
    "The 23 October benchmark supplies coverage and style examples only: never reuse its prices, volumes, percentages, destinations or dates as facts for a later week. Guidance does not itself fetch evidence, enforce numeric validation, approve publication or authorize a channel send.",
  ].join("\n");
}

export function getSsiWeeklyRequiredParts(locale: Locale) {
  const uk = locale === "uk";
  return [
    {
      key: "logistics",
      title: uk ? "Частина I. Логістика" : "Part I. Logistics",
      sections: uk
        ? ["📊 ОСНОВНЕ З ЕКСПОРТУ УКРАЇНИ", "🚚 АВТОМОБІЛЬНІ ПЕРЕВЕЗЕННЯ", "🚝 ЗАЛІЗНИЧНІ ПЕРЕВЕЗЕННЯ", "🚧 У напрямку кордону", "⚓️ У напрямку порту"]
        : ["📊 UKRAINE EXPORT OVERVIEW", "🚚 ROAD TRANSPORT", "🚝 RAIL TRANSPORT", "🚧 Border direction", "⚓️ Port direction"],
    },
    {
      key: "grains",
      title: uk ? "Частина II. Зернові" : "Part II. Grains",
      sections: ["📈 SPIKE Spot Commodity Index Ukraine", ...(uk ? ["🌽 КУКУРУДЗА", "🌾 ПШЕНИЦЯ"] : ["🌽 CORN", "🌾 WHEAT"])],
    },
    {
      key: "oilseeds_processing",
      title: uk ? "Частина III. Олійні та продукти переробки" : "Part III. Oilseeds and processing products",
      sections: ["📈 SPIKE Spot Commodity Index Ukraine", ...(uk ? ["🌻 СОНЯШНИК", "🌿 РІПАК", "🌱 СОЯ"] : ["🌻 SUNFLOWER", "🌿 RAPESEED", "🌱 SOYBEANS"])],
    },
  ];
}
