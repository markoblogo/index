# 1D3X Workspace Migration Boundaries

The current production runtime remains in the root Next.js app while the codebase
is migrated toward npm workspaces.

- `apps/platform-web`: runnable 1D3X umbrella site entrypoint.
- `apps/index-web`: runnable UGA/Spike index entrypoint for public index,
  embeds, admin and respondent surfaces.
- `index-engine`: calculation, publication, outlier rules and locks.
- `data`: tenant-scoped repositories and Prisma access.
- `auth`: sessions, setup links, survey tokens and role checks.
- `integrations`: MN7R, NBU FX, Resend, Telegram and future providers.
- `ui`: tenant-neutral UI primitives.
- `market-packs`: UGA, Spike and future country/territory market packs.

New shared code should move into these package boundaries once the corresponding
runtime caller can import it without changing external behavior.
