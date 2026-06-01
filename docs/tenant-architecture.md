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
Use `MarketPackTemplate` from `src/lib/market-pack-template.ts` for new
country/territory onboarding. The template requires tenant/market/product IDs,
brand/domain/locales/theme, methodology and legal assets, deployment env,
integration adapters, delivery bases, commodities and seed respondents. A
synthetic future pack is covered by unit tests so new packs can be validated
before they are added to the runtime tenant union.

## Database Migration State

Migration `20260601120000_tenant_market_foundation` creates:

- `Tenant`;
- `Market`;
- `IndexProduct`.

The follow-up migrations now backfill and require tenant/product scope on the
core market-data tables:

- `20260601124500_optional_tenant_scope_columns`;
- `20260601143000_require_tenant_scope`;
- `20260601150000_tenant_scoped_market_uniqueness`.

Market-data uniqueness for commodities, delivery bases, baskets, submissions,
calculations and publications is tenant-scoped. This allows UGA, Spike and
future country packs to reuse local commodity and delivery-basis codes without
cross-tenant collisions.

Current runtime reads for public index data, public APIs, admin daily inputs,
calculation/publication, respondent directory, audit export and operational
alerts already apply tenant scope.
