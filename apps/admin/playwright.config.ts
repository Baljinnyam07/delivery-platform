import { defineConfig, devices } from "@playwright/test";

/**
 * Admin smoke test against the LOCAL stack only (pnpm db:start + seed data).
 * Never point this at production — it creates deliveries and records payments.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  timeout: 90_000,
  // Dev server compiles routes on first visit.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "mn-MN",
    timezoneId: "Asia/Ulaanbaatar",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
