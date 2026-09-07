import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", "react/index": "src/react/index.ts" },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  platform: "browser",
  deps: {
    neverBundle: ["react", "react-dom", "react/jsx-runtime"],
  },
  clean: true,
  outputOptions: { banner: '"use client";' },
});
