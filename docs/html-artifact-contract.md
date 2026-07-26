# HTML Artifact Contract

Purpose: define a lightweight HTML output standard for MediaHub, Cortex, status/report, and explainer artifacts that should open directly in a browser with no build step and remain reviewable as standalone files.

This contract is for authored or exported HTML artifacts, not for the main Next.js runtime.

## Best-fit use cases

- MediaHub status pages;
- incident and publishability reports;
- Cortex context/evidence review pages;
- implementation-plan or feature-explainer artifacts;
- temporary internal review pages shared as files or controlled static outputs.

## Required properties

- single-file HTML preferred;
- no build step required to open locally;
- meaningful `<title>` and visible `h1`;
- semantic structure that still reads clearly if CSS is removed;
- no dependency on remote CSS, fonts, analytics, or third-party scripts;
- all critical meaning present in text, not only color or graphics;
- graceful degradation on small screens and constrained readers.

## Authoring rules

- lead with a summary and current state;
- separate facts, decisions, risks, and next steps;
- prefer tables for repeated fields and lists for actions;
- use diagrams only when the relationship is genuinely clearer than prose;
- keep visual styling minimal and portable;
- include provenance or evidence links when the page claims status, incident cause, or review outcome.

## MediaHub / Cortex specifics

- MediaHub artifacts should distinguish source coverage, editorial synthesis, and publication state;
- Cortex artifacts should distinguish retrieved evidence, derived synthesis, exclusions, and approval boundaries;
- protected/private evidence must not be embedded into public-shareable HTML outputs.

## Non-goals

- no SPA behavior;
- no heavy interactive editor runtime;
- no replacement for the main application UI;
- no assumption that every HTML artifact belongs in the public site.

## Templates

- `docs/templates/html/media-hub-status-report.html`
- `docs/templates/html/cortex-context-pack-review.html`
