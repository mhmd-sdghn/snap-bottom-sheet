import { defineConfig, devices } from "@playwright/test";

// The suite builds the playground itself, at the root base, rather than
// serving whatever `playgrounds/react/dist` happens to hold: `pnpm site:build`
// leaves that dist based at /snap-bottom-sheet/playground/, where the app never
// renders at `/` and every test times out on its first click.
//
// It still needs the library built (`pnpm build`) — the playground resolves
// `snap-bottom-sheet` through its exports to `dist/`.
//
// Note this overwrites `playgrounds/react/dist` with a root-based build. That
// is a build artifact, but re-run `pnpm site:build` before deploying.
//
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
    command:
      "PLAYGROUND_BASE=/ pnpm --filter playground-react build && " +
      `pnpm --filter playground-react preview --port ${port} --strictPort`,
    url,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
