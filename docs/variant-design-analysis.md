# Variant Design Analysis

Reference: `https://variant.com/shared/a10468fa-9d2f-46df-8f88-0c588c6337bc?t=1777118224850`

This reference is an editorial market-data interface, not a conventional SaaS dashboard. It is useful for making UGA Index feel sharper, more financial, and less like a generic green/white landing page.

## Visual System

Transfer these elements:

- White background with strong black typography and thin black grid lines.
- Editorial headline scale, using a compact, uppercase, market-benchmark tone.
- Acid-lime accent blocks for live market state and selected commodity/category states.
- Data-grid layout instead of soft stacked marketing sections.
- Compact top navigation with a status pill such as `live markets`.
- Large first-viewport split:
  - left: brand/headline and short benchmark description,
  - center/right: market visual or accent panel,
  - right: commodity/category selector.
- Table rows with strong horizontal dividers and concise numeric columns.
- A small report/export CTA as an operational action.

Avoid copying these elements directly:

- `GLOBAL GRAIN MONITOR SYSTEM` branding.
- Wheat-only concept and wheat variety labels as primary navigation.
- Overlapping tiny annotations beside the main headline.
- Variant watermark or generated interface artifacts.
- Overly compressed desktop density that would hurt readability on real commodity data.

## Adaptation for UGA Index

Use the reference as a direction, not as a literal clone.

Recommended UGA Index adaptation:

- Header:
  - UGA logo on the left.
  - Compact nav: Index, Methodology, Analytics, About.
  - Status pill: `live index` / `опубліковано`.
  - Language switch remains visible.

- First viewport:
  - Replace current large marketing-style hero with a market board.
  - Headline examples:
    - `UGA INDEX / EXPORT PRICING`
    - Ukrainian: `UGA INDEX / ЕКСПОРТНІ ЦІНИ`
  - Keep short descriptor: fair Ukrainian export price benchmark, CPT Black Sea Panamax Ports (POC), T+30.
  - Add a right-side commodity selector with the four UGA commodities.
  - Use one visual market panel, preferably a grain/port/commodity texture or a clean abstract market panel.

- Index cards:
  - Make cards flatter and tighter.
  - Use black borders instead of soft shadow-heavy cards.
  - Keep green only for positive deltas and selected states.
  - Keep mini sparklines, but reduce decorative rounding.

- Latest quotations:
  - Move closer to the reference table style:
    - strong row dividers,
    - uppercase small headers,
    - compact commodity/basis/value/change/respondents columns.

- Report CTA:
  - Add a demo `Download report` / `Завантажити звіт` block.
  - It can be disabled or demo-only for now.

- Mobile:
  - Do not force the desktop grid onto mobile.
  - Keep the current responsive layout, but make the top cards horizontally scrollable and use a tighter header inspired by the mobile source screenshot.

## Implementation Scope Before Deployment

Recommended next implementation commit before deploy:

1. Refresh public homepage layout toward an editorial market board.
2. Add `live index` status pill and UGA logo-led header treatment.
3. Add right-side commodity selector/list in the first viewport.
4. Restyle index cards and latest quotes table with sharper borders and less card softness.
5. Add demo report-download CTA.
6. Preserve all existing functionality: locale switching, published-value updates, analytics links, and embed routes.

Defer until after first deployment:

- Real commodity/port photography or generated visual assets.
- Full sidebar navigation on the public site.
- Map/ports block from the previous screenshot.
- Advanced mobile bottom navigation.

## Design Decision

Adopt the Variant reference as the public homepage visual direction, but keep the application information architecture and UGA-specific content already implemented. The homepage should feel like a market terminal/editorial index board, while internal admin/respondent pages can remain utilitarian and form-first.
