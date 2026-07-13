import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs,cjs}",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/integrations/supabase/types.ts",
        "src/components/ui/**",
        "src/test/**",
        "e2e/**",
        "supabase/**",
      ],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 60,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
