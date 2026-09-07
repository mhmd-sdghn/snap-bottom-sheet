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
    // Per-chunk, not per-build: a string banner would also stamp
    // dist/index.js, marking the framework-agnostic core as a client module.
    banner: (chunk) =>
      chunk.fileName.startsWith("react/") ? '"use client";' : "",
  },
});
