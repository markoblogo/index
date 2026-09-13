# Dependency security

`npm run audit:dependencies` fails on critical vulnerabilities, expired risk entries, or vulnerable packages that cannot be traced to an explicitly reviewed direct dependency.

The current upstream backlog is rooted in one optional operational toolchain:

- `whatsapp-web.js` and its Puppeteer browser-download dependencies.

These packages remain under review because npm currently offers no non-breaking upgrade that clears their full advisory trees. The allowlist records roots and a review deadline; it does not mark the advisories fixed. CI fails if a new vulnerability appears outside those roots or the review date expires.

The repository uses `legacy-peer-deps=true` because the current Vitest browser peer graph causes npm's strict resolver to stall while building the ideal tree. The lock file remains authoritative, and CI uses the declared npm version.

Review procedure:

1. Run `npm audit --omit=dev --package-lock-only --json` after lock-file updates.
2. Prefer a current upstream patch over an override or forced downgrade.
3. Re-run `npm run audit:all` and focused WhatsApp checks.
4. Remove an allowlisted root as soon as its reachable advisory tree is clean.
