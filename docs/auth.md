# UGA Index Authentication Plan

UGA Index should use an allowlist-based authentication model in production.

## Intended Production Flow

1. An administrator creates or imports an allowlisted user by email.
2. The user role is assigned in advance:
   - `admin`
   - `respondent`
3. If the user is a respondent, the user is linked to exactly one respondent company.
4. The system sends a temporary password or password setup link by email.
5. The user signs in and sets a permanent password.
6. After login, the system redirects the user based on role.
7. Respondents can only access their own company daily form.
8. Admins can access all respondent submissions, benchmark comparison, calculation preview and publication workflow.
9. Future roles may include `UGA member`, `paid analytics user` and `API subscriber`.

## Current Preview Behavior

The current preview uses an allowlist flow. With `DATABASE_URL`, admin/respondent logins are read from the database auth tables where available. Respondents can sign in with a temporary password and set a permanent password. Without a database, local development falls back to the allowlist in `src/lib/demo-allowlist.ts`.

The login form accepts only email/login and password. Users do not choose roles manually. The role and respondent company are inferred from the demo allowlist.

Preview credentials:

- Admin: `admin@uga.ua` / `admin`
- Respondent: `bunge@uga-index.demo` / `respondent`

Presentation shortcuts are also supported:

- `admin` / `admin`
- `respondent` / `respondent`

## Production Implementation Options

Production authentication can be implemented with:

- Supabase Auth
- Auth.js
- custom credentials auth with hashed passwords
- Resend or another email provider for password setup links, temporary-password delivery and daily respondent survey requests

Before production launch, temporary passwords should be replaced with one-time setup links, audit logging should cover all account and role changes, and access control should be enforced at both page and data-access layers. Production deployments should set `UGA_INDEX_RUNTIME_MODE=production` and require `DATABASE_URL`.
