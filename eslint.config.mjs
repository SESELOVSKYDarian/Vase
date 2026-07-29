import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "**/.next/**",
    "out/**",
    "**/out/**",
    "build/**",
    "**/build/**",
    "dist/**",
    "**/dist/**",
    "next-env.d.ts",
    "**/next-env.d.ts",
    "**/*.tsbuildinfo",
  ]),
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    files: ["apps/vase-rest/**/*.tsx"],
    rules: {
      // Rest client loaders call async refresh functions from effects. State is
      // updated after I/O, not synchronously in the effect body.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
