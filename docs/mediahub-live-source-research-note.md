# MediaHub Live Source Research Note

MediaHub may use live web research connectors as a reviewed source-discovery
and digest layer. It must not replace the existing Context parser, extractor,
manual-material receipts, or editorial review gates.

This note adapts the useful part of `MODSetter/SurfSense`: typed live source
connectors and cited briefs.

Source: https://github.com/MODSetter/SurfSense

## Allowed

- collect report-only signals from search, public pages, public social sources,
  videos, maps/place reviews, job listings, and product/review pages;
- normalize connector output into source-family evidence;
- produce daily or weekly cited briefs for operator review;
- retain only reviewed digest artifacts;
- compare connector results against existing Context source allowlists.

## Not allowed

- auto-publish MediaHub briefs;
- write to Telegram, WhatsApp, site pages, or partner surfaces;
- broad crawling without source-family scope;
- treating public comments or scraped reviews as verified facts;
- bypassing `media-hub-extraction-adapters.md`;
- replacing manual-material receipts or editorial source policy.

## Run receipt

Every live-source research pass should record:

- `source_family`;
- `connector`;
- `query_or_url_scope`;
- `time_window`;
- `rate_or_cost_limit`;
- `raw_evidence_refs`;
- `citation_quality`;
- `brief_artifact`;
- `operator_review_state`;
- `retention_decision`.

## Pilot candidates

- MediaHub topic digest for one commodity or route;
- competitor/source visibility check for 1D3X/SPIKE;
- YouTube transcript/comment scan for one selected public source;
- search result and AI-overview source watch for one bounded query set.

Live source research remains report-only until separately promoted.
