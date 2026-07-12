import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "error",
      // Non-null assertion is idiomatic and safe in specific contexts:
      // - Deno.env.get() in Edge Functions (fail-fast on missing secrets)
      // - Canvas/ref access after mount guards
      // - shadcn/ui internal components (upstream code)
      // TypeScript strictNullChecks já protege contra o resto. Manter como "off"
      // evita ruído estilístico sem perda de segurança runtime.
      "@typescript-eslint/no-non-null-assertion": "off",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
