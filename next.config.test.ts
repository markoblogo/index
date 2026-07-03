import { describe, expect, it } from "vitest";
import nextConfig, { buildImageRemotePatterns } from "./next.config";

describe("next config", () => {
  it("restricts next/image remote hosts to known HTTPS sources", () => {
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      hostname: "cdn.jsdelivr.net",
      protocol: "https",
    });
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      hostname: "raw.githubusercontent.com",
      protocol: "https",
    });
    expect(nextConfig.images?.remotePatterns).not.toContainEqual({
      hostname: "**",
      protocol: "https",
    });
    expect(nextConfig.images?.remotePatterns).not.toContainEqual({
      hostname: "**",
      protocol: "http",
    });
  });

  it("accepts explicit extra image hosts while rejecting wildcard-only entries", () => {
    expect(buildImageRemotePatterns("https://assets.example.com/path, **, invalid host"))
      .toContainEqual({
        hostname: "assets.example.com",
        protocol: "https",
      });
    expect(buildImageRemotePatterns("**")).not.toContainEqual({
      hostname: "**",
      protocol: "https",
    });
  });
});
