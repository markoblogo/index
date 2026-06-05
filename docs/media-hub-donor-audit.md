# Media Hub Donor Audit

## Scope

Donor analyzed:

- `markoblogo/cropto-v0`
- key files under `server/monitor/*`
- keyless source mesh in `server/monitor/config.ts`
- `last30daysService.ts`
- grain widgets / macro provider config

## What Last30Days Actually Had

The old product had two different layers:

### 1. Keyless monitoring mesh

This was the real backbone of the content surface:

- large RSS / Atom feed catalog
- keyword scoring
- dedupe
- relevance filtering
- topic tagging
- window slicing for `1 / 7 / 30` days

This layer mostly did **not** require API keys.

### 2. API-driven market / macro / widgets layer

This layer added:

- macro widgets
- grain widgets
- logistics indicators
- USDA / Nasdaq / WFP / IMF / OECD / EC / Eurostat / FAO / FPMA data

This layer used many env variables and some providers likely need refreshed credentials.

## What Is Already Transferred

### In `index` repo now

- Spike Telegram collector
- unified source registry for day / week
- monthly Telegram monitoring window
- public `Spike Media Hub`
- public `1D3X Media Hub`
- donor-style `Day / 7 Days / 30 Days` shell

### Newly transferred from donor

- keyless RSS monitoring mesh for `1D3X`
- relevance scoring model
- broad international source list
- real feed-driven public windows for `1D3X Media Hub`

Files:

- `src/lib/media-hub-rss.ts`
- `src/app/media-hub/page.tsx`

## What Is Not Yet Transferred

### Still missing

- persisted RSS items in database
- web/html scraper strategy beyond RSS/Atom
- file ingestion pipeline
- Reddit / YouTube / X connectors
- donor macro / widget provider layer
- monthly persisted report entity
- unified admin shell for `day / week / month`

## Keyless Sources From Donor

These can work without API keys and are the first layer to rely on:

- Brownfield Ag News
- Brownfield Markets
- Brownfield Weather
- Farmers Weekly Markets
- AgWeb
- World Grain
- Grain Central
- farmdoc daily
- Agrimoney
- Mundus Agri
- Biofuels News
- Farms.com Markets
- SovEcon
- Barchart grains news feed
- Splash247
- gCaptain
- Marine Insight
- FreightWaves
- EIN Shipping
- Hellenic Shipping News
- Agri-Pulse
- AGDAILY
- OECD Agriculture
- WTO News
- EU Agriculture
- FAO News

## Donor Env Keys Inventory

Below is the meaningful env surface discovered in donor monitor code.

### Core infra

- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `LAST30DAYS_JSON_PATH`
- `LAST30DAYS_SQLITE_PATH`
- `LAST30DAYS_OUTPUT_DIR`
- `LAST30DAYS_AI_MODEL`

### Telegram / relay

- `TELEGRAM_BOT_TOKEN`
- `SEA_BROKERAGE_TELEGRAM_CHAT_ID`
- `SEA_BROKERAGE_TELEGRAM_CHAT_IDS`
- `SEA_BROKERAGE_TELEGRAM_UA_CHAT_ID`
- `SEA_BROKERAGE_TELEGRAM_INTERNAL_ENABLED`
- `SEA_BROKERAGE_TELEGRAM_INTERNAL_CHAT_ID`
- `SEA_BROKERAGE_TELEGRAM_INTERNAL_CHAT_IDS`
- `SEA_BROKERAGE_TELEGRAM_INTERNAL_UA_CHAT_ID`
- `SEA_BROKERAGE_TELEGRAM_EXTERNAL_ENABLED`
- `SEA_BROKERAGE_TELEGRAM_EXTERNAL_CHAT_ID`
- `SEA_BROKERAGE_TELEGRAM_EXTERNAL_CHAT_IDS`

### Grain / futures / macro APIs

- `BARCHART_API_KEY`
- `COMMODITIC_API_KEY`
- `APIFARMER_API_KEY`
- `NASDAQ_API_KEY`
- `ALPHAVANTAGE_API_KEY`
- `TWELVEDATA_API_KEY`
- `TRADINGECONOMICS_API_KEY`

### Official / institutional datasets

- `USDA_FAS_API_KEY`
- `USDA_FAS_PSD_API_KEY`
- `USDA_NASS_API_KEY`
- `WFP_DATABRIDGES_TOKEN`

### Optional config-heavy sources

- `FPMA_API_BASE_URL`
- `FAOSTAT_BASE_URL`
- `EC_AGRI_API_BASE_URL`
- `EUROSTAT_BASE_URL`
- `OECD_AGRICULTURAL_OUTLOOK_SDMX_BASE_URL`
- `IMF_PCPS_TABLE2_URL`
- `AMIS_MARKET_MONITOR_URL`

Many of these have defaults and are not secrets, but they are part of the donor integration map.

## Practical Key Priority

### Priority 1: needed now for strongest next step

- `OPENAI_API_KEY`
  already used in current repo
- `TELEGRAM_BOT_TOKEN`
  already used in current repo

No new secret is required to run the transferred RSS monitoring mesh.

### Priority 2: add if we want donor macro / widget layer

- `USDA_FAS_API_KEY`
- `USDA_NASS_API_KEY`
- `WFP_DATABRIDGES_TOKEN`
- `NASDAQ_API_KEY`
- `ALPHAVANTAGE_API_KEY`

### Priority 3: add only if we want wider commercial data coverage

- `BARCHART_API_KEY`
- `COMMODITIC_API_KEY`
- `APIFARMER_API_KEY`
- `TWELVEDATA_API_KEY`
- `TRADINGECONOMICS_API_KEY`

## Recommended Transfer Order

### Immediate

- keep expanding keyless RSS mesh
- persist RSS items
- merge RSS + Telegram into one media item model

### Next

- add HTML/article collector for websites and blogs
- add file ingestion
- add admin `day / week / month` unified shell

### After that

- selectively re-enable donor macro providers using fresh keys
- do not blindly port every provider
- start with USDA + WFP + Nasdaq / AlphaVantage only if the outputs are actually useful for Media Hub

## Conclusion

The missing piece was real:

- I had not transferred the donor monitoring backbone yet.
- The donor backbone was not primarily “paid APIs”.
- It was mostly the broad keyless feed mesh plus a second optional provider layer.

That keyless layer is now beginning to move into the `index` repo via `1D3X Media Hub`.
