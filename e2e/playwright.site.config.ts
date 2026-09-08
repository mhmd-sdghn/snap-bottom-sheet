import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * The container-mode suite, kept apart from `playwright.config.ts` because it
 * needs a different server: the built docs site, which carries the React demos
 * and (via `site:build`) the playground under /playground/. Both suites would
 * otherwise have to share one webServer entry and one base URL.
 *
 * SITE_PORT is an escape hatch for a machine where 4174 is already taken.
 */
const port = Number(process.env.SITE_PORT ?? 4174);
const url = `http://localhost:${port}/snap-bottom-sheet/`;

export default defineConfig({
  testDir: "./site-tests",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: url, trace: "retain-on-failure", video: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command:
      "pnpm site:build && pnpm --filter snap-bottom-sheet-docs docs:preview " +
      `--port ${port} --strictPort`,
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url,
    reuseExistingServer: !process.env.CI,
    // `site:build` builds the docs *and* the playground.
    timeout: 240_000,
  },
});
