# SPIKE Experimental Analytics

The SPIKE analytics page has an optional experimental layer for additional historical cuts over published and reconstructed price history.

Enable it with either:

- `NEXT_PUBLIC_ANALYTICS_EXPERIMENTAL_BLOCKS=true`
- `/uk/analytics?experimentalAnalytics=1`

## Blocks

- `Market Pulse Heatmap`: deterministic 1D / 7D / 30D / 90D movement table with percentile, realized 30D volatility and confidence label.
- `Price Percentile & Historical Range`: current price against min / p25 / median / p75 / max over 90 / 180 / 365 / all available observations.
- `Seasonality Explorer`: same commodity by calendar year, with indexed-to-100 or absolute USD/t view.
- `Spread Leaderboard`: predefined SPIKE-relevant spreads ranked by z-score and recent movement.
- `Data Quality & Confidence`: observation count, stale rows, abnormal movements and confidence buckets.

## AI Analytics Preview

The second experimental layer is gated separately and only appears when the base experimental layer is enabled.

Enable it with either:

- `NEXT_PUBLIC_ANALYTICS_AI_BLOCKS=true`
- `/uk/analytics?experimentalAnalytics=1&aiAnalytics=1`

Current provider mode is deterministic `none`. It does not call an LLM and does not send archive data to external AI providers. The layer builds an internal fact pack with evidence IDs, then renders:

- anomaly explanation cards;
- market regime map;
- similar historical episodes;
- daily / weekly AI market brief preview;
- historical scenario cards.

## Limits

This layer is not part of official SPIKE index methodology. It does not alter index calculation, publication, respondent collection, or public official values. It is deterministic analytics only: no forecast and no trading recommendation.

Use it as a public preview of analytical tooling around the historical archive and as a QA surface for unusual data patterns.
