# Security Review: index

## Scope

- Scan mode: Codex Security Deep Security Scan, repository-wide.
- Repository: `/Users/antonbiletskiy-volokh/Downloads/Projects/index` at commit `9cd2a9f`.
- In scope: Next.js app routes, server actions, Prisma schema and migrations, tenant-scoped data access, admin/respondent auth and notification flows, cron/internal endpoints, setup/password flows, and market-data write paths.
- Artifacts reviewed: three rounds of worker discovery artifacts under `/tmp/codex-security-scans/index/9cd2a9f_20260601T125019Z/artifacts/deep_discovery`, canonical discovery artifacts under `artifacts/02_discovery`, validation notes in this report, and source-level code traces.
- Limitations: validation used static code tracing and existing local test/build evidence, not a live production database. Production deployment secrets and Vercel proxy behavior were not inspected.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 8 |
| Severity mix | 1 critical, 4 high, 3 medium |
| Confidence mix | 7 high, 1 medium |
| Coverage | 526 repository worklist rows generated; three deep-discovery rounds; Round 03 added no new canonical clusters |
| Validation mode | Centralized source trace over surviving canonical candidates |
| Final markdown | `/tmp/codex-security-scans/index/9cd2a9f_20260601T125019Z/report.md` |
| Final HTML | `/tmp/codex-security-scans/index/9cd2a9f_20260601T125019Z/report.html` |

## Threat Model

### Assets And Security Invariants

- Tenant-scoped market data for UGA, Spike and future index products must never be readable or writable across tenants.
- Admin, respondent and member sessions must be unforgeable and bound to the active tenant/product context.
- Respondent price submissions, survey tokens, contact data and publication controls are integrity-sensitive because they influence public market index values.
- Operational endpoints, cron jobs and internal setup helpers must be authenticated and fail closed in production.

### Trust Boundaries

- Internet-facing Next.js routes: public pages, `/login`, `/setup-password`, `/respondent/access/[token]`, respondent forms and public APIs.
- Authenticated admin/member/respondent server actions and pages.
- Cron/internal APIs protected by bearer secrets.
- Database rows shared by tenants when deployment uses a common production database.
- Third-party providers: Resend, Telegram, MN7R/NBU integrations.

### Attacker-Controlled Inputs

- Cookies and form fields submitted to login/setup/respondent/admin routes.
- Survey access tokens delivered through email or Telegram.
- Admin form ids such as respondent, contact, commodity and auth-account identifiers.
- Forwarded request headers when not guaranteed by the deployment proxy.
- Tenant selection through deployment env and host configuration.

### Highest-Risk Failure Modes

- Forged sessions or setup flows that allow account takeover or role confusion.
- Missing tenant scoping on database reads/writes that causes cross-tenant data exposure or index pollution.
- Reusable bearer tokens or plaintext secrets that allow respondent impersonation.
- Internal setup helpers that retain broad mutation or credential exposure paths outside tightly controlled development.

## Findings

| # | Severity | Confidence | Title |
| --- | --- | --- | --- |
| 1 | critical | high | [Unsigned legacy sessions allow forged admin/respondent access](#1-unsigned-legacy-sessions-allow-forged-adminrespondent-access) |
| 2 | high | high | [Database login is not scoped to the active tenant](#2-database-login-is-not-scoped-to-the-active-tenant) |
| 3 | high | high | [Respondent survey reads and writes are not fully tenant-owned](#3-respondent-survey-reads-and-writes-are-not-fully-tenant-owned) |
| 4 | high | high | [Admin respondent management mutates child records by unscoped ids](#4-admin-respondent-management-mutates-child-records-by-unscoped-ids) |
| 5 | high | high | [Admin daily inputs can write prices for arbitrary respondent ids](#5-admin-daily-inputs-can-write-prices-for-arbitrary-respondent-ids) |
| 6 | medium | high | [Survey access tokens are reusable plaintext bearer tokens without tenant scope](#6-survey-access-tokens-are-reusable-plaintext-bearer-tokens-without-tenant-scope) |
| 7 | medium | high | [Respondent notification scheduling and Telegram token issuance are not tenant-scoped](#7-respondent-notification-scheduling-and-telegram-token-issuance-are-not-tenant-scoped) |
| 8 | medium | medium | [Spike admin respondent preview selects an unscoped respondent](#8-spike-admin-respondent-preview-selects-an-unscoped-respondent) |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct source, configuration, or runtime evidence supports the finding, with no material unresolved reachability or exploitability blocker. |
| medium | Source evidence supports a plausible issue, but runtime behavior, deployment configuration, role reachability, type constraints, or exploit reliability still need proof. |
| low | Weak or incomplete evidence; included only for follow-up candidates. |

### [1] Unsigned legacy sessions allow forged admin/respondent access

| Field | Value |
| --- | --- |
| Severity | critical |
| Confidence | high |
| Confidence rationale | The cookie parser accepts legacy payloads without verifying the signature, and role gates trust the parsed role and password setup status directly. |
| Category | Authentication bypass / session forgery |
| CWE | CWE-347 Improper Verification of Cryptographic Signature; CWE-287 Improper Authentication |
| Affected lines | `src/lib/demo-auth.ts:47-62`, `src/lib/demo-auth.ts:64-110`, `src/lib/demo-auth.ts:305-316`, `src/lib/demo-auth.ts:382-385`, `src/app/api/setup-password/route.ts:29-35`, `src/lib/password-setup.ts:21-40`, `src/lib/password-setup.ts:56-78` |

#### Summary

`verifyLegacySignedCookie` returns the payload whenever the cookie contains two dot-separated parts; it does not validate the signature. `parseDemoSessionCookieValue` then accepts that payload as a `DemoUser`, and `requireDemoRole` treats it as an authenticated admin or respondent session. The setup-password endpoint also accepts a form-supplied `setupSession`, so the same unsigned legacy payload can be used to select an account and set a permanent password.

#### Validation

Static validation traced `getCurrentDemoUser` to `parseDemoSessionCookieValue`, then to `verifySessionCookie`. For values that are not `session.*` or `demo.*`, `verifyLegacySignedCookie` only checks that both payload and signature strings exist. `parseSessionPayload` allows attacker-provided `role`, `userId`, `email`, `respondentId`, `companyName`, `passwordSetupStatus`, `issuedAt`, and `expiresAt` when types are valid. No database lookup confirms that the session user exists or belongs to the active tenant before role access is granted.

#### Dataflow

Attacker cookie or `setupSession` form field -> `parseDemoSessionCookieValue` -> `verifyLegacySignedCookie` returns unverified payload -> `parseSessionPayload` creates `DemoUser` -> `requireDemoRole` grants admin/respondent access or `/api/setup-password` calls `setPermanentPasswordForUser` -> password/session is minted for the chosen identity.

#### Reachability

The affected routes are normal web entry points: protected admin/respondent pages read the session cookie, and `/api/setup-password` reads form data. An unauthenticated attacker can construct a base64url JSON payload with role `admin` and `passwordSetupStatus` `active`, or choose a respondent id for respondent flows.

#### Severity

Critical: this is a direct internet-facing session forgery primitive that can grant admin/respondent access and can be used to reset passwords through the setup flow. Severity would drop only if production deployments provably block legacy cookie parsing and form-supplied setup sessions before these functions run.

#### Remediation

Remove unsigned legacy session support entirely, or require a valid HMAC for every accepted session format. Do not accept `setupSession` from form data; use only an httpOnly signed cookie or one-time setup token. Add tests proving forged legacy cookies and form-supplied sessions are rejected in production and development.

### [2] Database login is not scoped to the active tenant

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | The database login query selects by email/role without `tenantScopedWhere`, then issues a session under the currently active tenant runtime. |
| Category | Cross-tenant authentication / tenant confusion |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key; CWE-863 Incorrect Authorization |
| Affected lines | `src/lib/demo-allowlist.ts:217-240`, `src/lib/demo-allowlist.ts:278-336`, `src/lib/demo-allowlist.ts:339-360` |

#### Summary

When `DATABASE_URL` is configured, login falls through to `authenticateDatabaseUser`. That function computes `activeIndex` but does not use it in the `db.user.findFirst` query. In a shared database, the first matching active user with that email and role can be authenticated into the active tenant context.

#### Validation

The query at `src/lib/demo-allowlist.ts:280-293` filters `active`, `email`, and role, but not `tenantId` or `indexProductId`. `authenticateFirstDatabaseRespondent` also chooses the first active respondent globally before delegating back to the same unscoped login path.

#### Dataflow

Login request -> `authenticateAllowlistedUser` -> `authenticateDatabaseUser` -> unscoped `db.user.findFirst` -> password verification against the returned user -> returned `DemoAllowlistUser` is converted into a session for the active deployment.

#### Reachability

Any user who can submit login credentials can trigger the path. The impact requires either duplicate emails across tenants, shared demo credentials, or the `respondent/respondent` shortcut in a shared database.

#### Severity

High: this breaks the core tenant isolation invariant for authentication in shared-database deployments. Severity would drop if production always uses one database per tenant and enforces unique email values outside the app.

#### Remediation

Add `...tenantScopedWhere()` or an equivalent active tenant predicate to every database login and first-respondent lookup. Add tests with two tenants sharing the same email and prove the inactive tenant cannot log into the active deployment.

### [3] Respondent survey reads and writes are not fully tenant-owned

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Respondent, commodity and submission queries use caller/session ids without consistently applying tenant scope or ownership checks. |
| Category | Cross-tenant IDOR / price submission integrity |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key; CWE-862 Missing Authorization |
| Affected lines | `src/lib/respondent-survey.ts:247-285`, `src/lib/respondent-survey.ts:315-384` |

#### Summary

The respondent survey data loader fetches `Respondent` by global id and fetches commodities without tenant scope. The save path scopes the upsert unique key by the active tenant but still accepts the session respondent id and commodity ids without proving they belong to that tenant. This can expose another tenant respondent name and can create active-tenant submissions tied to foreign respondent or commodity ids.

#### Validation

`getDatabaseRespondentSurveyData` scopes delivery bases but uses `db.respondent.findUnique({ where: { id: respondentId } })` and `db.commodity.findMany({ where: { status: "published" } })`. `saveDatabaseRespondentSurvey` scopes delivery bases but loads commodities by id only, then creates `PriceSubmission` with the active tenant plus caller-provided `respondentId` and `commodityId`.

#### Dataflow

Respondent session `respondentId` and form `price:<commodityId>` fields -> survey data/read or save functions -> unscoped respondent/commodity lookup -> `PriceSubmission.upsert` under active tenant with unverified ids.

#### Reachability

A respondent session can reach these flows. The unsigned session finding makes arbitrary respondent ids trivial, but this remains a tenant-ownership bug that should be fixed independently because survey token/session creation paths also bind respondent ids from token records.

#### Severity

High: the vulnerable write path can pollute market-data inputs, and the read path can disclose respondent identities across tenants. Severity would drop if production databases are physically separated and never share ids.

#### Remediation

Require `tenantScopedWhere()` on respondent and commodity lookups, validate that the session respondent belongs to the active tenant, and reject entries for unknown or foreign commodities before any upsert. Add cross-tenant repository tests for survey read and save.

### [4] Admin respondent management mutates child records by unscoped ids

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Multiple admin server-side respondent actions mutate contacts, auth accounts, users and basket links by raw ids before or without tenant ownership proof. |
| Category | Authorization bypass / cross-tenant object mutation |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key; CWE-862 Missing Authorization |
| Affected lines | `src/lib/respondent-directory.ts:650-676`, `src/lib/respondent-directory.ts:679-708`, `src/lib/respondent-directory.ts:711-740`, `src/lib/respondent-directory.ts:743-785`, `src/lib/respondent-directory.ts:788-838`, `src/lib/respondent-directory.ts:841-887` |

#### Summary

The admin respondent directory functions partially scope the parent respondent but child-object mutations do not consistently prove tenant ownership. Contact update/delete, auth-account upsert/reset, and delete child cleanup operate by `respondentId` or `contactId` without tenant-qualified joins or prior scoped parent lookup.

#### Validation

Examples include `respondentAuthAccount.deleteMany({ where: { respondentId: id } })`, `respondentContact.updateMany({ where: { respondentId: id } })`, `respondentContact.update({ where: { id: input.contactId } })`, `respondentAuthAccount.upsert({ where: { respondentId: input.respondentId } })`, and password reset user updates using `OR: [{ respondentId }, { email: auth.loginEmail }]` without tenant scope.

#### Dataflow

Authenticated admin form values -> respondent directory server action -> raw respondent/contact/auth ids -> Prisma update/upsert/delete on child records -> cross-tenant child records mutated even when parent update is scoped or skipped.

#### Reachability

The actions are admin-only, but admin users are in scope for tenant isolation. If an admin can submit or tamper with ids from another tenant in a shared database, these paths can disable contacts, reset auth accounts, relink users, or deactivate basket links.

#### Severity

High: this is a cross-tenant integrity and account-management issue in privileged workflows. Severity would drop if production never shares tenant data and admin form ids cannot be tampered with.

#### Remediation

Start each mutation with a scoped parent lookup, and perform child mutations only through tenant-owned parent relationships or scoped joins. Add tests that use foreign tenant `respondentId`, `contactId`, and auth account rows and assert no mutation occurs.

### [5] Admin daily inputs can write prices for arbitrary respondent ids

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | The admin save path trusts respondent ids parsed from form field names and upserts active-tenant submissions without verifying respondent ownership. |
| Category | Market-data integrity / cross-tenant IDOR |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key; CWE-862 Missing Authorization |
| Affected lines | `src/lib/admin-daily-inputs.ts:423-502`, `src/lib/admin-daily-inputs.ts:541-580` |

#### Summary

`parseSubmittedPrices` extracts `commodityId` and `respondentId` directly from field names. `saveDatabaseDailyInputs` validates commodity and basis tenant scope but does not verify that each respondent id belongs to the active tenant before writing `PriceSubmission` rows.

#### Validation

The upsert unique key uses the active `tenantId` and the submitted `respondentId`. The create payload repeats the active tenant scope with the submitted respondent id, which can create inconsistent active-tenant market data for a foreign or invalid respondent id.

#### Dataflow

Admin form key `price:<commodityId>:<respondentId>` -> `parseSubmittedPrices` -> `saveDatabaseDailyInputs` -> `PriceSubmission.upsert` with active tenant and unverified respondent id.

#### Reachability

Authenticated admins can submit the form. A malicious or compromised tenant admin, or an attacker with the session forgery issue, can tamper with hidden form fields or request bodies.

#### Severity

High: the path can alter market-data inputs used for calculations and publication. Severity would drop if daily input submissions are not exposed to tenant admins in shared deployments.

#### Remediation

Load active respondents with `tenantScopedWhere()` for the submitted ids and reject entries whose respondent is absent. Consider deriving respondent ids from server-side loaded daily-input state rather than trusting form field names.

### [6] Survey access tokens are reusable plaintext bearer tokens without tenant scope

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Schema and access route show tokens are stored as unique plaintext, looked up without tenant scope, and `usedAt` is written but never checked. |
| Category | Bearer token replay / tenant binding gap |
| CWE | CWE-294 Authentication Bypass by Capture-replay; CWE-522 Insufficiently Protected Credentials |
| Affected lines | `prisma/schema.prisma:292-304`, `src/app/respondent/access/[token]/route.ts:31-61`, `src/lib/respondent-email.ts:292-305`, `src/lib/respondent-telegram.ts:208-220` |

#### Summary

Respondent survey tokens are generated as random bearer strings and stored directly in the database. The access route looks up by the plaintext token and checks expiry and respondent status, but not `usedAt`, tenant, or index product. It then sets `usedAt` after successful access, so the token can be reused until expiry.

#### Validation

`RespondentSurveyToken` lacks `tenantId`, `indexProductId`, and token digest fields. `/respondent/access/[token]` uses `findUnique({ where: { token } })`; the validity check omits `usedAt === null`; email and Telegram creation persist the raw token.

#### Dataflow

Email/Telegram token generation -> plaintext token row -> recipient link `/respondent/access/<token>` -> unscoped token lookup -> respondent session cookie minted -> `usedAt` updated but not enforced.

#### Reachability

Anyone with the link can replay it within the expiry window. The token is delivered over email/Telegram and can appear in logs, browser history, referrers, support screenshots, or database reads.

#### Severity

Medium: this enables respondent impersonation for a bounded survey window and can combine with tenant gaps to affect price submissions. Severity would rise if tokens are long-lived or if links are exposed through logs or third-party analytics.

#### Remediation

Store only a token digest, add tenant/index scope to the token model and lookup, enforce `usedAt: null` before minting a session, and invalidate prior outstanding tokens per respondent/contact when issuing a new one.

### [7] Respondent notification scheduling and Telegram token issuance are not tenant-scoped

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Schedule and sent-today state are global, and Telegram recipient/token creation queries omit active tenant scope. |
| Category | Cross-tenant notification and token issuance confusion |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key; CWE-668 Exposure of Resource to Wrong Sphere |
| Affected lines | `prisma/schema.prisma:260-273`, `src/lib/respondent-directory.ts:258-313`, `src/lib/respondent-email.ts:218-240`, `src/lib/respondent-telegram.ts:77-110`, `src/lib/respondent-telegram.ts:112-141`, `src/lib/respondent-telegram.ts:208-220` |

#### Summary

Email schedule configuration is a singleton row with id `default`, with no tenant fields. Scheduled-send dedupe counts all sent deliveries for the day globally. Telegram recipient selection queries active self-service respondents without `tenantScopedWhere`, then creates unscoped survey tokens for those respondents.

#### Validation

The Prisma model has no tenant/index fields. `getRespondentEmailScheduleData` and `updateRespondentEmailScheduleData` always use `id: default`. `wasScheduledEmailAlreadySentToday` counts deliveries only by time/status/trigger. `getTelegramRecipients` and `getSmokeRecipients` omit tenant scope, and `createSurveyUrl` writes a token without tenant scope.

#### Dataflow

Cron/internal notification trigger -> global schedule or unscoped respondent query -> delivery rows and survey tokens created for respondents that may belong to a different tenant -> recipient receives a survey link for the wrong deployment context.

#### Reachability

The path requires a scheduled cron or internal notification trigger. It is still relevant because production cron tasks are intended operational workflows for respondent collection.

#### Severity

Medium: this can suppress notifications for one tenant after another tenant sends, or issue survey links to the wrong tenant's contacts. Severity would rise if cron secrets are shared broadly or if a tenant admin can trigger these paths manually.

#### Remediation

Add tenant/index scope to schedule, delivery and survey-token models. Scope all notification recipient queries and sent-today checks. Add tenant-specific tests for scheduled email and Telegram token issuance.

### [8] Spike admin respondent preview selects an unscoped respondent

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | medium |
| Confidence rationale | The code clearly selects a first active respondent without tenant scope, but reachability is limited to Spike admins and preview behavior. |
| Category | Tenant confusion / respondent impersonation preview |
| CWE | CWE-639 Authorization Bypass Through User-Controlled Key |
| Affected lines | `src/lib/demo-auth.ts:77-88`, `src/lib/demo-auth.ts:161-194` |

#### Summary

When a Spike admin reaches a respondent-only route, `requireDemoRole` creates a respondent preview user. The preview function selects the first active self-service respondent globally, without tenant scope, and returns a respondent session using that respondent id and legal name.

#### Validation

The query in `getSpikeAdminRespondentPreviewUser` filters active/status/collection mode and an excluded monitor id, but does not include `tenantScopedWhere()`. The returned session uses the selected respondent id directly.

#### Dataflow

Spike admin session -> respondent-only route -> `requireDemoRole` preview branch -> unscoped `db.respondent.findFirst` -> respondent preview session bound to selected respondent id.

#### Reachability

The actor must be a Spike admin. The impact is narrower than public session forgery, but in shared databases it can bind a privileged preview session to another tenant's respondent.

#### Severity

Medium: this can expose or modify respondent survey data through preview workflows, but requires an admin role and the preview branch. Severity would rise if tenant admins routinely use this preview in production shared databases.

#### Remediation

Add tenant scope to the respondent query, and prefer an explicit tenant-owned fallback respondent id rather than first-row selection. Add a test with a foreign tenant respondent created earlier than the Spike respondent.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Demo/session auth | Session forgery | Reported | Legacy parser accepts unsigned payloads and setup flow trusts parsed sessions. |
| Database login | Cross-tenant auth | Reported | Login queries omit active tenant scope. |
| Respondent survey | Tenant data isolation | Reported | Read/write paths mix scoped and unscoped ids. |
| Respondent admin directory | Tenant data isolation | Reported | Child mutations by raw ids lack complete tenant ownership proof. |
| Admin daily inputs | Market-data integrity | Reported | Respondent ids are trusted from form keys. |
| Survey token model/access | Bearer token replay | Reported | Plaintext, reusable, no tenant scope. |
| Email/Telegram notifications | Cross-tenant operational flow | Reported | Global schedule and unscoped Telegram recipient selection. |
| Spike admin respondent preview | Tenant confusion | Reported | First active respondent query is unscoped. |
| Rate limiting | Abuse control | Needs follow-up | Code trusts forwarded IP headers; reportability depends on Vercel/proxy normalization guarantees. |
| `/api/internal/spike-setup` | Internal setup helper | Needs follow-up | Production is disabled, but non-production helper still has broad mutations and temporary-password exposure switches. Keep blocked from production and remove after migration. |
| Cron endpoints | Internal auth | No issue found | Production cron auth fails closed when secrets are missing. |
| Security headers | Browser hardening | No issue found | Global CSP/HSTS/referrer/permissions headers are configured; embed CSP is scoped separately. |
| Dependency audit | Supply chain advisories | No issue found | `npm audit --omit=dev` returned zero vulnerabilities in the local scan. |

## Open Questions And Follow Up

- Validate the rate-limit header trust against the exact production ingress: confirm whether clients can directly set `x-forwarded-for` or `x-real-ip` before Vercel/platform normalization.
- Review production Vercel env and database topology: if tenants are physically separated today, still fix tenant-scoped code before any shared-database rollout.
- Remove or permanently quarantine `/api/internal/spike-setup` after the setup migration; keep it unavailable in production.
- After fixes, run targeted regression tests for forged legacy cookies, cross-tenant login, survey token replay, respondent/admin IDORs, and notification tenant scope.
