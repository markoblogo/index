# 1D3X Context Source Audit

Updated: 2026-06-20

## Scope

The global 1D3X Context monitors international agri-commodity signals for grains, oilseeds, adjacent crop risk, freight, trade policy and input-cost factors.

This pass uses no-key sources only: direct RSS/Atom, Google News RSS and GDELT Doc API. No manual API keys or new environment variables are required.

## Existing Global Source Inventory

Existing active source registry before this pass contained 33 global sources:

- `brownfield-main` / `brownfield-markets` / `brownfield-weather` — `brownfieldagnews.com`
- `farmersweekly-world` — `fwi.co.uk`
- `agweb-markets` — `agweb.com`
- `world-grain-news` — `world-grain.com`
- `graincentral-news` / `graincentral-markets` / `graincentral-trade` / `graincentral-production` — `graincentral.com`
- `farmdoc-daily` — `farmdocdaily.illinois.edu`
- `agrimoney` — `agrimoney.com`
- `mundus-agri` — `mundus-agri.eu`
- `biofuels-news` — `biofuels-news.com`
- `farms-markets` — `farms.com`
- `sovecon` — `sovecon.com`
- `barchart-grains` — `barchart.com`
- `splash247` — `splash247.com`
- `gcaptain` — `gcaptain.com`
- `marine-insight` — `marineinsight.com`
- `freightwaves` — `freightwaves.com`
- `ein-shipping` — `shipping.einnews.com`
- `hellenic-shipping-news` — `hellenicshippingnews.com`
- `agri-pulse-free` — `agri-pulse.com`
- `agdaily` — `agdaily.com`
- `amis-outlook` — `amis-outlook.org`
- `ahdb-news` — `ahdb.org.uk`
- `mintec-top-stories` — `mintecglobal.com`
- `kyiv-post` — `kyivpost.com`
- `oecd-agri` — `oecd.org`
- `wto-news` — `wto.org`
- `ec-agri` — `agriculture.ec.europa.eu`
- `fao-news` — `fao.org`

## Added Sources

Direct RSS:

- `farmprogress-global` — `farmprogress.com/rss.xml`, 60-120 min cadence, US grain markets, futures, crops and weather.
- `freightos-weekly` — `freightos.com/feed`, weekly/daily discovery cadence, ocean freight and route disruption context.
- `railmarket-global` — `railmarket.com/feed`, 4 h cadence, rail freight corridors and logistics bottlenecks.
- `railfreight-global` — `railfreight.com/feed`, 4 h cadence, European/global rail freight and grain corridor context.

Google News RSS discovery:

- `gnews-global-grains`
- `gnews-brazil-argentina`
- `gnews-usda-reports`
- `gnews-canada-australia`
- `gnews-eu-black-sea`
- `gnews-import-tenders`
- `gnews-vegetable-oils`
- `gnews-global-freight`
- `gnews-official-crop-reports`

GDELT discovery:

- `gdelt-global-grains-oilseeds`
- `gdelt-major-exporters`
- `gdelt-importers-tenders`
- `gdelt-black-sea-impact`
- `gdelt-south-america`
- `gdelt-north-america`
- `gdelt-eu-uk`
- `gdelt-australia`
- `gdelt-vegetable-oils`
- `gdelt-input-costs`

## Enriched Existing Sources

- `world-grain-news` was kept as the existing World Grain source family but its feed URL was corrected from an obsolete topic feed to the current public article RSS feed: `https://www.world-grain.com/rss/articles`.
- Duplicate source-family detection was added for known existing families, including Brownfield, FreightWaves, Marine Insight, Splash247, World Grain, Agri-Pulse, Grain Central, AHDB, USDA/FAS/NASS, AMIS/FAO, GEOGLAM/JRC, IGC, Freightos, AAR, DAT, BCR, Bolsa de Cereales, CONAB and EU Agriculture.

## Skipped Sources

- Brownfield, FreightWaves, Marine Insight, Splash247, Grain Central, Farms.com, AgWeb, AMIS, FAO, AHDB, Hellenic Shipping and Agri-Pulse were not duplicated because existing source IDs already cover those families.
- Agriculture.com returned `403` for tested RSS URLs; covered through Google News/GDELT discovery.
- DTN tested RSS path returned `404`; covered through Google News/GDELT discovery.
- Western Producer tested feed URLs returned `403`; covered through Google News/GDELT discovery.
- Farmers Guardian tested RSS/list URLs timed out or returned `404`; covered through Google News/GDELT discovery.
- ANEC tested `/feed/` returned `404`; Brazil export signals are covered through GDELT/Google News discovery.
- Miller Magazine tested `/feed/` returned HTML rather than RSS; not added as a brittle scraper.
- Official report/PDF pages such as WASDE, FAS circulars, NASS Crop Progress, AMIS Market Monitor, FAO GIEWS, GEOGLAM, JRC MARS, ABARES, CONAB, BCR, Bolsa de Cereales, IGC, Drewry, AAR and DAT are covered in this pass by focused no-key discovery layers unless a stable direct RSS/feed exists.

## Duplicate And Relevance Rules

- Cross-source items are deduped by canonical URL first.
- Same normalized title fingerprints dedupe only within a 14-day window.
- Direct source items remain preferred over broad discovery by relevance/date selection.
- Discovery results from Google News RSS and GDELT are treated as coverage expansion, not as duplicate direct feeds.
- Generic lifestyle, gambling, ecommerce, passenger rail, stock-tip, farm-machinery-only and other non-market noise is quarantined out of fallback windows.

## Manual API Work

`manual_api_needed_later = []`
