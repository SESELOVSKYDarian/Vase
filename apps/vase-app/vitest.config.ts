import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vase/auth": path.resolve(__dirname, "../../packages/auth/src/index.ts"),
      "@vase/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts"),
      "@vase/internal-api": path.resolve(__dirname, "../../packages/internal-api/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
    },
    include: ["src/tests/**/*.test.{ts,tsx}"],
  },
});
