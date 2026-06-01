# 1D3X Tenant Architecture

The platform is moving to a workspace monorepo with explicit tenant and market
scope. The current runtime still lives in the root Next.js app while package
boundaries are introduced incrementally.

## Runtime Scope

`TenantContext` is the request/runtime scope:

```ts
{
  tenantId: "1d3x" | "uga-ua" | "spike-ua",
  marketId?: string,
  indexProductId?: string,
  runtimeMode: "production" | "demo" | "development"
}
```

Production data-access code should resolve this context before reading or
writing market data. Module-level active tenant config is acceptable only for
build-time presentation defaults and market-pack metadata.

## Market Packs

Market packs describe product-specific configuration:

- brand/domain/locales/theme;
- required and optional deployment env;
- commodities and delivery bases through the existing index config;
- enabled integrations such as Resend, NBU FX, MN7R and Telegram.

UGA and Spike are market packs under the 1D3X ecosystem. Future countries or
territories should be added as new market packs rather than copied projects.

## Database Migration State

Migration `20260601120000_tenant_market_foundation` creates:

- `Tenant`;
- `Market`;
- `IndexProduct`.

It intentionally does not yet add required tenant foreign keys to the existing
market-data tables. That cutover needs a dedicated backfill migration because
existing UGA and Spike deployments may use separate production databases today.

The next migration phase should:

1. Add nullable tenant/product columns to market-data tables.
2. Backfill rows from the deployment tenant and configured market pack.
3. Add tenant-scoped unique indexes.
4. Update repositories to require `TenantContext`.
5. Make tenant/product columns required after validation.

