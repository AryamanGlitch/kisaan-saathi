import { defineConfig, devices } from "@playwright/test";

/** E2E against the real Next.js dev server. Third-party data (weather, maps, Gemini) is mocked per test. */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000", ...devices["Pixel 5"], trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
