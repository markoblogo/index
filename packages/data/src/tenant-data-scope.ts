import { getTenantContext, type TenantContext } from "@/lib/tenant-context";

export type IndexTenantDataScope = {
  tenantId: Exclude<TenantContext["tenantId"], "1d3x">;
  indexProductId: string;
};

export function getIndexTenantDataScope(
  context: TenantContext = getTenantContext(),
): IndexTenantDataScope {
  if (context.tenantId === "1d3x") {
    throw new Error("1D3X platform tenant does not own index market data.");
  }

  return {
    tenantId: context.tenantId,
    indexProductId: context.indexProductId ?? context.tenantId,
  };
}

export function tenantScopedWhere(context: TenantContext = getTenantContext()) {
  return getIndexTenantDataScope(context);
}
