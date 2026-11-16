import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Separate SQLite file so e2e runs never touch dev data (path is relative to prisma/).
export const E2E_DATABASE_URL = "file:./e2e.db";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx prisma migrate deploy && npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    // MAREMA_FAKE_AI returns a canned photo analysis, so e2e runs never call the Anthropic API.
    env: { DATABASE_URL: E2E_DATABASE_URL, MAREMA_FAKE_AI: "1" },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
