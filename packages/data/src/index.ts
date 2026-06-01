export { allowMockFallback, db, hasDatabaseUrl } from "@/lib/db";
export {
  getIndexTenantDataScope,
  tenantScopedWhere,
  type IndexTenantDataScope,
} from "@/lib/tenant-data-scope";
export {
  getRuntimeMode,
  getTenantContext,
  isProductionRuntime,
  type RuntimeMode,
  type TenantContext,
  type TenantId,
} from "@/lib/tenant-context";
