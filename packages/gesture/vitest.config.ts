import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts"],
    restoreMocks: true,
    // Stubs are undone before the next test, so no suite has to remember to.
    unstubGlobals: true,
  },
});
