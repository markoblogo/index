# 1D3X Cortex Artifact Pipeline

Status: operational runbook
Updated: 2026-07-14

This runbook turns the current agro-commodity ecosystem sources into a bounded
Cortex memory artifact that Index can use through
`POST /api/internal/cortex/context-pack`.

The pipeline is intentionally file-based for the current phase. It proves source
coverage, visibility gates and repeatable context-pack generation before a
vector store or dedicated Cortex service is introduced.

## Inputs

- Index repository docs, app code, MediaHub context, plans and source contracts.
- MN7R protected source snapshot exported by MN7R:
  `.cortex/mn7r-source-snapshot.json`.
- Cr0pto source manifest exported by Cr0pto:
  `.cortex/cropto-source-manifest.json`.

MN7R must redact its snapshot before Index ingests it. Index treats MN7R raw
source chunks as `protected`. Cr0pto public Markdown docs can be `public`;
prototype internals are normally `internal`.

## Local Artifact Flow

From the Index repository:

For the normal local flow, build the full runtime artifact with one command:

```bash
npm run cortex:artifact-build -- \
  --require-project=index \
  --require-project=mn7r \
  --require-project=cropto \
  --min-chunks=100
```

This writes the source manifest, source ledger, base chunk manifest and
`.cortex/chunk-manifest.runtime.json`, then runs the artifact smoke gate.
Optional product-authored artifacts are merged automatically when present at:

- `.cortex/mn7r-source-snapshot.json`
- `.cortex/cropto-source-manifest.json`

The lower-level manual flow remains useful when debugging a specific stage.

```bash
npm run cortex:source-ingest -- \
  --preset=ecosystem-local \
  --manifest=.cortex/ecosystem-source-manifest.json \
  --ledger=.cortex/source-ledger.json
```

This scans Index, MN7R and Cr0pto local roots when present and writes:

- `.cortex/ecosystem-source-manifest.json`
- `.cortex/source-ledger.json`

Seed the base chunk manifest:

```bash
npm run cortex:source-chunk -- --all \
  --ledger=.cortex/source-ledger.json \
  --out=.cortex/chunk-manifest.json
```

If MN7R has exported a protected source snapshot, merge it:

```bash
npm run cortex:mn7r-snapshot-chunk -- \
  --snapshot=.cortex/mn7r-source-snapshot.json \
  --base=.cortex/chunk-manifest.json \
  --out=.cortex/chunk-manifest.with-mn7r.json
```

If Cr0pto has exported its source manifest, merge it:

```bash
npm run cortex:cropto-source-chunk -- \
  --manifest=.cortex/cropto-source-manifest.json \
  --base=.cortex/chunk-manifest.with-mn7r.json \
  --out=.cortex/chunk-manifest.runtime.json
```

If one of the product-specific artifacts is absent, skip that merge and use the
latest available chunk manifest as the runtime artifact.

## Smoke Checks

Search the runtime artifact:

```bash
npm run cortex:memory-search -- \
  --chunks=.cortex/chunk-manifest.runtime.json \
  --query="monitor vs index corn CPT context"
```

Build a protected internal context pack:

```bash
npm run cortex:context-pack -- \
  --chunks=.cortex/chunk-manifest.runtime.json \
  --query="monitor vs index corn CPT context" \
  --purpose=monitor-index-comparison \
  --allow-protected \
  --out=.cortex/context-pack.monitor-index.json
```

Build a public/internal-only pack without protected evidence:

```bash
npm run cortex:context-pack -- \
  --chunks=.cortex/chunk-manifest.runtime.json \
  --query="Cr0pto indexed trading scenario with public index evidence" \
  --purpose=source-review \
  --out=.cortex/context-pack.cropto-public.json
```

The no-`--allow-protected` run should exclude protected evidence. Do not forward
excluded evidence to OpenAI or other external model providers.

Smoke-test the promoted runtime artifact:

```bash
npm run cortex:artifact-smoke -- \
  --manifest=.cortex/chunk-manifest.runtime.json \
  --require-project=index \
  --require-project=mn7r \
  --require-project=cropto \
  --min-chunks=100
```

This is the local gate before wiring an artifact into runtime retrieval: the
manifest must be non-empty, internally consistent, and cover the expected
ecosystem projects.

## Artifact Promotion

The runtime artifact must be published to controlled storage; `.cortex/` stays
out of Git and public Vercel assets. Index provides a storage-provider-neutral
promotion command for an authenticated upload endpoint:

```bash
export CORTEX_ARTIFACT_UPLOAD_URL="https://<private-artifact-store>/cortex/chunk-manifest.runtime.json"
export CORTEX_ARTIFACT_UPLOAD_TOKEN="<upload-token>"
npm run cortex:artifact-publish -- \
  --manifest=.cortex/chunk-manifest.runtime.json
```

The command validates the Cortex product/schema, a minimum chunk count and
coverage for `index`, `mn7r` and `cropto`, then performs a bearer-authenticated
`PUT`. Uploads use gzip and send `Content-Encoding: gzip` by default to reduce
the runtime artifact size; set `CORTEX_ARTIFACT_UPLOAD_GZIP=0` only when the
storage endpoint cannot preserve content encoding. It never accepts or prints
tokens. Configure the corresponding read URL as
`CORTEX_CHUNK_MANIFEST_URL` and, if the store requires it, set
`CORTEX_CHUNK_MANIFEST_BEARER_TOKEN` for the deployed Index runtime.

The upload endpoint is intentionally infrastructure-specific and is not
implemented by the Next.js app. The same command can target a private object
store, a signed upload gateway or a future Cortex service.

The first Railway deployment is
`https://1d3x-cortex-runtime-production.up.railway.app`. The repository
includes a minimal storage
service in [`services/cortex-runtime`](../services/cortex-runtime/README.md).
It uses a persistent `/data` volume, validates uploads, and exposes the exact
read contract expected by Index. Keep its runtime token separate from
`CORTEX_INTERNAL_API_SECRET`.

## Runtime Configuration

The internal context-pack API reads the server-side chunk artifact from:

1. `CORTEX_CHUNK_MANIFEST_URL`
2. `CORTEX_CHUNK_MANIFEST_PATH`
3. `.cortex/chunk-manifest.json`

Use `CORTEX_CHUNK_MANIFEST_BEARER_TOKEN` when the hosted artifact requires a
bearer token. The API does not accept client-provided manifest paths or URLs.

For local runtime testing, point Index at the merged artifact:

```bash
CORTEX_CHUNK_MANIFEST_PATH=.cortex/chunk-manifest.runtime.json
```

The API is authorized by `CORTEX_INTERNAL_API_SECRET` or `CRON_SECRET`.

## Promotion Rules

- Commit source-code and docs changes, not `.cortex/` runtime artifacts.
- Keep `.cortex/` artifacts local or publish them to a controlled artifact
  location.
- Promote a runtime artifact only after source scan, chunking, search and at
  least one context-pack smoke check and one artifact smoke check pass.
- Protected chunks can enter external model prompts only through explicit
  `allowProtected` workflows with redaction and audit.
- Secret chunks must not be included in context packs.

## Troubleshooting

- Missing MN7R data: run the MN7R `cortex:source-snapshot` exporter first.
- Missing Cr0pto data: run Cr0pto `cortex:source-manifest` first.
- Stale repo content: run `cortex:source-ingest` before `cortex:source-chunk`.
- Empty search results: check `ownerProject`, `sourceKind`, visibility filters
  and whether the chosen runtime artifact is the merged one.
- Protected evidence unexpectedly absent: rerun context-pack generation with
  `--allow-protected` only if the workflow is approved for protected data.
