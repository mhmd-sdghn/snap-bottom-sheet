import { defineConfig, devices } from "@playwright/test";

// `preview` serves the already-built playground: run
// `pnpm build && pnpm --filter playground-react build` before this suite.
// E2E_PORT is only an escape hatch for a machine where 4173 is already taken.
const port = Number(process.env.E2E_PORT ?? 4173);
const url = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: url },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `pnpm --filter playground-react preview --port ${port} --strictPort`,
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
