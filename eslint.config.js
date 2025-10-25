import pluginQuery from "@tanstack/eslint-plugin-query";
import pluginRouter from "@tanstack/eslint-plugin-router";
import react from "@eslint-react/eslint-plugin";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import * as reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config({
  ignores: [
    "dist",
    ".wrangler",
    ".vercel",
    ".netlify",
    ".output",
    "build/",
    "./src/components/ui/",
  ],
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    eslintConfigPrettier,
    ...pluginQuery.configs["flat/recommended"],
    ...pluginRouter.configs["flat/recommended"],
    reactHooks.configs.recommended,
    react.configs["recommended-type-checked"],
    // ...you can add plugins or configs here
  ],
  rules: {
    // You can override any rules here
    "react-hooks/react-compiler": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        caughtErrors: "none",
      },
    ],
  },
});
