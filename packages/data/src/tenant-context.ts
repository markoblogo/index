import { getActiveIndexConfig, getActiveTenantId } from "@/lib/index-platform";
import { isPlatformSite, PLATFORM_TENANT_ID } from "@/lib/platform-site";

export type RuntimeMode = "production" | "demo" | "development";
export type TenantId =
  | typeof PLATFORM_TENANT_ID
  | ReturnType<typeof getActiveTenantId>;

export type TenantContext = {
  tenantId: TenantId;
  marketId?: string;
  indexProductId?: string;
  runtimeMode: RuntimeMode;
};

export function getRuntimeMode(): RuntimeMode {
  if (process.env.UGA_INDEX_RUNTIME_MODE === "production") {
    return "production";
  }

  if (process.env.UGA_INDEX_RUNTIME_MODE === "demo") {
    return "demo";
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function getTenantContext(): TenantContext {
  if (isPlatformSite()) {
    return {
      tenantId: PLATFORM_TENANT_ID,
      runtimeMode: getRuntimeMode(),
    };
  }

  const activeIndex = getActiveIndexConfig();

  return {
    tenantId: activeIndex.id,
    marketId: activeIndex.id,
    indexProductId: activeIndex.id,
    runtimeMode: getRuntimeMode(),
  };
}

export function isProductionRuntime(
  context: TenantContext = getTenantContext(),
) {
  return context.runtimeMode === "production";
}
