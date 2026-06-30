import { afterEach, describe, expect, it } from "vitest";
import { getBasketSiteUrl, getPlatformSiteUrl, isBasketSite, isPlatformSite } from "@/lib/platform-site";

const originalIndexTenant = process.env.INDEX_TENANT;
const originalNextPublicTenant = process.env.NEXT_PUBLIC_INDEX_TENANT;
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

describe("site mode detection", () => {
  afterEach(() => {
    process.env.INDEX_TENANT = originalIndexTenant;
    process.env.NEXT_PUBLIC_INDEX_TENANT = originalNextPublicTenant;
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it("detects Basket host mode without treating it as platform", () => {
    process.env.INDEX_TENANT = "1d3x-basket";
    process.env.NEXT_PUBLIC_INDEX_TENANT = "";

    expect(isBasketSite()).toBe(true);
    expect(isPlatformSite()).toBe(false);
  });

  it("detects platform mode separately", () => {
    process.env.INDEX_TENANT = "platform";
    process.env.NEXT_PUBLIC_INDEX_TENANT = "";

    expect(isPlatformSite()).toBe(true);
    expect(isBasketSite()).toBe(false);
  });

  it("uses Basket default URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "";

    expect(getBasketSiteUrl()).toBe("https://pop.1d3x.com");
    expect(getPlatformSiteUrl()).toBe("https://1d3x.com");
  });
});
