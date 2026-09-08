import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "react/index": "src/react/index.ts" },
  format: ["esm"],
  // `sourcemap: true` alone stamps `//# sourceMappingURL=*.d.ts.map` into the
  // declarations without emitting the maps; this emits them.
  // ponytail: the maps point at ../src, which is not published — go-to-source
  // works in this repo only. Add "src" to `files` if consumers ask for it.
  dts: { sourcemap: true },
  sourcemap: true,
  platform: "browser",
  // `platform: "browser"` makes rolldown fold `process.env.NODE_ENV` to
  // "development", which deletes the `isProd` guard in env.ts and leaves
  // warnOnce shouting in production. This identity define keeps the expression
  // verbatim so the *consumer's* bundler folds it against their own mode.
  // scripts/check-dist.mjs fails the build if it ever disappears again.
  define: { "process.env.NODE_ENV": "process.env.NODE_ENV" },
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
