# SPIKE Context Source Audit

Updated: 2026-06-20

## Scope

SPIKE Context uses one unified Ukraine-focused source pool for both `uk` and `en` localizations. The monitored material can be Ukrainian or English; report language is selected by page or publication locale.

This audit covers no-key sources only: Telegram channels already configured in the report workspace, direct RSS/Atom feeds, Google News RSS discovery, and GDELT Doc API discovery.

## Existing Telegram Sources

These channels are already part of the SPIKE source layer and should not be duplicated as first-class website RSS sources unless a later editorial reason requires it:

- `@superagronomcom`
- `@agroportalua`
- `@elevatorist`
- `@apk_informUA`
- `@landlord_magazine`
- `@UGAua`
- `@YaKurkul`
- `@latifundistmedia`
- `@Agrosphera`
- `@ugtc_trade`
- `@mapfu2022`
- `@BarvaInvest`
- `@spike_brokers`
- `@asap_agri`

## Direct RSS Added Or Kept

- `UkrAgroConsult EN` — Ukraine grain and oilseed market feed.
- `ProAgro Ukraine EN` — Ukraine agribusiness and market feed.
- `AgroTimes UA` — Ukrainian agriculture feed.
- `USM Shipping EN` — Ukraine shipping and port context.
- `Rail Insider UA` — rail/logistics context.
- `RailFreight Ukraine` — regional rail freight context.
- `Kyiv Post` — macro/policy context.
- `Interfax-Ukraine EN` — economic/policy context.
- `Expana / Mintec` — global commodity pricing context.
- `AMIS` — global commodity policy context.
- `FAO News` — global commodity and policy context.

## Discovery Sources Added

Google News RSS:

- Ukraine grain export / wheat / corn / oilseeds.
- Black Sea grain corridor / port / vessel.
- Ukraine Danube / rail / border logistics.
- Ukraine agriculture EU policy / tariff / quota.
- Ukraine sunflower / soybean / rapeseed / oilseed market.

GDELT Doc API:

- Ukraine grain export, wheat, corn and oilseeds.
- Ukraine grain ports, Danube, Black Sea corridor and rail freight.
- Ukraine agriculture policy, EU policy, grain tariffs and export quotas.

## Duplicate / Quarantine Rules

- Direct domains already represented by Telegram are treated as duplicate candidates: `agroportal.ua`, `apk-inform.com`, `elevatorist.com`, `latifundist.com`, `kurkul.com`, `superagronom.com`, `uga.ua`.
- Cross-source duplicates are collapsed by canonical URL first, then by normalized title.
- Tracking parameters and URL fragments are removed before dedupe.
- Generic unsafe/noise terms such as casino, betting, gaming, celebrity and giveaways are quarantined out of fallback windows.
- `cfts.org.ua` RSS was checked but returned HTTP 500, so it is covered by Google News/GDELT discovery instead of a brittle direct feed.

## Manual API Keys

No new API keys are required for this pass.

Future optional enrichment can add paid or key-based APIs, but the current SPIKE monitoring layer now has a no-key baseline for RSS, Google News RSS and GDELT.
