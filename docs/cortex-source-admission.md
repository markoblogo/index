# 1D3X Cortex Source Admission

Status: operational policy
Updated: 2026-08-08

This policy defines what the Index-owned Cortex scanner may admit into the
local long-term retrieval corpus.

## Admitted repository knowledge

For the `index-platform` root, the scanner is fail-closed.

Approved top-level directories:

- `docs/`
- `fixtures/`
- `prisma/`
- `public/`
- `scripts/`
- `services/`
- `src/`
- `tests/`

Approved top-level files:

- `AGENTS.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `components.json`
- `eslint.config.mjs`
- `next-env.d.ts`
- `next.config.ts`
- `next.config.test.ts`
- `playwright.config.ts`
- `postcss.config.mjs`
- `prisma.config.ts`
- `railway.json`
- `tailwind.config.ts`
- `tsconfig.json`
- `vercel.json`
- `vitest.config.ts`
- top-level `.pdf` knowledge artifacts

Every admitted `index-platform` file is treated as:

- trust level: `canonical`
- canonical status: `canonical`
- provenance expectation: `repo-committed-path`

The scanner records this on each source-manifest entry through `admission`.

## Explicitly excluded material

The scanner must not admit runtime or transient repository material as Cortex
knowledge.

Examples:

- hidden top-level/session directories such as `.whatsapp-session*`
- cache roots such as `.wwebjs_cache/`
- generated Cortex artifacts under `.cortex/`
- build/test/runtime directories such as `.next/`, `dist/`, `coverage/`,
  `playwright-report/`, `test-results/`, `tmp/`
- secret-like files matching `.env*`, `*.pem`, `*.key`, `*secret*`,
  `*credentials*`
- any new unapproved top-level directory

Unknown top-level directories are excluded by default. They do not become
Cortex knowledge automatically.

## Non-canonical generated/imported artifacts

External/generated material is not automatically canonical knowledge.

Examples in the current pipeline:

- `.cortex/mn7r-source-snapshot.json`
- `.cortex/cropto-source-manifest.json`

These are admitted only through explicit merge steps in the artifact pipeline.
They remain imported evidence with their own provenance and visibility rules;
they are not reclassified as canonical Index repository knowledge.

## Where manifests come from

- `npm run cortex:source-scan` writes a local source snapshot.
- `npm run cortex:source-ingest` writes both the source manifest and the source
  ledger.
- `npm run cortex:source-chunk` builds the local chunk manifest from the ledger.

The scanner implementation is `src/lib/cortex-source-scanner.ts`.

## Safe rebuild / cleanup

Source-manifest and chunk-manifest artifacts are reproducible local outputs.
They may be rebuilt when the corpus policy changes.

Index-only rebuild:

```bash
npm run cortex:source-ingest -- \
  --root=index:index-platform:/Volumes/Work/Work/index:internal \
  --manifest=.cortex/source-manifest.json \
  --ledger=.cortex/source-ledger.json

npm run cortex:source-chunk -- --all \
  --ledger=.cortex/source-ledger.json \
  --out=.cortex/chunk-manifest.json
```

Optional report:

```bash
npm run cortex:source-hygiene-report -- \
  --manifest=.cortex/source-manifest.json
```

Do not treat `.cortex/` artifacts as canonical source-of-truth files. Rebuild
them from approved sources instead.

## Adding a new approved source root

1. Decide whether the material is canonical repository knowledge or imported
   generated evidence.
2. If canonical, add the new top-level directory/file explicitly in
   `src/lib/cortex-source-scanner.ts`.
3. Add or update tests in `src/lib/cortex-source-scanner.test.ts`.
4. Rebuild the local manifest/chunks and verify that the resulting context pack
   contains expected knowledge without runtime noise.

Do not widen admission by adding a broad recursive scan or a catch-all pattern.
