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
      // react-refresh só afeta velocidade de HMR em dev, não runtime.
      // shadcn/ui e contextos co-exportam variants/hooks por design — a regra
      // gera falso-positivo. Mantida como "off" no lint estrito.
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // Non-null assertion is idiomatic and safe in specific contexts:
      // - Deno.env.get() in Edge Functions (fail-fast on missing secrets)
      // - Canvas/ref access after mount guards
      // - shadcn/ui internal components (upstream code)
      // TypeScript strictNullChecks já protege contra o resto. Manter como "off"
      // evita ruído estilístico sem perda de segurança runtime.
      "@typescript-eslint/no-non-null-assertion": "off",
      "react-hooks/exhaustive-deps": "error",
      // set-state-in-effect: sincronizar estado derivado de prop dentro de
      // useEffect e idioma React valido e nao gera loop nos 48 arquivos
      // afetados (maximo 2 ocorrencias por arquivo). E divida de performance,
      // nao bug. Refatorar tudo antes de adotar o plugin 7.x bloquearia o
      // upgrade sem ganho de negocio. Ver PR #90 e #110.
      "react-hooks/set-state-in-effect": "off",
      // immutability: as 3 ocorrencias (ServiceOrder.tsx) sao falso positivo —
      // os acessos estao dentro de useEffect, que roda apos o render, quando
      // os hooks ja foram inicializados.
      "react-hooks/immutability": "off",
    },
  },
);
