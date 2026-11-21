import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:8098",
    trace: "off",
    launchOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  },
  webServer: {
    command: "npx vite preview --port 8098 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:8098",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
