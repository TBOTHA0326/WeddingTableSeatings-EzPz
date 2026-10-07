import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:3000", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --hostname 127.0.0.1", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
