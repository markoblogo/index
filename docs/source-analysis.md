# Source Materials Analysis

This document summarizes the materials in `docs/source` and maps them to implementation work for the UGA Index demo.

## Files Reviewed

- `UGAlogo.png` - raster UGA/УЗА logo, 1456 x 894.
- `Індекс_спотових_експортних_цін_УЗА_UGA_Index.pdf` - 3-page overview/methodology document.
- `Методологія розрахунку UGA Index.pdf` - 3-page calculation methodology document.
- `photo_2026-05-08 14.55.23.jpeg` - desktop dashboard design reference, 1280 x 801.
- `photo_2026-05-08 14.55.26.jpeg` - mobile app design reference, 592 x 1280.

## Content Findings

The PDF content confirms and extends the current product model.

Core positioning:

- UGA Index is a market benchmark for fair export prices of Ukrainian agricultural commodities.
- The benchmark is based on daily price data from a defined pool of UGA member exporters and other representative market participants.
- UGA acts as the independent administrator and public publisher.
- Public values are aggregated; expanded analytics are intended for UGA members.

Data collection:

- Respondents provide end-of-day fair market price assessments.
- Prices should represent executable levels where the respondent is ready to transact.
- Standard delivery period is up to 30 days, represented as T+30 in the calculation methodology.
- Delivery basis is a required index parameter. Current demo default remains CPT UA Black Sea.
- Data is entered through the web UGA Index operational module by the index manager, with a future respondent workflow still useful for the demo.

Calculation methodology:

- Each index is defined by commodity, delivery basis, calculation date, and delivery period.
- One or more respondent baskets may form an index.
- For each basket, calculate the median.
- Exclude values deviating by more than +/-2% from the median.
- Basket value is the arithmetic average of the cleaned sample.
- Minimum respondent count is at least 5.
- If multiple baskets exist, the final index can be a weighted average of basket values.
- Basket weights are transparent methodology inputs, not daily discretionary changes.

Governance:

- Independent partner verification before publication is explicitly described.
- Corrections are allowed only before publication.
- Published values are immutable.
- Full audit log should record actor, timestamp, and changed values.
- Multiple calculation versions can exist before publication, for example v1 and v2.
- Final version is locked at publication.

Future expansion:

- Volume-weighted respondent or basket model.
- Forward indices for T+30, T+60, and T+90.
- Separate bid, offer, and mid quote types.
- External indices may be incorporated later.

## Visual Findings

Logo:

- `UGAlogo.png` is usable for demo branding, but it is a raster asset with a light gray background and slightly soft edges.
- Best short-term use: place it in the site header/sidebar at controlled height on white or near-white backgrounds.
- Better production step: request SVG/transparent PNG brand assets from UGA.

Desktop reference:

- Dashboard-style layout with a persistent left sidebar.
- UGA logo is prominent in the sidebar.
- Public homepage is closer to an index dashboard than a marketing landing page.
- Top section uses compact index cards with commodity icon, commodity name, USD/t, latest value, percent change, sparkline, and previous close.
- Primary content includes filters for date, commodity, and delivery basis.
- Latest quotations table is central.
- A map block shows export ports such as Odesa, Chornomorsk, Pivdennyi, Mykolaiv, and Izmail.
- There is an explicit report download action.
- Footer includes informational disclaimer.

Mobile reference:

- Mobile experience is card-first and highly compact.
- Header shows UGA logo, `UGA Index`, and notification icon.
- Date/calendar control is prominent.
- Index cards use circular commodity icons, sparkline fills, and green positive deltas.
- Segmented range control supports day/week/month.
- Larger chart block shows a main UGA Index movement line.
- Latest export quotations are list rows with value, delta, time/date, and chevron.
- Report export appears as a CTA row plus floating action button.
- Bottom navigation includes home, markets, quotations, favorites, and more.

## Implementation Backlog

High priority:

1. Add the UGA logo asset into the public and internal layout headers.
2. Replace text-only brand mark with logo + `UGA Index`.
3. Update About and Methodology copy with the exact concepts from the source PDFs:
   - fair market price,
   - executable level,
   - EOD,
   - T+30,
   - respondent baskets,
   - independent partner verification,
   - v1/v2 calculation versions,
   - immutable published values,
   - future T+60/T+90 and bid/offer/mid.
4. Add delivery period as a visible field in public methodology and admin calculation views.
5. Add an `Independent verification` placeholder/status in the admin calculation workflow.
6. Add a public disclaimer matching the source direction: data is informational and UGA is not liable for losses caused by use of the data.

Medium priority:

1. Make the homepage more dashboard-like:
   - reduce hero feel,
   - add tighter top cards,
   - add filter strip,
   - add previous close on cards,
   - keep weekly chart and latest quotations.
2. Add an export ports block or placeholder map using the ports shown in the desktop reference.
3. Add report download CTA as a demo action.
4. Improve mobile layout toward the reference:
   - compact header,
   - horizontal card row,
   - segmented day/week/month control,
   - mobile quotation list,
   - sticky bottom navigation if it does not conflict with web conventions.

Lower priority:

1. Convert or trace the UGA logo to a cleaner transparent asset if no official SVG is provided.
2. Add future quote type support for bid/offer/mid in the data model and UI labels.
3. Add forward period filters for T+30, T+60, and T+90 after the demo path is stable.
4. Add partner verification role after allowlist authentication is extended.

## Current Gap Summary

The current demo already covers the core calculation and publication mechanics. The largest gaps against the source materials are:

- UGA logo is not yet integrated.
- Methodology copy is accurate but not yet as complete as the supplied PDFs.
- Delivery period T+30 is not visible enough as a first-class index parameter.
- Independent verification before publication is not represented.
- Desktop/mobile UI can move closer to the supplied dashboard references.
- Export ports and report download are not yet represented on the public site.
