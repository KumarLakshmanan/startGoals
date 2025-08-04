import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: [
      "dist/**",
      "node_modules/**",
      "scripts/node_modules/**",
      "__tests__/**",
      ".backup/**",
      ".docs/**",
      "docs/**",
      "web/**",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
      "no-undef": "error",
      "no-constant-binary-expression": "error"
    },
  },
];
