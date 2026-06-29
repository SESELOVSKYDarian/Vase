import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/vase-app/src"),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
    },
    include: ["tests/**/*.test.ts"],
  },
});
