import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  globalTimeout: 180_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:33163",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // pnpm 12.6 detaches the server's process group on Linux, preventing Playwright cleanup.
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 33163",
    url: "http://127.0.0.1:33163",
    reuseExistingServer: false,
  },
});
