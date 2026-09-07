import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "react/index": "src/react/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  platform: "browser",
  deps: {
    neverBundle: ["react", "react-dom", "react/jsx-runtime"],
    // Private workspace packages — bundle them into the published output
    // instead of emitting imports nobody can resolve from npm.
    alwaysBundle: ["@snap-bottom-sheet/spring", "@snap-bottom-sheet/gesture"],
  },
  clean: true,
  outputOptions: {
    // The core entry has no React dependency, so only the react chunk gets the
    // directive — a `"use client";` on the core chunk would drag every core
    // consumer out of the server graph.
    banner: (chunk) =>
      /react/.test(chunk.name) || /react/.test(chunk.fileName)
        ? '"use client";'
        : "",
  },
});
