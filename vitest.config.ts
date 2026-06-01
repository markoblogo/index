import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@1d3x/auth": path.resolve(__dirname, "packages/auth/src/index.ts"),
      "@1d3x/data": path.resolve(__dirname, "packages/data/src/index.ts"),
      "@1d3x/index-engine": path.resolve(
        __dirname,
        "packages/index-engine/src/index.ts",
      ),
      "@1d3x/integrations": path.resolve(
        __dirname,
        "packages/integrations/src/index.ts",
      ),
      "@1d3x/market-packs": path.resolve(
        __dirname,
        "packages/market-packs/src/index.ts",
      ),
      "@1d3x/ui": path.resolve(__dirname, "packages/ui/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
  },
});
