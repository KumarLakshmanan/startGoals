import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: [
      "frontend/**",
      "dist/**",
      "node_modules/**",
      "scripts/node_modules/**",
      "__tests__/**",
      ".backup/**",
      ".docs/**",
      "docs/**",
    ],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
]);
