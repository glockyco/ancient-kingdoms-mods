import prettier from "eslint-config-prettier";
import js from "@eslint/js";
import { includeIgnoreFile } from "@eslint/compat";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import { fileURLToPath } from "node:url";
import ts from "typescript-eslint";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
    rules: {
      // Disable navigation check - resolve() doesn't support query params/hash yet
      // https://github.com/sveltejs/kit/issues/14750
      // Also causes false positives when resolve() is called in functions/variables
      // https://github.com/sveltejs/eslint-plugin-svelte/issues/1314
      "svelte/no-navigation-without-resolve": "off",
    },
  },
  {
    files: ["**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
    },
  },
);
